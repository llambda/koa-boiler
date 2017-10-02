# koa-boiler
Koa "boilerplate" for a production ready app, demonstrating the following features:

* [Socket.io](http://socket.io/)
* IP pinning, via [socketio-sticky-session](https://github.com/wzrdtales/socket-io-sticky-session) (supports reverse proxies)
* Multi-process clustering
* ETags and conditional get
* Gzip compression
* Signed, cookie-based sessions
* Request logging (morgan)
* Static file serving
* Favicon middleware
* HTTP/2 (with TLS and on-the-fly certificate generation)
* Drop root privileges after acquiring port
* Routing
* Example async route
* [ejs](https://github.com/koajs/ejs) template example
* [Marko](http://markojs.com/) template example (featuring async and streaming support)
* [html-template-tag](https://github.com/AntonioVdlC/html-template-tag) ES6 Tagged Template example, for compiling HTML template strings.
* [Aphrodite](https://github.com/Khan/aphrodite) support for colocating your styles with your JavaScript component. Note: [Styletron](https://github.com/rtsao/styletron) is probably a better choice, I just haven't had time to add it here yet
* ~~Both old Koa 1.0 and new 2.0 style middleware. [koa-adapter](https://github.com/th507/koa-adapter) / [koa-adapter-bluebird](https://www.npmjs.com/package/koa-adapter-bluebird) to convert old 1.0 middleware to 2.0.~~ Adapter no longer needed. All middleware is Koa 2.0 compatible.
