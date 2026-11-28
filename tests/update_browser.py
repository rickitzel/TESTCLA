"""Ejecutar con el ZIP V2 CORE o 2.1; solo usa un perfil y un servidor temporales."""
import argparse, functools, os, shutil, tempfile, threading, time
from http.server import ThreadingHTTPServer
from pathlib import Path
from zipfile import ZipFile
from playwright.sync_api import sync_playwright
from browser import Quiet, root

class UpdateServer(Quiet):
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()

def normalize_tmp():
    if os.environ.get('TMPDIR'):
        os.environ['TMPDIR']=str(Path(os.environ['TMPDIR']).resolve())

def run(previous):
    normalize_tmp()
    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as engine:
        base=Path(tmp);live=base/'live';live.mkdir();old=base/'old';old.mkdir()
        with ZipFile(previous) as z:
            index=next(p for p in z.namelist() if p.endswith('/index.html'))
            prefix=index[:-len('index.html')]
            for name in z.namelist():
                if not name.startswith(prefix) or name.endswith('/'):continue
                rel=Path(name[len(prefix):])
                if rel.is_absolute() or '..' in rel.parts:raise ValueError('ruta de ZIP inválida')
                if rel.parts[0] in ['tests','docs']:continue
                dest=old/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(name))
        shutil.copytree(old,live,dirs_exist_ok=True)
        with ThreadingHTTPServer(('127.0.0.1',0),functools.partial(UpdateServer,directory=str(live))) as server:
            threading.Thread(target=server.serve_forever,daemon=True).start()
            url=f'http://127.0.0.1:{server.server_port}/'
            browser=engine.chromium.launch(executable_path=os.environ['CHROMIUM'],downloads_path=os.environ.get('TMPDIR',tmp),args=['--no-sandbox'])
            ctx=browser.new_context(accept_downloads=True);p=ctx.new_page();p.goto(url);p.wait_for_selector('[data-a=setup]');p.wait_for_function('!!navigator.serviceWorker.controller')
            title=p.title();p.locator('#file').set_input_files(root/'tests/fixtures/10.json');p.wait_for_function('S.qs.length===10')
            initial=p.evaluate('S.qs.map(q=>q.id).sort()');oldcore=p.evaluate("typeof studyCopy==='undefined'")
            if not oldcore:
                p.evaluate("startRun({mode:'learn',n:3,learn:true})")
                p.locator('[data-a=pick]').first.click();p.locator('[data-a=next]').wait_for()
            shutil.copytree(root,live,dirs_exist_ok=True,ignore=shutil.ignore_patterns('tests','docs'))
            p.evaluate('(async()=>{const reg=await navigator.serviceWorker.ready;await reg.update()})()')
            for attempt in range(120):
                if p.evaluate('(async()=>!!(await navigator.serviceWorker.ready).waiting)()'):break
                time.sleep(.15)
            assert p.evaluate('(async()=>!!(await navigator.serviceWorker.ready).waiting)()'), 'No se instaló el worker nuevo'
            p.evaluate("""async()=>{const r=await navigator.serviceWorker.ready;const activated=new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));r.waiting.postMessage('ACTIVAR_TESTCLAU');await activated}""")
            p.reload();p.wait_for_selector('[data-a=setup]');assert p.evaluate("typeof A.installApp==='function'"),p.locator('body').inner_text()[:300]
            assert p.evaluate('S.qs.map(q=>q.id).sort()')==initial
            if oldcore:
                p.locator('nav [data-t=more]').click()
                p.locator('[data-a=migrate]').click();link=p.locator('a[download="testclau-antes-de-actualizar.json"]');link.wait_for()
                with p.expect_download() as dl:link.click()
                if dl.value.failure() is not None:
                    print('Se reintenta con la descarga alternativa del navegador.',flush=True)
                    p.locator('[data-a=alternativeDownload]').click()
                    with p.expect_download() as dl:p.locator('#alternateBackup').click()
                assert dl.value.failure() is None;dl.value.save_as(base/'antes.json')
                p.locator('#verifyMigration').set_input_files(base/'antes.json')
                p.wait_for_function('S.qs.every(q=>q.optionIds?.length===4)')
            else:
                p.locator('[data-a=resume]').click();p.locator('[data-a=next]').wait_for()
                assert p.evaluate('S.prof.answered===1&&S.run.locked')
            p.reload();p.wait_for_selector('[data-a=setup]');assert p.evaluate('valid().length')==10
            # Cerrar todos los clientes antiguos permite activar también el worker 2.1.
            shutil.copytree(old,live,dirs_exist_ok=True)
            p.evaluate('(async()=>{const reg=await navigator.serviceWorker.ready;await reg.update()})()')
            p.close()
            for attempt in range(12):
                p=ctx.new_page();p.goto(url);p.wait_for_selector('[data-a=setup]')
                if p.evaluate("typeof A.installApp==='undefined'"):break
                p.close();time.sleep(.3)
            assert p.title()==title and p.evaluate("typeof A.installApp==='undefined'")
            assert p.evaluate('S.qs.map(q=>q.id).sort()')==initial
            if not oldcore:assert p.evaluate('S.prof.answered===1')
            print(previous.name,'→ 2.2 → versión anterior. Mismo origen e identidades conservadas.',flush=True)
            browser.close();server.shutdown()
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('previous',type=Path);run(parser.parse_args().previous)
