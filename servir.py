# Servidor local para ver la web sin caché.
#   py -3 servir.py            -> sirve local/ (versión de trabajo)  en http://localhost:4180
#   py -3 servir.py publicar   -> sirve docs/  (versión publicable)   en http://localhost:4181
import http.server, functools, os, sys
class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
publicar = len(sys.argv) > 1 and sys.argv[1].lower().startswith("publi")
carpeta = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs" if publicar else "local")
puerto = 4181 if publicar else 4180
http.server.ThreadingHTTPServer(("127.0.0.1", puerto), functools.partial(SinCache, directory=carpeta)).serve_forever()
