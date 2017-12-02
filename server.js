'use strict'
const cluster = require('cluster')
const path = require('path')
console.log(
  'Starting TLS server ' +
    (cluster.worker ? cluster.worker.id : '') +
    ' at ' +
    new Date().toLocaleString(),
)
process.on('exit', () => console.log('Process exit at ' + new Date().toLocaleString()))

const sticky = require('socketio-sticky-session')
const thenifyAll = require('thenify-all')
const pem = thenifyAll(require('pem'))
const app = require('./app')
const config = require('./config.json')
const spdy = require('spdy')
const socketIo = require('socket.io')
const os = require('os')

let port

if (process.getuid && process.getuid() === 0) {
  // if we are root
  port = 443
} else if (!process.getuid) {
  // Windows
  port = 443
} else {
  // we are not root, can only use sockets >1024
  port = 8443
}

;(async () => {
  // For windows, we need to bring our own openssl.
  if (os.platform() === 'win32') {
    process.env.OPENSSL_CONF = path.join(__dirname, 'openssl', 'windows', 'openssl.cnf')
    pem.config({
      pathOpenSSL: 'openssl.exe',
    })
  }
  const keys = await pem.createCertificate({
    days: 1,
    selfSigned: true,
  }) // generate a cert/keypair on the fly

  const credentials = {
    key: keys.serviceKey,
    cert: keys.certificate,
  }

  function getServer() {
    const server = spdy.createServer(credentials, app.callback())
    const io = socketIo.listen(server)

    io.on('connection', socket => {
      // TODO: do stuff with socket
      console.log('Socket ' + socket.id + ' connected.')
    })

    return server
  }

  if (config.cluster) {
    sticky(
      {
        // https://github.com/wzrdtales/socket-io-sticky-session
        num: os.cpus().length, // process count
        proxy: false, // if the layer 4 patching should be used or not, needed if behind a proxy.
      },
      getServer,
    ).listen(port, () => {
      console.log(
        'Cluster worker ' +
          (cluster.worker ? cluster.worker.id : '') +
          ' HTTPS server listening on port ' +
          port,
      )
    })
  } else {
    getServer().listen(port, () => {
      console.log('HTTPS server (no cluster) listening on port ' + port)
    })
  }

  if (process.setgid && process.setuid) {
    // we have opened the sockets, now drop our root privileges
    process.setgid('nobody')
    process.setuid('nobody')
  }

  if (process.setegid && process.seteuid) {
    // Newer node versions allow you to set the effective uid/gid
    process.setegid('nobody')
    process.seteuid('nobody')
  }
})()
