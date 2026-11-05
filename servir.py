# Servidor local para ver la web sin caché: py -3 servir.py  (http://localhost:4180)
import http.server, functools, os
class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
docs = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")
http.server.ThreadingHTTPServer(("127.0.0.1", 4180), functools.partial(SinCache, directory=docs)).serve_forever()
