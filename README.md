> **NOTE:** This project is forked from https://github.com/tsl0922/ttyd [release version 1.4.2][21]. The HTML client application has been re-written, added configuration file option, added option to run a single ttyd-express instance which can serve multiple commands configured on different URL endpoints and fixed some issues & added some improvements. Each command can be configured in a JSON configuration file (sample configuration file included) and command parameters could be templated. The template variables should be passed as URL GET query values. If running ttyd-express without configuration file option than the command will be served on webroot. The original ttyd could be replaced with ttyd-express without any changes.


> **CREDITS:** This project is derived from open source [ttyd][20] project hosted on github and all the credits goes to the original author(s) of the project. You can find the source code of their open source projects along with license information in the project repository mentioned above. I acknowledge and are grateful to the developer(s) for their contributions to open source.

# ttyd-express: Share your terminal over the web

ttyd-express is a simple command-line tool for sharing terminal over the web, it has been forked from [ttyd][20]. The original ttyd project is inspired by [GoTTY][1].

![screenshot](https://github.com/santosh0705/ttyd-express/raw/master/screenshot.gif)

# Features

- Built on top of [Libwebsockets][2] with C for speed
- Fully-featured terminal based on [Xterm.js][3] with [CJK][18] and IME support
- Graphical [ZMODEM][16] integration with [lrzsz][17] support
- SSL support based on [OpenSSL][4], (LibreSSL also works)
- Run any custom command with options
- Basic authentication support and many other custom options
- Cross platform: macOS, Linux, FreeBSD/OpenBSD, [OpenWrt][5]/[LEDE][6], Windows

# Installation

## Install on macOS

Not yet tested. Check the original project for details on compiling it yourself.

## Install on Linux

- Build from source (debian/ubuntu):

    ```bash
    sudo apt-get install cmake g++ pkg-config git vim-common libwebsockets-dev libjson-c-dev libssl-dev
    git clone https://github.com/santosh0705/ttyd-express.git
    cd ttyd-express && mkdir build && cd build
    cmake ..
    make && make install
    ```

    You may also need to compile/install [libwebsockets][2] from source if the `libwebsockets-dev` package is outdated.

## Install on Windows

Not yet tested. Check the original project for details on compiling it yourself.

## Install on OpenWrt/LEDE

Not yet tested. Check the original project for details on compiling it yourself.

# Usage

## Command-line Options

```
ttyd-express is a tool for sharing terminal over the web

USAGE:
    ttyd [options] <command> [<arguments...>]

VERSION:
    1.4.2

OPTIONS:
    -f, --conf-file         Configuration file path (eg: /etc/ttyd/config.json)
    -p, --port              Port to listen (default: 7681, use `0` for random port)
    -i, --interface         Network interface to bind (eg: eth0), or UNIX domain socket path (eg: /var/run/ttyd.sock)
    -c, --credential        Credential for Basic Authentication (format: username:password)
    -u, --uid               User id to run with
    -g, --gid               Group id to run with
    -s, --signal            Signal to send to the command when exit it (default: 1, SIGHUP)
    -r, --reconnect         Time to reconnect for the client in seconds (default: 10, disable reconnect: <= 0)
    -R, --readonly          Do not allow clients to write to the TTY
    -t, --client-option     Send option to client (format: key=value), repeat to add more options
    -T, --terminal-type     Terminal type to report, default: xterm-color
    -O, --check-origin      Do not allow websocket connection from different origin
    -m, --max-clients       Maximum clients to support (default: 0, no limit)
    -o, --once              Accept only one client and exit on disconnection
    -B, --browser           Open terminal with the default system browser
    -I, --index             Custom index.html path
    -S, --ssl               Enable SSL
    -C, --ssl-cert          SSL certificate file path
    -K, --ssl-key           SSL key file path
    -A, --ssl-ca            SSL CA file path for client certificate verification
    -d, --debug             Set log level (default: 7)
    -v, --version           Print the version and exit
    -h, --help              Print this text and exit

Visit https://github.com/santosh0705/ttyd-express to get more information and report bugs.
ttyd-express is a fork of ttyd project: https://github.com/tsl0922/ttyd
```

## Example Usage

ttyd-express starts web server at port `7681` by default, you can use the `-p` option to change it, the `command` will be started with `arguments` as options. For example, run:

```bash
ttyd -p 8080 bash -x
```
Then open <http://localhost:8080> with a browser, you will get a bash shell with debug mode enabled.

**More Examples:**

- If you want to login with your system accounts on the web browser, run `ttyd login`.
- You can even run a none shell command like vim, try: `ttyd vim`, the web browser will show you a vim editor.
- Sharing single process with multiple clients: `ttyd tmux new -A -s ttyd vim`, run `tmux new -A -s ttyd` to connect to the tmux session from terminal.

## Browser Support

Modern browsers, See [Browser Support][15].

## SSL how-to

Generate SSL CA and self signed server/client certificates:

```bash
# CA certificate (FQDN must be different from server/client)
openssl genrsa -out ca.key 2048
openssl req -new -x509 -days 365 -key ca.key -subj "/C=CN/ST=GD/L=SZ/O=Acme, Inc./CN=Acme Root CA" -out ca.crt

# server certificate (for multiple domains, change subjectAltName to: DNS:example.com,DNS:www.example.com)
openssl req -newkey rsa:2048 -nodes -keyout server.key -subj "/C=CN/ST=GD/L=SZ/O=Acme, Inc./CN=localhost" -out server.csr
openssl x509 -req -extfile <(printf "subjectAltName=DNS:localhost") -days 365 -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt

# client certificate (the p12/pem format may be useful for some clients)
openssl req -newkey rsa:2048 -nodes -keyout client.key -subj "/C=CN/ST=GD/L=SZ/O=Acme, Inc./CN=client" -out client.csr
openssl x509 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt
openssl pkcs12 -export -clcerts -in client.crt -inkey client.key -out client.p12
openssl pkcs12 -in client.p12 -out client.pem -clcerts
```

Then start ttyd-express:

```bash
ttyd --ssl --ssl-cert server.crt --ssl-key server.key --ssl-ca ca.crt bash
```
You may want to test the client certificate verification with `curl`:

```bash
curl --insecure --cert client.p12[:password] -v https://localhost:7681
```

If you don't want to enable client certificate verification, remove the `--ssl-ca` option.

## Docker and ttyd-express

Docker containers are jailed environments which are more secure, this is useful for protecting the host system, you may use ttyd-express with docker like this:

- Sharing single docker container with multiple clients: `docker run -it --rm -p 7681:7681 santosh0705/ttyd-express`.
- Creating new docker container for each client: `ttyd docker run -it --rm ubuntu`.

# Credits

- [ttyd][20]: ttyd-express is a fork of ttyd with some improvements.
- [GoTTY][1]: ttyd is a port of GoTTY to `C` language with many improvements.
- [Libwebsockets][2]: is used to build the websocket server.
- [Xterm.js][3]: is used to run the terminal emulator on the web, [hterm][8] is used previously.

  [1]: https://github.com/yudai/gotty
  [2]: https://libwebsockets.org
  [3]: https://github.com/xtermjs/xterm.js
  [4]: https://www.openssl.org
  [5]: https://openwrt.org
  [6]: https://www.lede-project.org
  [7]: http://brew.sh
  [8]: https://chromium.googlesource.com/apps/libapps/+/HEAD/hterm
  [9]: https://github.com/tsl0922/ttyd/issues/6
  [10]: http://msys2.github.io
  [11]: https://github.com/mintty/mintty/blob/master/wiki/Tips.md#inputoutput-interaction-with-alien-programs
  [12]: https://github.com/rprichard/winpty
  [13]: https://github.com/tsl0922/ttyd/tree/master/msys2
  [14]: https://github.com/tsl0922/ttyd/tree/master/openwrt
  [15]: https://github.com/xtermjs/xterm.js#browser-support
  [16]: https://en.wikipedia.org/wiki/ZMODEM
  [17]: https://ohse.de/uwe/software/lrzsz.html
  [18]: https://en.wikipedia.org/wiki/CJK_characters
  [19]: https://cmake.org/
  [20]: https://github.com/tsl0922/ttyd
  [21]: https://github.com/tsl0922/ttyd/tree/1.4.2
