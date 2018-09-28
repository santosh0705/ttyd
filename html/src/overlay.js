/* eslint-env browser */

'use strict'
Object.defineProperty(exports, '__esModule', { value: true })

function showFlash (term, msg, timeout) {
  if (!term.flashNode_) {
    if (!term.element) {
      return
    }
    term.flashOverlayNode_ = document.createElement('div')
    term.flashOverlayNode_.className = 'overlay'
    term.flashOverlayNode_.addEventListener('mousedown', function (e) {
      e.preventDefault()
      e.stopPropagation()
    }, true)
    term.flashNode_ = document.createElement('div')
    term.flashNode_.className = 'flash'
    term.flashOverlayNode_.appendChild(term.flashNode_)
    term.element.appendChild(term.flashOverlayNode_)
  }

  term.flashNode_.textContent = msg
  term.flashOverlayNode_.style.display = 'flex'

  if (term.flashTimeout_) {
    clearTimeout(term.flashTimeout_)
  }

  if (timeout === null) {
    return
  }

  term.flashTimeout_ = setTimeout(function () {
    term.flashOverlayNode_.style.display = 'none'
    term.flashTimeout_ = null
  }, timeout || 1500)
}
exports.showFlash = showFlash

function initModal (term, callbackReConnect) {
  if (!term.modal_) {
    if (!term.element) {
      return
    }

    // Dialog modal
    term.modal_ = {
      overlay: document.createElement('div'),
      dialog: {
        container: document.createElement('div'),
        header: document.createElement('div'),
        info: document.createElement('div'),
        progress_container: document.createElement('div'),
        progress: document.createElement('progress'),
        action: document.createElement('div')
      },
      callbackReConnect: callbackReConnect
    }

    term.modal_.overlay.className = 'overlay modal-overlay'
    term.modal_.overlay.addEventListener('mousedown', function (e) {
      e.preventDefault()
      e.stopPropagation()
    }, true)
    term.modal_.dialog.container.className = 'modal'
    term.modal_.dialog.header.className = 'modal-header'
    term.modal_.dialog.progress_container.className = 'progress-bar'
    term.modal_.dialog.progress.setAttribute('max', '100')
    term.modal_.dialog.action.className = 'modal-action'
    term.modal_.dialog.container.appendChild(term.modal_.dialog.header)
    term.modal_.dialog.container.appendChild(term.modal_.dialog.info)
    term.modal_.dialog.progress_container.appendChild(term.modal_.dialog.progress)
    term.modal_.dialog.container.appendChild(term.modal_.dialog.progress_container)
    term.modal_.dialog.container.appendChild(term.modal_.dialog.action)
    term.modal_.overlay.appendChild(term.modal_.dialog.container)

    term.modal_.overlay.style.display = 'none'
    // Append the overlay node to xterm terminal element
    term.element.appendChild(term.modal_.overlay)
  }
}
exports.initModal = initModal

function hideModal (term) {
  if (!term.modal_) {
    return
  }
  term.modal_.overlay.style.display = 'none'
  term.setOption('disableStdin', false)
  term.focus()
}
exports.hideModal = hideModal

function showMessageDialog (term, msg, err) {
  if (!term.modal_) {
    return
  }
  term.setOption('disableStdin', true)
  term.modal_.dialog.header.textContent = err ? 'Error' : 'Message'
  if (err) {
    term.modal_.dialog.info.className = 'modal-message error'
  } else {
    term.modal_.dialog.info.className = 'modal-message'
  }
  term.modal_.dialog.progress_container.style.display = 'none'
  while (term.modal_.dialog.action.firstChild) {
    term.modal_.dialog.action.removeChild(term.modal_.dialog.action.firstChild)
  }
  var button = document.createElement('input')
  button.setAttribute('type', 'button')
  button.setAttribute('value', 'Reconnect')
  button.addEventListener('click', () => term.modal_.callbackReConnect(), false)
  term.modal_.dialog.action.appendChild(button)
  term.modal_.dialog.info.textContent = msg
  term.modal_.overlay.style.display = 'flex'
}
exports.showMessageDialog = showMessageDialog

function bytesHuman (bytes, precision) {
  if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-'
  if (bytes === 0) return 0
  if (typeof precision === 'undefined') precision = 1
  var units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
  var number = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number]
}
exports.bytesHuman = bytesHuman

function updateFileInfo (term, fileInfo) {
  term.modal_.dialog.progress_container.style.display = 'none'
  term.modal_.dialog.progress.setAttribute('value', '0')
  term.modal_.dialog.info.innerHTML = '<b>Files remaining: </b>' + fileInfo.files_remaining +
                                      '<br><b>Bytes remaining: </b>' + bytesHuman(fileInfo.bytes_remaining, 2) +
                                      '<br><br><b>Filename: </b>' + fileInfo.name
}
exports.updateFileInfo = updateFileInfo

function updateTransferProgress (term, percent) {
  term.modal_.dialog.progress.setAttribute('value', percent)
  term.modal_.dialog.progress_container.style.display = ''
}
exports.updateTransferProgress = updateTransferProgress

