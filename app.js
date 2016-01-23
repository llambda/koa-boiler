'use strict';
const Promise = require('bluebird');
const cluster = require('cluster');

// middleware
const serveStatic = require('koa-serve-static')('public');
const conditional = require('koa-conditional-get');
const bodyParser = require('koa-bodyparser')();
const Compress = require('koa-compress');
const Morgan = require('koa-morgan');
const favicon = require('koa-favicon');
const session = require('koa-session');
// const adapt = require('koa-adapter'); // adapt pre Koa 2.0 middle ware to be compatible with Koa 2.0.
const adapt = require('koa-adapter-bluebird'); // uses bluebird-co for performance
const helmet = require('koa-helmet');
const etag = require('koa-etag');

const Koa = require('koa');

const app = module.exports = new Koa();

const logger = Morgan('combined');

app.use(adapt(favicon(require.resolve('./public/favicon.ico'))));
app.use(adapt(require('koa-response-time')()));
app.use(adapt(conditional()));
app.use(adapt(etag()));
app.use(logger);

app.use(adapt(Compress({
    flush: require('zlib').Z_SYNC_FLUSH
})));
app.keys = ['some secret hurr'];

app.use(adapt(session({
    maxAge: 24 * 60 * 60 * 1000 // One Day
}, app)));

app.use(adapt(bodyParser));

// Example error handler to JSON stringify errors
app.use(adapt(function*(next) {
    try {
        yield next;
    } catch (err) {
        if (err == null) {
            err = {};
        }
        // some errors will have .status
        // however this is not a guarantee
        this.status = err.status || 500;
        this.type = 'application/json';
        this.body = JSON.stringify({
            success: false,
            message: err.stack
        })

        // since we handled this manually we'll
        // want to delegate to the regular app
        // level error handling as well so that
        // centralized still functions correctly.
        this.app.emit('error', err, this);
    }
}));

const router = require('koa-router')();

router.get('/', function*(next) {
    this.status = 200;
    this.body = 'Hello world from worker ' + (cluster.worker ? cluster.worker.id : '') + '!';
})

router.get('/api/example', function*(next) {
    yield Promise.delay(3000);

    this.response.body = "Simple Async 3-second Delayed Example!";
})

router.get('/api/error', function*(next) {

    // Example showing error throwing
    throw new Error('Hurr durr!');
})


// ejs example
const render = require('koa-ejs');
const path = require('path');

render(app, {
  root: path.join(__dirname, 'view'),
  layout: 'template',
  viewExt: 'html',
  cache: false,
  debug: true
});


router.get('/myip', function*(next) {
    this.state.ip = this.ip;
    yield this.render('myip');
});

// marko example
// http://psteeleidem.com/marko-versus-dust/

const marko = require('marko');

router.get('/marko', function *() {
    let ip = this.ip;

    let data = {
        ip: ip,
        ip2: Promise.coroutine(function *() {
            yield Promise.delay(3000);
            return '3 seconds';
        })(),
        ip3: Promise.coroutine(function *() {
            yield Promise.delay(5000);
            return '5 seconds';
        })(),
    };

    this.body = marko.load(require.resolve('./view/ip.marko.html')).stream(data);
    this.type = 'text/html';
});


app.use(adapt(router.routes()));
app.use(adapt(router.allowedMethods()));
app.use(adapt(serveStatic));
