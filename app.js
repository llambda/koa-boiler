'use strict';
const cluster = require('cluster');

const adapt = require('koa-adapter'); // adapt pre Koa 2.0 middle ware to be compatible with Koa 2.0.
const helmet = require('koa-helmet');

const promiseDelay = require('promise-delay');

const Koa = require('koa');
const app = module.exports = new Koa();

const html = require('html-template-tag');
const { StyleSheet, css } = require('aphrodite');

app.use(require('koa-response-time')());
app.use(require('koa-favicon')(require.resolve('./public/favicon.ico')));
app.use(require('koa-conditional-get')());
app.use(require('koa-etag')());
app.use(require('koa-morgan')('combined'));

app.use(require('koa-compress')({
    flush: require('zlib').Z_SYNC_FLUSH
}));
app.keys = ['some secret hurr'];

app.use(adapt(require('koa-session')({
    maxAge: 24 * 60 * 60 * 1000 // One Day
}, app)));

app.use(require('koa-bodyparser')({
    // BodyParser options here
}));

class NullOrUndefinedError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        this.message = message;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = (new Error(message)).stack;
        }
        if (!this.message) {
            this.message = 'Null or undefined error';
        }
    }
};

(function () {
    // Example error handler to JSON stringify errors

    let errorCount = 0; // closure to keep this variable private

    app.use(async (ctx, next) => {
        try {
            await next();
        } catch (err) {
            if (err == null) {
                err = new NullOrUndefinedError();
            }
            // some errors will have .status
            // however this is not a guarantee
            ctx.status = err.status || 500;
            ctx.type = 'application/json';
            ctx.body = JSON.stringify({
                errors: [{
                    id: errorCount++,
                    status: ctx.status,
                    title: err.message,
                    detail: err.stack
                }]
            })

            // since we handled this manually we'll
            // want to delegate to the regular app
            // level error handling as well so that
            // centralized still functions correctly.
            ctx.app.emit('error', err, this);
        }
    })
})();

const router = require('koa-router')();

router.get('/', (ctx, next) => {
    ctx.status = 200;
    const workerId = (cluster.worker ? cluster.worker.id : '');
    const script = '<script>alert("hi")</script>';
    ctx.body = html`<!DOCTYPE html>
<html>
<head>
    <title>Hello from worker ${workerId}!</title>
</head>

<body>
    <script src='aphrodite.umd.js'></script>
    <script src='styles.js'></script>
    <p>Hello ${ctx.ip} from worker ${workerId}!
    <script>        
    document.currentScript.parentElement.className = aphrodite.css(Styles.hover);
    </script>
    </p>
    <p>If using Chrome, you can set <a href="chrome://flags/#allow-insecure-localhost">chrome://flags/#allow-insecure-localhost</a></p>
    <div>Node versions:
    <pre>${JSON.stringify(process.versions, null, 4)}</pre>
    </div>   
    ${script}
    <div>
        <a href="/api/example">3 second async delayed load example</a><br>
        <a href="/api/error">Example showing error throwing</a><br>
        <a href="/api/nullerror">Example showing null error throwing</a><br>
        <a href="/myip">ejs rendering</a><br>
        <a href="/marko">marko async rendering</a><br>
        <a href="/myipes6">es6 template string rendering</a><br>
    </div>     
</body>
</html>`;
});

router.get('/api/example', async (ctx, next) => {
    await promiseDelay(3000);
    ctx.response.body = "Simple Async 3-second Delayed Example!";
});

router.get('/api/error', (ctx, next) => {
    // Example showing error throwing
    throw new Error('Hurr durr!');
});

router.get('/api/nullerror', (ctx, next) => {
    // Example showing error throwing
    throw null;
});

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

// ejs render
router.get('/myip', async (ctx, next) => {
    ctx.state.ip = ctx.ip;
    await ctx.render('myip');
});

// marko render
// http://psteeleidem.com/marko-versus-dust/
const marko = require('marko');

(() => {
    const ipMarkoTemplate = marko.load(require.resolve('./view/ip.marko.html'), { writeToDisk: false });

    router.get('/marko', (ctx, next) => {
        let ip = ctx.ip;

        let data = {
            ip: ip,
            ip2: async function () {
                await promiseDelay(3000);
                return '3 seconds';
            },
            ip3: async function () {
                await promiseDelay(5000);
                return '5 seconds';
            }
        };

        // When body is a stream, Koa automatically streams it to the client.
        ctx.body = ipMarkoTemplate.stream(data);
        ctx.type = 'text/html; charset=utf-8';
    });
})();

// ES6 template
router.get('/myipes6', async (ctx, next) => {
    ctx.state.ip = ctx.ip;
    ctx.body = html`<!DOCTYPE html>
<html>

<head>
    <title>Hello ${ctx.ip}!</title>
</head>

<body>
    <p>Hello ${ctx.ip}!</p>
</body>

</html>`;
});



app.use(router.routes());
app.use(router.allowedMethods());
app.use(require('koa-static')('public'));