function showZmReceiveDialog (term, xfer) {
  if (!term.modal_) {
    return
  }
  term.setOption('disableStdin', true)
  term.modal_.dialog.header.textContent = 'Receiving File'
  term.modal_.dialog.info.className = 'modal-message'
  updateFileInfo(term, xfer.get_details())
  while (term.modal_.dialog.action.firstChild) {
    term.modal_.dialog.action.removeChild(term.modal_.dialog.action.firstChild)
  }
  var element = document.createElement('input')
  element.setAttribute('type', 'button')
  element.setAttribute('value', 'Skip')
  element.addEventListener('click', (e) => {
    (e.target || e.srcElement).disabled = true
    xfer.skip()
  }, false)
  term.modal_.dialog.action.appendChild(element)
  term.modal_.dialog.action.style.display = ''
  term.modal_.overlay.style.display = 'flex'
}
exports.showZmReceiveDialog = showZmReceiveDialog

function showZmSendDialog (term, callback) {
  if (!term.modal_) {
    return
  }
  term.setOption('disableStdin', true)
  term.modal_.dialog.header.textContent = 'Sending File'
  term.modal_.dialog.info.className = 'modal-message'
  term.modal_.dialog.info.innerHTML = '<div>Select file(s)... </div>'
  var fileInput = document.createElement('input')
  fileInput.setAttribute('type', 'file')
  fileInput.setAttribute('multiple', true)
  term.modal_.dialog.info.appendChild(fileInput)

  term.modal_.dialog.progress_container.style.display = 'none'
  while (term.modal_.dialog.action.firstChild) {
    term.modal_.dialog.action.removeChild(term.modal_.dialog.action.firstChild)
  }
  var element = document.createElement('input')
  element.setAttribute('type', 'button')
  element.setAttribute('value', 'Send')
  element.addEventListener('click', (e) => {
    term.modal_.dialog.action.style.display = 'none'
    callback(fileInput.files)
  }, false)
  term.modal_.dialog.action.appendChild(element)
  element = document.createElement('input')
  element.setAttribute('type', 'button')
  element.setAttribute('value', 'Cancel')
  element.addEventListener('click', (e) => {
    term.modal_.dialog.action.style.display = 'none'
    var files = {}
    callback(files)
  }, false)
  term.modal_.dialog.action.appendChild(element)
  term.modal_.dialog.action.style.display = ''
  term.modal_.overlay.style.display = 'flex'
}
exports.showZmSendDialog = showZmSendDialog

function enableFullScreen (term) {
  var fullscreen = {
    request: () => {
      if (term.element.requestFullscreen) {
        term.element.requestFullscreen()
      } else if (term.element.msRequestFullscreen) {
        term.element.msRequestFullscreen()
      } else if (term.element.mozRequestFullScreen) {
        term.element.mozRequestFullScreen()
      } else if (term.element.webkitRequestFullScreen) {
        term.element.webkitRequestFullScreen()
      }
    },

    exit: () => {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen()
      } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen()
      }
    },

    toggle: () => {
      if (fullscreen.isFullScreen()) {
        fullscreen.exit()
      } else {
        fullscreen.request()
      }
    },

    isEnabled: () => Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled || document.msFullscreenEnabled || document.documentElement.webkitRequestFullscreen),

    isFullScreen: () => Boolean(document.fullscreenElement || document.msFullscreenElement || document.mozFullScreen ||
      document.webkitIsFullScreen),

    on: (event, callback) => {
      if (event === 'change') {
        document.addEventListener('fullscreenchange', callback, false)
        document.addEventListener('msfullscreenchange', callback, false)
        document.addEventListener('mozfullscreenchange', callback, false)
        document.addEventListener('webkitfullscreenchange', callback, false)
      }
    }
  }

  if (fullscreen.isEnabled()) {
    if (!term.element) {
      return
    }
    term.fsNode_ = document.createElement('div')
    term.fsNode_.className = 'fs-btn'
    term.fsNode_.addEventListener('mousedown', function (e) {
      e.preventDefault()
      e.stopPropagation()
    }, true)
    term.element.appendChild(term.fsNode_)

    fullscreen.on('change', () => {
      if (fullscreen.isFullScreen()) {
        term.fsNode_.classList.add('flip')
      } else {
        term.fsNode_.classList.remove('flip')
      }
    })
    term.fsNode_.addEventListener('click', e => {
      fullscreen.toggle()
      e.preventDefault()
    }, false)
  }
}
exports.enableFullScreen = enableFullScreen

function apply (terminalConstructor) {
  terminalConstructor.prototype.showFlash = function (msg, timeout) {
    showFlash(this, msg, timeout)
  }
  terminalConstructor.prototype.initModal = function (callbackReConnect) {
    initModal(this, callbackReConnect)
  }
  terminalConstructor.prototype.hideModal = function () {
    hideModal(this)
  }
  terminalConstructor.prototype.showMessageDialog = function (msg, err) {
    showMessageDialog(this, msg, err)
  }
  terminalConstructor.prototype.updateTransferProgress = function (term, percent) {
    updateTransferProgress(term, percent)
  }
  terminalConstructor.prototype.showZmReceiveDialog = function (xfer) {
    showZmReceiveDialog(this, xfer)
  }
  terminalConstructor.prototype.showZmSendDialog = function (callback) {
    showZmSendDialog(this, callback)
  }
  terminalConstructor.prototype.updateFileInfo = function (term, fileInfo) {
    updateFileInfo(term, fileInfo)
  }
  terminalConstructor.prototype.enableFullScreen = function () {
    enableFullScreen(this)
  }
}
exports.apply = apply
