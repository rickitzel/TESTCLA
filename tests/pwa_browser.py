"""Instalación, lanzamiento independiente y desinstalación en un perfil temporal."""
import os, tempfile, threading
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser import Quiet,root

def normalize_tmp():
    if os.environ.get('TMPDIR'):
        os.environ['TMPDIR']=str(Path(os.environ['TMPDIR']).resolve())

def run():
    normalize_tmp()
    with ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root))) as server,tempfile.TemporaryDirectory() as tmp,sync_playwright() as pw:
        threading.Thread(target=server.serve_forever,daemon=True).start()
        origin=f'http://127.0.0.1:{server.server_port}'
        ctx=pw.chromium.launch_persistent_context(tmp,executable_path=os.environ['CHROMIUM'],args=['--no-sandbox'])
        page=ctx.pages[0];page.goto(origin);page.wait_for_selector('[data-a=setup]')
        page.wait_for_function('!!navigator.serviceWorker.controller')
        cdp=ctx.new_cdp_session(page)
        manifest=cdp.send('Page.getAppManifest');assert not manifest['errors'],manifest
        manifest_id=origin+'/index.html'
        errors=cdp.send('Page.getInstallabilityErrors');assert not errors['installabilityErrors'],errors
        print('Manifest e instalabilidad correctos',flush=True)
        cdp.send('PWA.install',{'manifestId':manifest_id,'installUrlOrBundleUrl':origin+'/'})
        print('Aplicación instalada',flush=True)
        control=ctx.new_page();cdp=ctx.new_cdp_session(control);page.close()
        with ctx.expect_page() as opened:
            cdp.send('PWA.launch',{'manifestId':manifest_id})
        app=opened.value;app.wait_for_selector('[data-a=setup]')
        assert app.evaluate("matchMedia('(display-mode: standalone)').matches")
        print('Ventana instalada en modo standalone',flush=True)
        # La aplicación admite un escritor. Cerramos la pestaña normal antes de usarla.
        app.close();cdp.send('PWA.uninstall',{'manifestId':manifest_id});ctx.close();server.shutdown()

if __name__=='__main__':run()
