"""Verifica móvil emulado, manifiesto y ambos modelos con el servidor desconectado."""
import os,threading
from functools import partial
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from browser import Quiet,root,pdf

from pathlib import Path
def normalize_tmp():
    if os.environ.get('TMPDIR'):
        os.environ['TMPDIR']=str(Path(os.environ['TMPDIR']).resolve())

def run():
    normalize_tmp()
    with ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root))) as server,sync_playwright() as pw:
        threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
        b=pw.chromium.launch(executable_path=os.environ['CHROMIUM'],args=['--no-sandbox'])
        ctx=b.new_context(is_mobile=True,has_touch=True,viewport={'width':390,'height':844})
        page=ctx.new_page();page.goto(url);page.wait_for_selector('[data-a=setup]');page.wait_for_function('!!navigator.serviceWorker.controller')
        cdp=ctx.new_cdp_session(page)
        manifest=cdp.send('Page.getAppManifest');assert not manifest['errors']
        assert not cdp.send('Page.getInstallabilityErrors')['installabilityErrors']
        print('Manifiesto, iconos e instalabilidad de Chrome comprobados.')
        server.shutdown();server.server_close();ctx.set_offline(True);page.reload()
        for lang,question,options in [
            ('spa','La señal indica presión y ángulo',['Avión','Señal','Hélice','Válvula']),
            ('eng','Which control is marked in blue',['Throttle','Rudder','Handle','Panel']),
            ('spa+eng','Señal de presión Engine pressure',['Motor','Pressure','Válvula','Cylinder'])]:
            page.locator('nav [data-t=more]').click();page.select_option('#ocrLanguage',lang);page.wait_for_function('!actionBusy')
            page.locator('nav [data-t=lib]').click()
            lines=['TESTCLAU V1','TOTAL_PREGUNTAS: 1','1. '+question,*[f'{a}) {o}' for a,o in zip('ABCD',options)],'INICIO_RESPUESTAS','1=B','FIN_RESPUESTAS']
            page.locator('#file').set_input_files(dict(name=lang+'.pdf',mimeType='application/pdf',buffer=pdf(lines,True)))
            page.locator('[data-a=keepAll]').click(timeout=90000);page.wait_for_function('activeImport===null')
            row=page.evaluate("()=>{const v=S.vers.slice().sort((a,b)=>b.processed-a.processed)[0];return S.qs.find(q=>q.vid===v.id)}")
            assert row['q']==question and row['opts']==options and row['state']=='needs_review',(lang,row)
            print(lang,'texto y cuatro opciones exactos en PDF escaneado, pendiente de revisión.')
        for width,height in [(320,640),(390,844),(844,390),(768,1024)]:
            page.set_viewport_size({'width':width,'height':height})
            for tab in ['home','lib','rev','stats','more']:
                page.locator('nav [data-t="'+tab+'"]').click()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,tab)
                assert page.locator('h1').first.is_visible()
            print(width,'×',height,'cinco pantallas sin desbordamiento horizontal.')
        page.locator('[data-a=installApp]').click();assert page.locator('.modal').is_visible()
        b.close()

if __name__=='__main__':run()
