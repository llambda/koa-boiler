# koaboiler
Koa "boilerplate" for a production ready app, demonstrating the following features:

* Socket.io
* Clustering
* IP pinning via socketio-sticky-session, optionally compatible with reverse proxies
* Etags and conditional gets
* Gzip compression
* Cookie based sessions
* Request logging (morgan)
* Static file serving
* Favicon middleware
* HTTP/2 and SPDY over TLS
* Dropping root privileges after acquiring port
* Routing
* Example async route
