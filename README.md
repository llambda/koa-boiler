# koa-boiler
Koa "boilerplate" for a production ready app, demonstrating the following features:

* Socket.io
* Clustering
* IP pinning via socketio-sticky-session which works with reverse proxies too
* ETags and conditional gets
* Gzip compression
* Signed, cookie-based sessions
* Request logging (morgan)
* Static file serving
* Favicon middleware
* HTTP/2 and SPDY over TLS
* Dropping root privileges after acquiring port
* Routing
* Example async route
* ejs templates
* http://markojs.com/ templates (async and streaming!)
