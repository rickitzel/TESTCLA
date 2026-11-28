function dataURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob)})}
async function downloadJSON(name,object,interactive=false){
  const a=document.createElement('a'),blob=new Blob([JSON.stringify(object)],{type:'application/json'}),url=URL.createObjectURL(blob);
  a.href=url;a.download='testclau-'+name+'-'+today()+'.json';if(interactive){
    try{const ready=await fetch(url);if(!ready.ok||(await ready.blob()).size!==blob.size)throw Error('No se pudo preparar la descarga')}catch(e){URL.revokeObjectURL(url);throw e}
    if(S.downloadURL)URL.revokeObjectURL(S.downloadURL);S.downloadURL=url;S.backupFile=new File([blob],a.download,{type:'application/json'});
    modal(`<h2>Copia preparada</h2><p>Guarda el archivo en tu dispositivo.</p><a class="pri download" data-a="downloadReady" href="${url}" download="${esc(a.download)}">Descargar copia</a> <button data-a="alternativeDownload">Descarga alternativa</button> ${navigator.canShare?.({files:[S.backupFile]})?'<button data-a="shareCopy">Guardar o compartir archivo…</button>':''} <button data-a="close">Cerrar</button>`);
    return;
  }
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function snapshot(){
  const tx=db.transaction(STORES,'readonly');
  return Promise.all(STORES.map(async s=>[s,await P(tx.objectStore(s).getAll())])).then(Object.fromEntries);
}
async function exportBackup(interactive=false){
  const data=await snapshot();
  data.files=await Promise.all(data.files.map(async f=>({id:f.id,encoded:await dataURL(f.blob)})));
  validateBackup(data);const body=JSON.stringify(data),hash=await sha256(new TextEncoder().encode(body));
  await downloadJSON('copia',{format:'testmaster-v2',created:new Date().toISOString(),sha256:hash,data:body},interactive);
  if(!interactive){S.prof.backupAt=Date.now();await saveProf()}toast('Copia preparada con los archivos originales disponibles');return hash;
}
const safeID=id=>typeof id==='string'&&/^[a-z0-9_.:-]{1,180}$/i.test(id)&&!['constructor','prototype','__proto__'].includes(id);
function validateBackup(data){
  const fail=msg=>{throw Error('Copia inválida · '+msg)};
  const maps={};
  for(const s of STORES){
    if(!Array.isArray(data[s]))fail(s);
    maps[s]=new Map();
    for(const row of data[s]){if(!row||!safeID(row.id)||maps[s].has(row.id))fail('identificador en '+s);maps[s].set(row.id,row)}
  }
  const count=v=>Number.isSafeInteger(v)&&v>=0;
  for(const d of data.docs)if(maps.versions.get(d.cur)?.docId!==d.id||typeof d.name!=='string')fail('documento sin versión');
  for(const v of data.versions)if(!maps.docs.has(v.docId)||!Array.isArray(v.pages)||!Array.isArray(v.chunks)||!Array.isArray(v.sections)||typeof v.hash!=='string'||!count(v.n)||v.pages.some(p=>!count(p.n)||typeof p.text!=='string')||v.sections.some(s=>!count(s.page)))fail('versión incompleta');
  for(const q of data.questions){
    if(maps.versions.get(q.vid)?.docId!==q.docId||typeof q.q!=='string'||!Array.isArray(q.opts)||(q.state==='validated'?q.opts.length!==4:q.opts.length>4)||q.opts.some(o=>typeof o!=='string')||!q.ev||!count(q.ev.page)||!q.st||!['seen','ok','ko','last'].every(k=>count(q.st[k]))||!q.srs||!count(q.srs.box)||!count(q.srs.due))fail('pregunta incompleta');
    if(q.state==='validated'&&(!Number.isInteger(q.ans)||q.ans<0||q.ans>3||new Set(q.opts.map(optionNorm)).size!==4))fail('clave u opciones');
    if(q.picture&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(q.picture))fail('imagen');
  }
  for(const s of data.sessions){
    if(!count(s.ts))fail('fecha de sesión');
    if(s.status==='open'){
      const r=s.run;
      if(!r||!Array.isArray(r.ids)||!r.ids.length||r.ids.some(id=>!maps.questions.has(id))||!count(r.i)||r.i>=r.ids.length||!r.ans)fail('sesión incompleta');
      if(!['secs','combo','xp'].every(k=>count(r[k])))fail('contadores de sesión');
      for(const id of r.ids){const snap=r.snap?.[id];if(snap&&(snap.id!==id||!Array.isArray(snap.opts)||snap.opts.length!==4||!snap.ev||typeof snap.q!=='string'||!count(snap.ans)||snap.ans>3))fail('pregunta histórica');const order=r.orders?.[id];if(order&&(!Array.isArray(order)||[...order].sort().join()!=='0,1,2,3'))fail('orden de opciones')}
    }else if(!s.final||!s.res||!['total','ok','pct'].every(k=>count(s.res[k]))||!Array.isArray(s.res.det))fail('resultado');
  }
  const p=maps.kv.get('profile');
  if(p){if(p.groups&&(!Array.isArray(p.groups)||p.groups.some(g=>!safeID(g.id)||!Array.isArray(g.ids)||!g.ids.every(safeID))))fail('colecciones');for(const k of ['xp','streak','best','todayN','exams','correct','answered','perfect','goal','weekGoal'])if(p[k]!==undefined&&!count(p[k]))fail('perfil');if(p.intervals&&(!Array.isArray(p.intervals)||p.intervals.length!==6||!p.intervals.every(count)))fail('intervalos');if(p.days&&(!Array.isArray(p.days)||p.days.some(d=>!count(d)||d>6)))fail('calendario')}
  for(const f of data.files)if(!maps.versions.has(f.id))fail('archivo sin versión');
  return data;
}
function legacyHash(bytes){
  let h=2166136261;for(const byte of bytes){h^=byte;h=Math.imul(h,16777619)}
  return 'fnv'+(h>>>0).toString(16).padStart(8,'0')+bytes.length;
}
async function matchesHash(bytes,hash,allowLegacy=false){
  return allowLegacy&&typeof hash==='string'&&hash.startsWith('fnv')?legacyHash(bytes)===hash:await sha256(bytes)===hash;
}
let restoreHashType='';
async function decodeBackup(file){
  const wrapper=JSON.parse(await file.text());
  if(!['testmaster-v1','testmaster-v2'].includes(wrapper.format)||typeof wrapper.data!=='string')throw Error('Formato de copia desconocido');
  if(!await matchesHash(new TextEncoder().encode(wrapper.data),wrapper.sha256,wrapper.format==='testmaster-v1'))throw Error('La huella de la copia no coincide');
  restoreHashType=wrapper.sha256.startsWith('fnv')?'FNV de la copia histórica':'SHA-256';
  const data=validateBackup(JSON.parse(wrapper.data));
  for(const f of data.files){
    if(!/^data:(?:application\/pdf|application\/octet-stream);base64,[A-Za-z\d+/=]+$/.test(f.encoded))throw Error('PDF de la copia inválido');
    const bytes=Uint8Array.from(atob(f.encoded.split(',')[1]),c=>c.charCodeAt(0));
    const version=data.versions.find(v=>v.id===f.id);
    if(!await matchesHash(bytes,version.hash,true))throw Error('Huella del PDF incorrecta');
    f.blob=new Blob([bytes],{type:'application/pdf'});delete f.encoded;
  }
  return data;
}
let pendingRestore=null;
$('#imp').addEventListener('change',async e=>{
  try{const file=e.target.files[0];if(!file)return;pendingRestore=null;pendingRestore=await decodeBackup(file);
    modal(`<h2>Restaurar copia verificada</h2><p>Integridad comprobada con ${restoreHashType}. ${pendingRestore.docs.length} documentos · ${pendingRestore.questions.length} preguntas · ${pendingRestore.files.length} originales. Se sustituirán todos los datos locales. Descarga antes la copia actual para poder deshacer.</p><button data-a="export">Exportar estado actual</button> <button data-a="restoreBackup">Restaurar</button> <button data-a="close">Cancelar</button>`);
  }catch(err){toast(err.message,true)}finally{e.target.value=''}
});
A.restoreBackup=async()=>{
  if(!pendingRestore)return;const data=pendingRestore;
  await atomicWrite(STORES,tx=>{for(const s of STORES){const store=tx.objectStore(s);store.clear();for(const row of data[s])store.put(row)}});
  pendingRestore=null;forgetReceipt();S.run=null;clearInterval(TM);await load();S.tab='home';closeModal();toast('Restauración completada');
};
A.diagnostic=async()=>{
  const data=await snapshot();let integrity='Correcta';try{validateBackup(data)}catch(e){integrity=e.message}
  const space=await navigator.storage?.estimate?.()||{};
  const report={version:'2.2.0',esquema:db.version,integridad:integrity,almacenes:Object.fromEntries(STORES.map(s=>[s,data[s].length])),bytesUsados:space.usage,cuota:space.quota,estadisticasCoherentes:data.questions.every(q=>q.st&&q.st.seen===q.st.ok+q.st.ko)&&data.sessions.filter(s=>s.final).every(s=>s.res.ok<=s.res.total&&s.res.det.length===s.res.total),offline:!!navigator.serviceWorker?.controller,importador:parseProvidedExam([{n:1,text:'1. Prueba\nA) uno\nB) dos\nC) tres\nD) cuatro\nRespuestas\n1=B'}])[0]?.ans===1};
  A.saveDiag=()=>downloadJSON('diagnostico',report);
  modal(`<h2>Diagnóstico local</h2><pre style="white-space:pre-wrap">${esc(JSON.stringify(report,null,2))}</pre><button data-a="saveDiag">Descargar informe</button> <button data-a="close">Cerrar</button>`);
};
let actionBusy=false;
async function dispatchAction(fn,data,event){
  if(actionBusy&&fn!==A.cancelJob&&!previewDecision)return;
  const take=!actionBusy;
  if(take)actionBusy=true;
  try{await fn(data,event)}catch(e){toast(e.message,true);await load();if(S.tab==='run'&&S.run){const stored=S.sessions.find(s=>s.id===S.run.id);if(stored?.status==='open')S.run=structuredClone(stored.run);else{S.tab='home';S.run=null}}render()}finally{if(take)actionBusy=false}
}
async function safeMode(){
  $('#nav').hidden=true;
  $('#app').innerHTML='<h1>Modo seguro</h1><p>Lectura directa de IndexedDB para diagnóstico y copia de rescate.</p><button data-a="safeExport">Exportar copia de rescate</button> <button data-a="safeDiag">Comprobar integridad</button><p>Quita #seguro de la dirección y recarga para volver al estudio.</p><pre id="diagnosis"></pre>';
}
A.safeExport=async()=>{
  const data=await snapshot();data.files=await Promise.all(data.files.map(async f=>({id:f.id,encoded:await dataURL(f.blob)})));
  const body=JSON.stringify(data);downloadJSON('rescate',{format:'testmaster-v2',created:new Date().toISOString(),sha256:await sha256(new TextEncoder().encode(body)),data:body});
};
A.safeDiag=async()=>{try{validateBackup(await snapshot());$('#diagnosis').textContent='Integridad correcta'}catch(e){$('#diagnosis').textContent=e.message}};
async function migrateLegacy(verified=false){
  const records=S.qs.filter(q=>!q.optionIds||!q.revision);
  if(!records.length){toast('Todos los registros tienen la versión actual');return}
  if(!verified)await exportBackup();
  const changed=records.map(q=>{
    const row={...q,optionIds:q.opts.map((_,i)=>q.id+'-'+i),revision:1};
    if(row.kind==='provided'&&!row.answerLetter&&row.state!=='validated')row.ans=null;
    if(row.kind==='provided'&&row.state==='validated'&&(!row.answerLetter||'ABCD'[row.ans]!==row.answerLetter)){
      row.state='needs_review';row.reasons=['La clave histórica requiere comprobación'];row.ans=null;
    }
    return row;
  });
  await atomicWrite(['questions','kv'],tx=>{for(const q of changed)tx.objectStore('questions').put(q);tx.objectStore('kv').put({id:'schema',revision:2})});
  await load();render();toast(changed.length+' registros históricos actualizados');
}
let migrationHash=null;
A.migrate=async()=>{
  if(S.qs.every(q=>q.optionIds&&q.revision)){toast('Todos los registros tienen la versión actual');return}
  migrationHash=await exportBackup(true);
  modal(`<h2>Actualizar registros antiguos</h2><p>Descarga la copia previa y vuelve a seleccionarla aquí. Cuando compruebe su huella, TESTCLAU actualizará los registros.</p><a class="pri download" data-a="downloadReady" href="${esc(S.downloadURL)}" download="testclau-antes-de-actualizar.json">Descargar copia previa</a> <button data-a="alternativeDownload">Descarga alternativa</button><label>Comprobar la copia descargada<input type="file" id="verifyMigration" accept=".json"></label><button data-a="close">Cancelar</button>`);
};
document.addEventListener('change',event=>{
  if(event.target.id!=='verifyMigration')return;
  const file=event.target.files?.[0];if(!file)return;
  dispatchAction(async()=>{
    const wrapper=JSON.parse(await file.text());
    if(!migrationHash||wrapper.sha256!==migrationHash)throw Error('Selecciona la copia que acabas de descargar');
    await decodeBackup(file);await migrateLegacy(true);migrationHash=null;closeModal();
  },{},event);
});

A.downloadReady=async()=>{S.prof.backupAt=Date.now();await saveProf()};

A.shareCopy=async()=>{try{await navigator.share({files:[S.backupFile],title:'Copia de TESTCLAU'});await A.downloadReady()}catch(e){if(e.name!=='AbortError')throw e}};

A.alternativeDownload=async(d,event)=>{
  const button=event.target.closest('button'),link=document.createElement('a');
  const encoded=await dataURL(S.backupFile);
  link.href=encoded;link.download=S.backupFile.name;link.className='pri download';
  link.textContent='Guardar copia alternativa';link.dataset.a='downloadReady';link.id='alternateBackup';
  button.replaceWith(link);link.focus();
};
