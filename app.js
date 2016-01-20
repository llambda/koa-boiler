'use strict';
const adapt = require('koa-adapter'); // adapt pre Koa 2.0 middle ware to be compatible with Koa 2.0.
const Promise = require('bluebird');
const Koa = require('koa');
const app = module.exports = new Koa();
const session = require('koa-session');
const compress = require('koa-compress')();
const helmet = require('koa-helmet');
const favicon = require('koa-favicon');
const conditional = require('koa-conditional-get');
const etag = require('koa-etag');
const morgan = require('koa-morgan')();
const bodyParser = require('koa-bodyparser')();
const serveStatic = require('koa-serve-static')('public');

app.use(adapt(favicon(__dirname + '/public/favicon.ico')));
app.use(adapt(require('koa-response-time')()));
app.use(adapt(conditional()));
app.use(adapt(etag()));
app.use(morgan);

app.use(adapt(compress));
app.keys = '123';

app.use(adapt(session({
	maxAge: 9999999999000
}, app)));

app.use(adapt(bodyParser));

// Example error handler to JSON stringify errors
app.use(adapt(function *(next){
  try {
    yield next;
  } catch (err) {
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

router.get('/', function *(next) {
	this.status = 200;
	this.body = 'Hello world!';
})

router.get('/api/example', function *(next) {
	this.response.body = yield Promise.delay(3000).then(function () {
		return "Simple Async 3-second Delayed Example!";
	})
})

app.use(adapt(router.routes()));
app.use(adapt(router.allowedMethods()));
app.use(adapt(serveStatic));
