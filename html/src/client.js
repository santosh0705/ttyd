/* eslint-env browser */

'use strict'

require('./style.scss')

// polyfills for ie11
require('core-js/fn/array')
require('core-js/fn/object')
require('core-js/fn/promise')
require('core-js/fn/typed')
require('fast-text-encoding')

var Zmodem = require('zmodem.js/src/zmodem_browser')
var Terminal = require('xterm').Terminal

Terminal.applyAddon(require('xterm/lib/addons/fit/fit'))
Terminal.applyAddon(require('xterm/lib/addons/winptyCompat/winptyCompat'))
Terminal.applyAddon(require('./overlay'))

var textDecoder = new TextDecoder()
var textEncoder = new TextEncoder()
/* eslint-disable-next-line */
var authToken = (typeof tty_auth_token !== 'undefined') ? tty_auth_token : null
var autoReconnect = -1
var reconnectTimer, title

var term = new Terminal()
var socketPath = ''
var service = ''

function init () {
  // Attach 'Shift + Ctrl + C' key event handler
  term.attachCustomKeyEventHandler(e => {
    if (e.shiftKey && e.ctrlKey && e.keyCode === 67) {
      e.preventDefault()
      document.execCommand('copy')
      return false
    }
    return true
  })

  var terminalContainer = document.createElement('div')
  terminalContainer.className = 'terminal-container'
  document.body.appendChild(terminalContainer)

  term.open(terminalContainer)
  term.winptyCompatInit()
  term.fit()
  term.enableFullScreen()
  term.initModal(connect)
  connect()
}

function updateProgress (xfer, callback) {
  var size = xfer.get_details().size
  var offset = xfer.get_offset()
  var percentReceived = (100 * offset / size).toFixed(2)
  callback(term, percentReceived)
  // term.modalZmReceiveProgressNode_.setAttribute('value', percentReceived)
  // term.modalZmReceiveProgressNode_.style.display = ''
}

function handleSend (zsession) {
  return new Promise(function (resolve) {
    term.showZmSendDialog(function (files) {
      Zmodem.Browser.send_files(
        zsession,
        files,
        {
          on_progress: function (obj, xfer) {
            term.updateFileInfo(term, xfer.get_details())
            updateProgress(xfer, term.updateTransferProgress)
          },
          on_file_complete: function (obj) {
            // console.log(obj)
          }
        }
      ).then(
        zsession.close.bind(zsession),
        console.error.bind(console)
      ).then(function () {
        resolve()
      })
    })
  })
}

function handleReceive (zsession) {
  zsession.on('offer', function (xfer) {
    term.showZmReceiveDialog(xfer)
    var fileBuffer = []
    xfer.on('input', function (payload) {
      updateProgress(xfer, term.updateTransferProgress)
      fileBuffer.push(new Uint8Array(payload))
    })
    xfer.accept().then(function () {
      Zmodem.Browser.save_to_disk(
        fileBuffer,
        xfer.get_details().name
      )
    }, console.error.bind(console))
  })
  var promise = new Promise(function (resolve) {
    zsession.on('session_end', function () {
      resolve()
    })
  })
  zsession.start()
  return promise
}

function connect () {
  clearTimeout(reconnectTimer)
  if (socketPath === '' || service === '') {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', document.location.pathname + '?q=config', true)
    xhr.onload = e => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText)
            socketPath = data.socketPath
            service = data.service
            startTerminal()
          } catch (e) {
            term.showMessageDialog('Error parsing server response', true)
          }
        } else {
          term.showMessageDialog('Error from server: ' + xhr.statusText, true)
        }
      }
    }
    xhr.onerror = e => term.showMessageDialog('Error from server: ' + xhr.statusText, true)
    xhr.send()
  } else {
    startTerminal()
  }
}

