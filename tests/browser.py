"""Run with Chromium, Playwright Python, Pillow and ReportLab installed."""
import contextlib, io, json, os, tempfile, time, threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from playwright.sync_api import sync_playwright
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
def exam(count,label):
    rows=[];lines=['TESTCLAU V1','TOTAL_PREGUNTAS: '+str(count)]
    letters='ABCD';opts=['Alfa','Beta','Gamma','Delta']
    for i in range(count):
        title=f'{label} pregunta numero {i+1}'
        rows.append(dict(id=i+1,pregunta=title,opciones=dict(zip(letters,opts)),correcta=letters[i%4],tema='Practica'))
        lines.extend([f'{i+1}. {title}',*[f'{a}) {o}' for a,o in zip(letters,opts)]])
    lines+=['INICIO_RESPUESTAS',*[f'{i+1}={letters[i%4]}' for i in range(count)],'FIN_RESPUESTAS']
    return dict(formato='TESTCLAU',version=1,total_preguntas=count,preguntas=rows),lines
def pdf(lines,scan=False):
    b=io.BytesIO();c=canvas.Canvas(b,pagesize=(612,792))
    for offset in range(0,len(lines),50):
        section=lines[offset:offset+50]
        if scan:
            im=Image.new('RGB',(1224,1584),'white');draw=ImageDraw.Draw(im)
            font=ImageFont.truetype('DejaVuSans.ttf',24)
            for i,l in enumerate(section):draw.text((50,44+29*i),l,fill='black',font=font)
            c.drawImage(ImageReader(im),0,0,612,792)
        else:
            text=c.beginText(36,758);text.setFont('Helvetica',11)
            for l in section:text.textLine(l)
            c.drawText(text)
        c.showPage()
    c.save();return b.getvalue()
def normalize_tmp():
    if os.environ.get('TMPDIR'):
        os.environ['TMPDIR']=str(Path(os.environ['TMPDIR']).resolve())

