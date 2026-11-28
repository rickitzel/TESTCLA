"""Inicia la aplicación en la dirección local de pruebas y abre el navegador."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--puerto', type=int, default=8765)
    args = parser.parse_args()
    address = ('127.0.0.1', args.puerto)
    handler = partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent))
    try:
        server = ThreadingHTTPServer(address, handler)
    except OSError as error:
        parser.exit(1, f'No se pudo abrir el puerto {args.puerto}: {error}\n')
    with server:
        url = f'http://127.0.0.1:{args.puerto}/'
        print(f'TESTCLAU: {url}\nPulsa Ctrl+C para cerrar el servidor.', flush=True)
        webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
