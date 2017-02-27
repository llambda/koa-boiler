'use strict';
const cluster = require('cluster');
console.log('Starting TLS server ' + (cluster.worker ? cluster.worker.id : '') + ' at ' + (new Date).toISOString());
process.on('exit', () => console.log('Process exit at ' + (new Date).toISOString()));

const sticky = require('socketio-sticky-session');
const thenifyAll = require('thenify-all');
const pem = thenifyAll(require('pem'));
const app = require('./app');
const config = require('./config.json');
const spdy = require('spdy');
const socketIo = require('socket.io')
const os = require('os');

var port;

if (process.getuid && process.getuid() === 0) { // if we are root
    port = 443;
} else if (!process.getui) { // Windows
    port = 443;
} else { // we are not root, can only use sockets >1024
    port = 8443;
}

(async function() { // same as an async function; allows use of yield to await promises.
    const keys = await pem.createCertificate({
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

    if (process.setgid && process.setuid) {
         // we have opened the sockets, now drop our root privileges
        process.setgid('nobody');
        process.setuid('nobody');
    }

    if (process.setegid && process.seteuid) {
        // Newer node versions allow you to set the effective uid/gid
        process.setegid('nobody');
        process.seteuid('nobody');
    }
})();