def run():
    normalize_tmp()
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}'
    with tempfile.TemporaryDirectory() as tmp,sync_playwright() as w:
        browser=w.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),downloads_path=os.environ.get('TMPDIR',tmp),args=['--no-sandbox','--enable-precise-memory-info'])
        ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
        page=ctx.new_page();errors=[];external=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda r:external.append(r.url) if r.url.startswith('http') and not r.url.startswith(url) else None)
        page.goto(url);page.wait_for_selector('[data-a=setup]')
        print('Chromium',browser.version,'390 x 844')
        page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('!!navigator.serviceWorker.controller')
        server.shutdown();server.server_close();ctx.set_offline(True);page.reload();page.wait_for_selector('[data-a=setup]')
        def count():return page.evaluate('S.qs.length')
        def upload(name,body,mime='text/plain'):
            page.locator('#file').set_input_files(dict(name=name,mimeType=mime,buffer=body))
            page.wait_for_function('activeImport===null || !!previewDecision',timeout=120000)
        def action(name):
            page.wait_for_function('!actionBusy || !!previewDecision');page.locator(f'[data-a="{name}"]').first.click()
        def tab(name):
            page.wait_for_function('!actionBusy');page.locator(f'nav [data-t="{name}"]').click()
        tab('lib')
        for n in [10,50,80,100,200]:
            data,lines=exam(n,'Banco '+str(n));expected=[[q['pregunta'],list(q['opciones'].values()),'ABCD'.index(q['correcta'])] for q in data['preguntas']]
            for ext,body in [('txt','\n'.join(lines).encode()),('pdf',pdf(lines)),('json',json.dumps(data).encode())]:
                before=count();upload('Banco.'+ext,body)
                if page.evaluate('!!previewDecision'):action('keepAll')
                page.wait_for_function('activeImport===null')
                assert count()==before+n,(ext,n,page.locator('.toast').all_text_contents())
                latest=page.evaluate("""()=>{let v=S.vers.sort((a,b)=>b.processed-a.processed)[0];return S.qs.filter(q=>q.vid===v.id).sort((a,b)=>a.sourceNumber-b.sourceNumber).map(q=>[q.q,q.opts,q.ans])}""")
                assert latest==expected,(ext,n,latest[:2])
            print('Equivalencia TXT / PDF / JSON',n,flush=True)
        before=count();data,lines=exam(2,'Scan');upload('scan.pdf',pdf(lines,True),'application/pdf')
        assert page.evaluate('!!previewDecision'),page.locator('.toast').all_text_contents()
        action('keepAll');page.wait_for_function('activeImport===null')
        assert count()==before+2 and page.evaluate("S.vers.some(v=>v.pages.some(p=>p.src==='ocr'))")
        print('OCR local escaneado, revisión obligatoria',flush=True)
        before=count();upload('bad.pdf',b'%PDF-xxxxx');assert count()==before
        upload('bad.json',b'{oops');assert count()==before
        data,lines=exam(1,'Conflicto');lines.insert(-1,'1=B');upload('conflict.txt','\n'.join(lines).encode());action('cancelPreview');page.wait_for_function('activeImport===null');assert count()==before
        print('Archivos dañados y cancelación sin escrituras')
        for n in [1000,10000]:
            data,_=exam(n,'Volumen '+str(n));t=time.monotonic();upload(str(n)+'.json',json.dumps(data).encode())
            assert count()==before+n,(n,count(),page.locator('.toast').all_text_contents());before=count()
            heap=page.evaluate('performance.memory?.usedJSHeapSize')
            print('Banco',n,'tiempo',round(time.monotonic()-t,2),'s · heap observado',heap,flush=True)
        tab('more');page.locator('[data-k=shuffle]').click();tab('home');action('setup');page.select_option('#sn','10');page.select_option('#sm','0');action('setupGo')
        for i in range(10):
            q=page.evaluate('runQuestion(S.run,S.run.i)')
            page.locator(f'[data-a=pick][data-i="{q["ans"]}"]').click()
            if i==0:
                page.reload();action('resume');page.locator('[data-a=next]').wait_for();assert page.evaluate('S.run.learn===false&&S.run.sel===runQuestion(S.run,0).ans')
            action('next')
            page.wait_for_function('!actionBusy')
        assert page.evaluate('S.run.res.pct===100&&S.prof.answered===10')
        print('Barajado, simulacro, autoguardado, reanudación y corrección',flush=True)
        action('home');tab('more')
        # El servidor ya está apagado. Para la descarga nativa, bloquea HTTP(S)
        # explícitamente: el emulador offline de CDP puede cancelar descargas blob.
        ctx.route('http**',lambda route:route.abort())
        ctx.set_offline(False)
        action('export');save=page.locator('a[download]');save.wait_for()
        with page.expect_download() as dl:save.click()
        if dl.value.failure() is not None:
            print('Se reintenta con la descarga alternativa del navegador.',flush=True)
            page.locator('[data-a=alternativeDownload]').click()
            with page.expect_download() as dl:page.locator('#alternateBackup').click()
        path=Path(tmp)/'backup.json';assert dl.value.failure() is None;dl.value.save_as(path);page.wait_for_function('!actionBusy')
        ctx.set_offline(True);packed=json.loads(path.read_text());raw=json.loads(packed['data']);assert raw['files'] and raw['files'][0]['encoded'].startswith('data:application/pdf;')
        action('close');action('wipe');action('wipeGo');page.wait_for_function('S.qs.length===0')
        page.locator('#imp').set_input_files(path);action('restoreBackup');page.wait_for_function('S.qs.length>10000')
        assert count()==before and page.evaluate('S.prof.answered===10')
        print('Copia completa con PDF y restauración tras vaciado de datos sintéticos')
        tab('lib');action('delDoc');action('delGo');page.wait_for_function('S.trash.length===1');tab('more');action('restoreDoc');page.wait_for_function('S.trash.length===0')
        action('diagnostic');assert 'Correcta' in page.locator('.modal').inner_text()
        assert not external,external
        assert not errors,errors
        print('Papelera, diagnóstico, uso sin red y sin solicitudes externas')
        browser.close()
    server.shutdown()
if __name__=='__main__':run()