function startTerminal () {
  term.hideModal()
  var wsError = false
  var serviceRoot = document.location.pathname.replace(/[^/]+$/g, '')
  var httpsEnabled = window.location.protocol === 'https:'
  var url = (httpsEnabled ? 'wss://' : 'ws://') + window.location.host + serviceRoot + socketPath + document.location.search
  term.showFlash('Connecting...', null)
  var ws = new WebSocket(url, ['tty'])

  function sendMessage (message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(textEncoder.encode(message))
    }
  }

  function sendData (data) {
    sendMessage('0' + data)
  }

  function resizeWindow () {
    // https://stackoverflow.com/a/27923937/1727928
    clearTimeout(window.resizedFinished)
    window.resizedFinished = setTimeout(function () {
      term.fit()
    }, 250)
  }

  function unloadHandler (e) {
    e.returnValue = 'Are you sure?'
    return e.returnValue
  }

  function disconnect (reason) {
    term.off()
    window.removeEventListener('resize', resizeWindow, false)
    window.removeEventListener('beforeunload', unloadHandler, false)
    reason = reason || 'Disconnected'
    if (wsError) {
      term.showMessageDialog(reason, true)
    } else {
      term.showMessageDialog(reason)
    }
    if (ws.readyState !== WebSocket.CLOSED) {
      ws.close()
    }
    if (autoReconnect > 0) {
      reconnectTimer = setTimeout(connect, autoReconnect * 1000)
    }
  }

  function resetTerm () {
    // disconnect('Terminal reset')
    // connect()
  }

  var zsentry = new Zmodem.Sentry({
    /* eslint-disable-next-line */
    to_terminal: function _to_terminal (octets) {
      var buffer = new Uint8Array(octets).buffer
      term.write(textDecoder.decode(buffer))
    },

    /* eslint-disable-next-line */
    sender: function _ws_sender_func (octets) {
      // limit max packet size to 4096
      while (octets.length) {
        var chunk = octets.splice(0, 4095)
        var buffer = new Uint8Array(chunk.length + 1)
        buffer[0] = '0'.charCodeAt(0)
        buffer.set(chunk, 1)
        ws.send(buffer)
      }
    },

    /* eslint-disable-next-line */
    on_retract: function _on_retract () {
      // console.log('on_retract')
    },

    /* eslint-disable-next-line */
    on_detect: function _on_detect (detection) {
      term.setOption('disableStdin', true)
      var zsession = detection.confirm()
      var promise = zsession.type === 'send' ? handleSend(zsession) : handleReceive(zsession)
      promise.catch(console.error.bind(console)).then(function () {
        term.hideModal()
      })
    }
  })

  ws.binaryType = 'arraybuffer'

  ws.onopen = function (event) {
    term.showFlash('Connected', 500)
    term.fit()
    sendMessage('1' + JSON.stringify({ columns: term.cols, rows: term.rows }))
    sendMessage(JSON.stringify({ AuthToken: authToken, ServicePath: service }))
    window.addEventListener('resize', resizeWindow, false)
    window.addEventListener('beforeunload', unloadHandler, false)
    term.focus()
  }

  ws.onmessage = function (event) {
    var rawData = new Uint8Array(event.data)
    var cmd = String.fromCharCode(rawData[0])
    var data = rawData.slice(1).buffer
    switch (cmd) {
      case '0':
        try {
          zsentry.consume(data)
        } catch (e) {
          console.error(e)
          resetTerm()
        }
        break
      case '1':
        title = textDecoder.decode(data)
        document.title = title
        break
      case '2':
        var preferences = JSON.parse(textDecoder.decode(data))
        Object.keys(preferences).forEach(function (key) {
          console.log('Setting ' + key + ': ' + preferences[key])
          term.setOption(key, preferences[key])
        })
        break
      case '3':
        autoReconnect = JSON.parse(textDecoder.decode(data))
        if (autoReconnect <= 0) {
          console.log('Reconnect: disabled')
        } else {
          console.log('Enabling reconnect: ' + autoReconnect + ' seconds')
        }
        break
      default:
        console.log('Unknown command: ' + cmd)
        break
    }
  }

  ws.onclose = function (event) {
    console.log('Websocket connection closed with code: ' + event.code)
    // show disconnection message
    // 1000: CLOSE_NORMAL
    if (event.code === 1000) {
      disconnect('Closed')
    } else {
      wsError = true
      disconnect('Connection closed abnormally')
    }
  }

  // xterm events
  term.on('data', sendData)
  term.on('resize', size => {
    sendMessage('1' + JSON.stringify({ columns: size.cols, rows: size.rows }))
    term.showFlash(size.cols + 'x' + size.rows, 500)
  })
  term.on('title', data => { document.title = data + ' | ' + title })
}

if (document.readyState === 'complete' || document.readyState !== 'loading') {
  init()
} else {
  document.addEventListener('DOMContentLoaded', () => {
    init()
  })
}
