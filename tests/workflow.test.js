const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html');
const fixture=read('tests/fixtures/10.json');
function app(){
  const document={addEventListener(){},querySelector(){return {addEventListener(){}}},body:{}};
  const ctx=vm.createContext({document,navigator:{},location:{hash:''},console,crypto:webcrypto,TextEncoder,TextDecoder,Blob,File,URL,atob,structuredClone,clearInterval,setInterval,setTimeout,clearTimeout,Uint8Array});
  for(const m of html.matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){
    const code=m[1]?read(m[1]):m[2].split('(async()=>{\n  try{await openDB()')[0];vm.runInContext(code,ctx);
  }
  const run=code=>vm.runInContext(code,ctx);
  run(`var tables=Object.fromEntries(STORES.map(s=>[s,new Map()]));
  var exported=null; var failWrite=false;
  atomicWrite=async(names,fn)=>{
    const copy=structuredClone(tables);
    fn({objectStore:s=>({put:r=>copy[s].set(r.id,structuredClone(r)),clear:()=>copy[s].clear()})});
    if(failWrite)throw Error('Cuota');
    tables=copy;
  };
  render=()=>{};toast=()=>{};startTimer=()=>{};confetti=()=>{};floatXP=()=>{};beep=()=>{};focusDialog=()=>{};
  db={transaction:()=>({objectStore:s=>({getAll:()=>request([...tables[s].values()]),get:id=>request(tables[s].get(id))})})};
  function request(value){const r={};Promise.resolve().then(()=>{r.result=structuredClone(value);r.onsuccess()});return r}
  downloadJSON=(name,data)=>{exported=data};
  `);
  return {ctx,run};
}
function rows(app,n=fixture){app.ctx.input=n;return app.run('parseExamJSON(input)')}
async function seed(app){app.ctx.rows=rows(app);await app.run("registerVersion('Banco','prueba',[{n:1,text:'Banco',flag:false}],5,null,rows)")}
test('deduplicación y conflicto conservan preguntas y claves separadas',()=>{
  const a=app(),r=rows(a);a.ctx.bank=[...r,{...r[0],ans:2,reasons:[]},{...r[1],reasons:[]}];
  assert.equal(a.run("diagnose(bank,[],[]).length"),4);
  assert.match(a.ctx.bank[0].reasons.join(),/distintas/);assert.match(a.ctx.bank[1].reasons.join(),/exacto/);
});
test('dos claves explícitas y opción no válida mantienen pendiente',()=>{
  const a=app();a.ctx.txt=read('tests/fixtures/10.txt').replace('1=A\n','1=A,1=E\n');assert.equal(a.run("parseProvidedExam(txtPages(txt))[0].ans"),null);
});
test('explicaciones multilínea y contradictorias',()=>{
  const a=app();a.ctx.txt=read('tests/fixtures/10.txt')+'\nSoluciones explicadas\n1. A. Primera línea\nSegunda línea\n2. A. Clave distinta';
  assert.equal(a.run("parseProvidedExam(txtPages(txt))[0].expl"),'Primera línea Segunda línea');
  assert.equal(a.run("parseProvidedExam(txtPages(txt))[1].ans"),null);
});
test('claves JSON de tipo incorrecto no se aceptan',()=>{const a=app(),data=JSON.parse(fixture);data.preguntas[0].correcta=['B'];assert.equal(rows(a,JSON.stringify(data))[0].state,'needs_review')});
test('análisis e indexación de bancos grandes',async t=>{
 for(const n of [1000,10000]){const a=app(),data=JSON.parse(fixture),sample=data.preguntas[0];data.total_preguntas=n;data.preguntas=Array.from({length:n},(_,i)=>({...sample,id:i+1,pregunta:'Caso '+i}));
 const t0=performance.now();a.ctx.rows=rows(a,JSON.stringify(data));assert.equal(a.run("diagnose(rows,[],[]).length"),0);
 await a.run("registerVersion('Banco','prueba',txtPages(rows.map(q=>q.ev.quote).join('\\n\\n')),1,null,rows)");
 assert.equal(a.run('valid().length'),n);
 t.diagnostic(n+' preguntas, proceso Node con almacenamiento de prueba: '+Math.round(performance.now()-t0)+' ms; heap final del proceso '+Math.round(process.memoryUsage().heapUsed/1048576)+' MiB');}
});
test('registro de examen atómico bajo fallo de escritura',async()=>{const a=app();a.run('failWrite=true');await assert.rejects(seed(a));assert.equal(a.run('tables.docs.size+tables.questions.size+tables.versions.size'),0)});
test('simulacro con opciones barajadas, sesión recuperada y resultado histórico',async()=>{
 const a=app();await seed(a);await a.run("S.prof.shuffle=true;startRun({mode:'sim',n:10,learn:false})");
 for(let i=0;i<10;i++){await a.run('choose(runQuestion(S.run,S.run.i).ans)');if(!i){await a.run('load()');await a.run('A.resume()');assert.equal(a.run('S.run.learn'),false)}await a.run('nextQ()')}
 assert.equal(a.run('S.prof.correct'),10);assert.equal(a.run('S.run.res.pct'),100);
 a.run("qOf(S.run.ids[0]).q='Edición posterior'");assert.notEqual(a.run('S.run.res.det[0].snapshot.q'),'Edición posterior');
 assert.equal(a.run("S.run.res.det.every(d=>d.optionId===d.snapshot.optionIds[d.snapshot.ans])"),true);
});
test('reanudar corrección inmediata conserva bloqueo y XP',async()=>{
 const a=app();await seed(a);await a.run("startRun({mode:'quick',n:1,learn:true})");await a.run('choose(runQuestion(S.run,0).ans)');const xp=a.run('S.prof.xp');
 await a.run('load()');await a.run('A.resume()');await a.run('choose(runQuestion(S.run,0).ans)');assert.equal(a.run('S.prof.answered'),1);assert.equal(a.run('S.prof.xp'),xp);
});
test('repaso de fallo acotado, duda a 1 día y caja máxima',async()=>{
 const a=app();await seed(a);await a.run("startRun({mode:'learn',n:1,learn:true})");await a.run('choose(-1)');await a.run('nextQ()');await a.run('choose(-1)');assert.equal(a.run('S.run.ids.length'),2);
 a.run('var q=rows[0];srsUpdate(q,true,100,true)');assert.equal(a.run('q.srs.due'),100+864e5);for(let i=0;i<9;i++)a.run('srsUpdate(q,true,100)');assert.equal(a.run('q.srs.due'),100+60*864e5);
});
test('preparación sin evidencia, evidencia parcial y cinco indicadores máximos',()=>{
 const a=app();assert.equal(a.run('readiness([],[]).score'),null);a.ctx.rows=rows(a);
 assert.equal(a.run('readiness(rows,[]).parts[0]'),0);
 assert.equal(a.run("rows.forEach(q=>{q.st={seen:4,ok:3,ko:1};q.srs={box:2,due:Date.now()+864e5}});readiness(rows,[{ts:1,mode:'sim',final:true,res:{ok:10,total:10,det:rows.map(q=>({id:q.id,good:true}))}}]).score"),100);
});
test('copia, cambio de huella y restauración íntegra con estado anterior',async()=>{
 const a=app();await seed(a);await a.run('exportBackup()');a.ctx.copy=a.run('exported');assert.equal(a.run("JSON.parse(copy.data).questions.length"),10);
 a.ctx.file=new File([JSON.stringify(a.ctx.copy)],'copia.json');await a.run('decodeBackup(file).then(d=>pendingRestore=d)');await a.run("atomicWrite(STORES,tx=>STORES.forEach(s=>tx.objectStore(s).clear()))");await a.run('A.restoreBackup()');assert.equal(a.run('valid().length'),10);
 a.ctx.file=new File([JSON.stringify({...a.ctx.copy,data:a.ctx.copy.data+' '})],'dañada.json');await assert.rejects(a.run('decodeBackup(file)'),/huella/);assert.equal(a.run('valid().length'),10);
});
test('migración de registros V1 con copia previa y conservación del historial',async()=>{
 const a=app();await seed(a);await a.run("dbPut('questions',{...S.qs[0],optionIds:undefined,revision:undefined,state:'needs_review',ans:0,answerLetter:''})");await a.run('load()');await a.run('migrateLegacy()');
 assert.equal(a.run("JSON.parse(exported.data).questions.find(q=>!q.answerLetter).ans"),0);assert.equal(a.run("S.qs.find(q=>!q.answerLetter).ans"),null);assert.equal(a.run('S.qs.length'),10);
});
test('papelera y recuperación',async()=>{const a=app();await seed(a);await a.run("trashDoc(rows[0].docId,true)");assert.equal(a.run('valid().length'),0);await a.run("trashDoc(rows[0].docId,false)");assert.equal(a.run('valid().length'),10)});
test('caché offline contiene todos los recursos declarados y excluye terceros',()=>{
 const ctx=vm.createContext({self:{addEventListener(){}}});vm.runInContext(read('sw.js'),ctx);
 const files=vm.runInContext('SHELL',ctx);for(const f of files){assert(!f.includes('://'));assert(fs.existsSync(path.join(root,f)),f)}
});
test('copia de un PDF real, restauración y rechazo de un binario alterado',async()=>{
  const a=app();await seed(a);
  a.ctx.bytes=new Uint8Array(fs.readFileSync(path.join(root,'tests/fixtures/10.pdf')));
  a.ctx.encode=async blob=>'data:application/pdf;base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');
  await a.run("dataURL=encode;");await a.run("(async()=>{const v=S.vers[0];v.hash=await sha256(bytes);await dbPut('versions',v);await dbPut('files',{id:v.id,blob:new Blob([bytes],{type:'application/pdf'})})})()");
  await a.run('exportBackup()');a.ctx.file=new File([a.run('JSON.stringify(exported)')],'copia.json');
  await a.run('decodeBackup(file).then(d=>pendingRestore=d)');await a.run('A.restoreBackup()');assert.equal(await a.run("(async()=>sha256(await (await dbAll('files'))[0].blob.arrayBuffer()))()"),a.run('S.vers[0].hash'));
  await a.run("(async()=>{const data=JSON.parse(exported.data);data.files[0].encoded='data:application/pdf;base64,QQ==';exported.data=JSON.stringify(data);exported.sha256=await sha256(new TextEncoder().encode(exported.data))})()");
  a.ctx.file=new File([a.run('JSON.stringify(exported)')],'corrupta.json');await assert.rejects(a.run('decodeBackup(file)'),/PDF incorrecta/);
});
test('revisar claves y recuperar solo coincidencias inequívocas',async()=>{
 const a=app();await seed(a);a.ctx.text=read('tests/fixtures/10.txt');
 await a.run("(async()=>{const v=S.vers[0];v.pages=txtPages(text);await dbPut('versions',v);for(const [i,q] of S.qs.slice(0,2).entries())await dbPut('questions',{...q,q:i?'Texto ya editado':q.q,state:'needs_review',answerLetter:'',ans:null});await load();await reprocessVersion(v.id)})()");
 assert.equal(a.run("S.qs.filter(q=>q.state==='needs_review').length"),1);assert.equal(a.run("S.qs.find(q=>q.state==='needs_review').q"),'Texto ya editado');
});
test('simulacro de supervivencia termina al fallar, pregunta nueva y olvidada',async()=>{
 const a=app();await seed(a);assert.equal(a.run("filterPool(valid(),'fresh').length"),10);
 await a.run("startRun({mode:'survival',n:10,learn:true})");await a.run("choose(-1)");assert.equal(a.run('S.run.ids.length'),1);await a.run('nextQ()');assert.equal(a.run('S.run.res.ok'),0);
});
test('las cinco pantallas y la corrección se renderizan con texto escapado',async()=>{
 const a=app();await seed(a);a.run("S.docs[0].name='<marca> & texto';S.qs[0].q='<marca>';S.qs[0].state='needs_review'");
 for(const v of ['vHome','vLib','vRev','vStats','vMore'])assert(!a.run(v+'()').includes('<marca>'));
 assert(a.run('vLib()').includes('&lt;marca&gt;'));assert(a.run('vRev()').includes('&lt;marca&gt;'));
 await a.run("startRun({mode:'quick',n:1,learn:true})");assert(a.run('vRun()').includes('data-a="pick"'));await a.run('choose(runQuestion(S.run,0).ans)');assert(a.run('vRun()').includes('CORRECTO'));
});
test('pérdida de cuota en restauración conserva todos los registros',async()=>{
 const a=app();await seed(a);await a.run('pendingRestore=snapshot()');await a.run('Promise.resolve(pendingRestore).then(d=>{pendingRestore=d;pendingRestore.questions=[]})');a.run('failWrite=true');
 await assert.rejects(a.run('A.restoreBackup()'));assert.equal(a.run('tables.questions.size'),10);
});
test('vista previa del worker conserva filas reparables y explica numeración incorrecta',()=>{
 const a=app();a.ctx.importScripts=()=>{};a.ctx.self={postMessage:r=>{a.ctx.result=r}};
 a.run(read('parser-worker.js'));
 const data=JSON.parse(fixture);delete data.preguntas[2].opciones.B;a.ctx.msg={json:true,text:JSON.stringify(data)};
 a.run('self.onmessage({data:msg})');assert.equal(a.ctx.result.rows.length,10);assert.equal(a.ctx.result.rows[2].ans,null);assert.equal(a.ctx.result.rows[0].state,'validated');
 a.ctx.msg={text:read('tests/fixtures/10.txt').replace('TOTAL_PREGUNTAS: 10','TOTAL_PREGUNTAS: 12')};a.run('self.onmessage({data:msg})');assert(a.ctx.result.rows.every(q=>q.state==='needs_review'));
});
test('huella de copia V1 aceptada y referencia huérfana rechazada antes de restaurar',async()=>{
 const a=app();await seed(a);await a.run('exportBackup()');a.ctx.file=new File([a.run("JSON.stringify({...exported,format:'testmaster-v1'})")],'v1.json');assert.equal((await a.run('decodeBackup(file)')).questions.length,10);
 assert.throws(()=>a.run('var broken=JSON.parse(exported.data);broken.versions=[];validateBackup(broken)'),/sin versión/);
});
test('prueba de ciclo de caché: instalación, navegación offline y actualización fallida',async()=>{
 const listeners={},data=new Map();let version='primera',fail=false;
 const cache={async addAll(files){if(fail)throw Error('Sin red');for(const f of files)data.set(f,version+f)},match:req=>data.get(req.url||req)};
 const ctx=vm.createContext({location:{origin:'https://test.invalid'},self:{clients:{claim:async()=>{}},addEventListener:(k,f)=>listeners[k]=f},URL,caches:{open:async()=>cache},fetch:()=>Promise.reject(Error('sin red'))});vm.runInContext(read('sw.js'),ctx);
 const lifecycle=async type=>{let p;listeners[type]({waitUntil:value=>p=value});await p};
 await lifecycle('install');await lifecycle('activate');let result;listeners.fetch({request:{method:'GET',mode:'navigate',url:'https://test.invalid/index.html'},respondWith:p=>result=p});assert.equal(await result,'primeraindex.html');
 version='segunda';fail=true;await assert.rejects(lifecycle('install'));assert.equal(data.get('index.html'),'primeraindex.html');
});
test('copia histórica V1 con huella FNV, identificada de forma explícita',async()=>{
 const a=app();await seed(a);await a.run('exportBackup()');a.ctx.file=new File([a.run("JSON.stringify({...exported,format:'testmaster-v1',sha256:legacyHash(new TextEncoder().encode(exported.data))})")],'v1.json');
 assert.equal((await a.run('decodeBackup(file)')).questions.length,10);assert.match(a.run('restoreHashType'),/FNV/);
});
test('2.2 recupera una respuesta pendiente una sola vez',async()=>{
 const a=app();a.ctx.localStorage=new Map();a.run("localStorage.getItem=localStorage.get.bind(localStorage);localStorage.setItem=localStorage.set.bind(localStorage);localStorage.removeItem=localStorage.delete.bind(localStorage)");
 await seed(a);await a.run("startRun({mode:'learn',n:2,learn:true})");
 a.run("localStorage.setItem('testclau.pendingAnswer',JSON.stringify({id:S.run.id,step:0,question:S.run.ids[0],choice:runQuestion(S.run,0).ans}))");
 await a.run('recoverAnswer()');await a.run('recoverAnswer()');assert.equal(a.run('S.prof.answered'),1);assert.equal(a.run('S.prof.correct'),1);
});
test('2.2 combina filtros de campos y búsqueda',async()=>{
 const a=app();await seed(a);a.run("S.qs[0].modulo='M1';S.qs[0].ATA='24';S.filters={modulo:'M1',ATA:'24'}");
 assert.equal(a.run("filterPool(valid(),'selection').length"),1);a.run("S.filters.ATA='31'");assert.equal(a.run("filterPool(valid(),'selection').length"),0);
});
test('2.2 las flashcards reveladas quedan fuera de los aciertos y XP',async()=>{
 const a=app();await seed(a);await a.run("startRun({mode:'cards',n:1,learn:true})");await a.run('choose(runQuestion(S.run,0).ans)');await a.run('nextQ()');
 assert.equal(a.run('S.prof.correct+S.prof.answered+S.prof.xp+S.prof.exams'),0);assert.equal(a.run('readiness(valid(),S.sessions).parts[1]'),null);
});
