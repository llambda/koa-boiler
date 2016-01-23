'use strict';
console.log('Starting TLS server at ' + (new Date).toISOString());
process.on('exit', function() {
    console.log('Process exit at ' + (new Date).toISOString());
});

const Promise = require('bluebird');
const sticky = require('socketio-sticky-session');
const cluster = require('cluster');
const pem = Promise.promisifyAll(require('pem'));
const app = require('./app');
const config = require('./config.json');
const spdy = require('spdy');
const socketIo = require('socket.io')
const os = require('os');

if (process.getuid() === 0) { // if we are root
    var port = 443;
} else { // we are not root, can only use sockets >1024
    var port = 8443;
}

Promise.coroutine(function*() { // same as an async function; allows use of yield to await promises.
    const keys = yield pem.createCertificateAsync({
        days: 1,
        selfSigned: true
    }); // generate a cert/keypair on the fly

    const credentials = {
        key: keys.serviceKey,
        cert: keys.certificate
    };

    function getServer() {
        const server = spdy.createServer(credentials, app.callback());
        const io = socketIo.listen(server);

        io.on('connection', function(socket) {
            // TODO: do stuff with socket
        })

        return server;
    }

    if (config.cluster) {
        sticky({
            // https://github.com/wzrdtales/socket-io-sticky-session
            num: os.cpus(), // process count
            proxy: false, // if the layer 4 patching should be used or not, needed if behind a proxy.
        }, getServer).listen(port, function() {
            console.log('Cluster worker ' + (cluster.worker ? cluster.worker.id : '') + ' HTTPS server listening on port ' + port);
        });
    } else {
        getServer().listen(port, function() {
            console.log('HTTPS server (no cluster) listening on port ' + port);
        });
    }

    if (process.getuid() === 0) { // if we are root
        // we have opened the sockets, now drop our root privileges
        process.setgid('nobody');
        process.setuid('nobody');
        // Newer node versions allow you to set the effective uid/gid
        if (process.setegid) {
            process.setegid('nobody');
            process.seteuid('nobody');
        }
    }
})();
