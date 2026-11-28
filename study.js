const modes={quick:'Test rápido',learn:'Aprendizaje',survival:'Supervivencia',hard:'Difíciles',mixed:'Mixto',daily:'Reto diario',cards:'Flashcards',cert:'Certificación interna',fresh:'Nuevas',forgot:'Olvidadas'};
const metadata=['tema','modulo','ATA','UD','RA','dificultad','referencia','carpeta'];
function provenance(q){
  if(q.academic)return 'Revisión humana contra la fuente';
  if(q.kind==='provided')return 'Clave de '+(q.keySource||(q.reviewedBy?'edición manual':'documento'))+' · Sin revisión académica registrada';
  return q.reviewedBy?'Revisión humana registrada':'Comprobaciones automáticas sobre la cita';
}
function studyCopy(q){return Object.fromEntries(['id','q','opts','ans','expl','ev','keySource','academic','kind','reviewedBy','optionIds','revision'].map(k=>[k,q[k]]))}
function runQuestion(run,i){return run.snap?.[run.ids[i]]||qOf(run.ids[i])}
function commitRun(questions,session){
  return atomicWrite(['questions','kv','sessions'],tx=>{
    for(const q of questions)tx.objectStore('questions').put(q);
    tx.objectStore('kv').put(S.prof);
    tx.objectStore('sessions').put(session||{id:S.run.id,status:'open',run:S.run,ts:Date.now()});
  });
}
function filterPool(pool,mode){
  const now=Date.now();
  if(mode==='fresh')return pool.filter(q=>!q.st.seen);
  if(mode==='forgot')return pool.filter(q=>q.st.seen&&q.srs.due<now-864e5);
  if(mode==='hard')return pool.filter(q=>q.st.ko>q.st.ok||norm(q.dificultad||q.diff)==='dificil');
  if(mode==='selection')return pool.filter(q=>matches(q,S.search||''));
  return pool;
}
function matches(q,search){
  const value=norm([q.q,...metadata.map(k=>q[k]),q.note,q.diff,S.docs.find(d=>d.id===q.docId)?.name].join(' '));
  return norm(search).split(' ').every(t=>value.includes(t))&&Object.entries(S.filters||{}).every(([k,v])=>!v||(q[k]||(k==='dificultad'?q.diff:''))===v);
}
function studyHome(){
  const week=S.sessions.filter(s=>s.final&&s.ts>=Date.now()-7*864e5).reduce((n,s)=>n+s.res.total,0);
  return `${subjectProgress()}<h2>Entrenar</h2><p class="mu">Últimos 7 días · ${week} respuestas en sesiones terminadas de  ${S.prof.weekGoal||S.prof.goal*7} previstas.</p><div class="row wrap">${Object.entries(modes).map(([k,v])=>`<button data-a="mode" data-mode="${k}">${v}</button>`).join('')}</div>`;
}
function runTools(r,q){
  const opts=[
    ['breakStudy','Descansar'],['note','Nota'],['speak','Leer en voz alta'],
    ...(!r.locked&&r.learn?[['doubt',r.doubt?'Duda marcada':'Marcar duda']]:[]),
    ...(r.mode==='cards'&&!r.flipped?[['flip','Mostrar respuesta']]:[])
  ];
  const live=qOf(q.id);return `${live?.picture?`<img src="${esc(live.picture)}" alt="Ilustración de estudio" style="max-width:100%;height:auto">`:''}${r.locked&&live?.note?`<p>Mi nota · ${esc(live.note)}</p>`:''}<div class="row wrap">${opts.map(([a,t])=>`<button data-a="${a}" data-id="${q.id}">${t}</button>`).join('')}</div>${r.mode==='cards'&&r.flipped?`<p>${esc(q.opts[q.ans])}</p>`:''}`;
}
function readiness(pool,sessions){
  const records=sessions.filter(s=>s.final&&s.mode!=='cards').sort((a,b)=>a.ts-b.ts);
  const ids=new Set(pool.map(q=>q.id));
  const last=records.flatMap(s=>s.res.det||[]).filter(d=>ids.has(d.id)).slice(-50);
  const spaced=pool.filter(q=>q.st.seen>=2);
  const missed=pool.filter(q=>q.st.ko>0);
  const sims=records.filter(s=>['sim','cert'].includes(s.mode)&&s.res.det?.length&&s.res.det.every(d=>ids.has(d.id))).slice(-3);
  const ratio=(a,b)=>b?a/b:null;
  const parts=[ratio(pool.filter(q=>q.st.seen).length,pool.length),ratio(last.filter(d=>d.good).length,last.length),
    ratio(spaced.filter(q=>q.srs.box>=2&&q.srs.due>Date.now()).length,spaced.length),
    ratio(sims.reduce((n,s)=>n+s.res.ok,0),sims.reduce((n,s)=>n+s.res.total,0)),
    ratio(missed.filter(q=>q.srs.box>=2).length,missed.length)];
  const known=parts.filter(x=>x!==null);
  return {parts,score:known.length===5?Math.round(100*known.reduce((a,b)=>a+b,0)/5):null};
}
function studyStats(){
  const pool=valid(),r=readiness(pool,S.sessions);
  const grouped=new Map();
  for(const q of pool){const k=q.tema||q.modulo||'Sin tema';const t=grouped.get(k)||[0,0,0];t[0]++;t[1]+=q.st.ok;t[2]+=q.st.seen;grouped.set(k,t)}
  const sessions=S.sessions.filter(s=>s.final),calendar=new Map();
  for(const s of sessions){const day=new Date(s.ts).toLocaleDateString();calendar.set(day,(calendar.get(day)||0)+s.res.total)}
  return `<div class="card"><h2>Preparación orientativa</h2><h3>${r.score===null?'Evidencia incompleta':r.score+' / 100'}</h3>${['Cobertura','Aciertos recientes','Retención','Simulacros','Recuperación de errores'].map((n,i)=>`<div class="row sp"><span>${n}</span><b>${r.parts[i]===null?'Sin evidencia':Math.round(100*r.parts[i])+'%'}</b></div>`).join('')}<p class="mu sm">Media de cinco indicadores con el mismo peso. Consulta el cálculo en Ayuda. La puntuación describe tu práctica.</p></div>
  <div class="card"><h3>Acierto por materia</h3>${[...grouped].map(([k,t])=>`<p>${esc(k)} · ${t[2]?Math.round(100*t[1]/t[2])+'%':'Sin respuestas'} · ${t[0]} preguntas</p>`).join('')}<button data-a="report">Exportar informe</button> <button data-a="errors">Exportar errores</button></div>
  <details class="card"><summary>Actividad por fecha</summary>${[...calendar].map(([day,n])=>`<p>${day} · ${n} respuestas</p>`).join('')}</details>`;
}
function planText(){
  const p=S.prof;if(!p.examDate)return 'Elige la fecha de examen y tus días disponibles.';
  let count=0;const date=new Date();date.setHours(0,0,0,0);const end=new Date(p.examDate+'T00:00:00');
  const span=Math.max(0,Math.round((end-date)/864e5));count=Math.floor(span/7)*(p.days?.length||0);for(let i=0;i<span%7;i++)if(p.days?.includes((date.getDay()+i)%7))count++;
  if(!count)return 'Sin días de estudio disponibles antes del examen.';
  const review=Math.ceil(count/5),work=count-review;
  return `${count} días disponibles · ${review} para repasar · ${work?Math.ceil(valid().filter(q=>!q.st.seen).length/work)+' preguntas nuevas por día':'solo repaso'}.`;
}
function settings(){
  return `<div class="card"><h3>Instalación</h3><button data-a="installApp">Instalar aplicación</button> <button data-a="offlineCheck">Comprobar uso sin conexión</button> <button data-a="checkUpdate">Buscar actualización</button></div><div class="card"><label>Idioma del OCR<select id="ocrLanguage">${[['spa+eng','Español e inglés'],['spa','Español'],['eng','Inglés']].map(([v,k])=>`<option value="${v}" ${(S.prof.ocrLang||'spa+eng')===v?'selected':''}>${k}</option>`).join('')}</select></label></div><div class="card"><button data-a="help">Ayuda</button> <button data-a="diagnostic">Diagnóstico local</button> <button data-a="migrate">Actualizar registros antiguos con copia</button> <button data-a="plan">Planificador</button><p>${planText()}</p>
  ${Object.entries({shuffle:'Barajar opciones',large:'Letra grande',contrast:'Contraste alto',light:'Tema claro',focus:'Concentración',vibrate:'Vibración',reminders:'Recordatorio de copia'}).map(([k,t])=>`<button data-a="tog" data-k="${k}" aria-pressed="${!!S.prof[k]}">${t} · ${S.prof[k]?'Sí':'No'}</button>`).join(' ')}
  <button data-a="intervals">Intervalos de repaso</button></div>
  ${S.prof.reminders&&Date.now()-(S.prof.backupAt||0)>7*864e5?'<p>Hace al menos una semana que no registras una exportación. Guarda una copia externa.</p>':''}
  ${S.trash.length?`<div class="card"><h3>Papelera</h3>${S.trash.map(d=>`<button data-a="restoreDoc" data-id="${d.id}">Recuperar ${esc(d.name)}</button>`).join('')}</div>`:''}`;
}
async function trashDoc(id,deleted){
  const doc=await dbGet('docs',id);await dbPut('docs',{...doc,deleted});await load();S.modal=null;render();
}
function pager(type,total,start){
  return total>30?`<div class="row wrap"><span>${start+1}–${Math.min(total,start+30)} de ${total}</span>${[-30,30].filter(n=>start+n>=0&&start+n<total).map(n=>`<button data-a="page" data-type="${type}" data-start="${start+n}">${n<0?'Anterior':'Siguiente'}</button>`).join('')}</div>`:'';
}
function browse(){
  const rows=curQs(q=>matches(q,S.search||'')),start=S.searchStart||0;
  modal(`<h2>Buscar preguntas</h2><label>Texto, materia, módulo, ATA, UD, RA, dificultad o carpeta<input id="search" value="${esc(S.search||'')}"></label>${fieldFilters()}<button data-a="find">Buscar</button> <button data-a="selectedRun">Estudiar selección</button> <button data-a="close">Cerrar</button><p>${rows.length} resultados</p>${pager('search',rows.length,start)}${rows.slice(start,start+30).map(q=>`<article class="card"><b>${esc(q.q)}</b><p>${esc(provenance(q))} · ${esc(q.state)}</p><p>${esc(metadata.map(k=>q[k]).filter(Boolean).join(' · '))}</p><button data-a="note" data-id="${q.id}">Notas y etiquetas</button> <button data-a="editQ" data-id="${q.id}">Editar</button></article>`).join('')}`);
}
Object.assign(A,{
  mode:d=>startRun({mode:d.mode,n:['quick','daily'].includes(d.mode)?10:40,learn:d.mode!=='cert'}),
  selectedRun:()=>startRun({mode:'selection',n:40,learn:true}),browse,
  find:()=>{S.filters=Object.fromEntries(['modulo','ATA','UD','RA','dificultad','carpeta'].map(k=>[k,$('#filter-'+k).value]));S.search=$('#search').value;S.searchStart=0;browse()},
  page:d=>{if(d.type==='rev'){S.revOffset=+d.start;render()}else{S.searchStart=+d.start;browse()}},
  restoreDoc:d=>trashDoc(d.id,false),
  note:d=>{const q=qOf(d.id);modal(`<h2>Notas y etiquetas</h2><label>Nota<textarea id="note">${esc(q.note||'')}</textarea></label>${metadata.map(k=>`<label>${esc(k)}<input id="meta-${k}" value="${esc(q[k]||'')}"></label>`).join('')}<label>Imagen local (hasta 1 MiB)<input type="file" id="picture" accept="image/png,image/jpeg,image/webp"></label>${q.picture?`<img alt="Imagen de estudio" style="max-width:100%" src="${esc(q.picture)}">`:''}<button data-a="saveNote" data-id="${q.id}">Guardar</button> <button data-a="close">Cerrar</button>`)},
  saveNote:async d=>{const q={...qOf(d.id),note:$('#note').value};metadata.forEach(k=>q[k]=$('#meta-'+k).value.trim());const f=$('#picture').files[0];if(f){if(f.size>1048576||!['image/png','image/jpeg','image/webp'].includes(f.type))throw Error('Imagen incompatible o superior a 1 MiB');q.picture=await dataURL(f)}await dbPut('questions',q);await load();closeModal()},
  speak:d=>{if(!window.speechSynthesis)throw Error('Voz no disponible');const q=S.run?runQuestion(S.run,S.run.i):qOf(d.id);speechSynthesis.cancel();const voices=speechSynthesis.getVoices().filter(v=>v.localService);const voice=voices.find(v=>v.lang.startsWith('es'))||voices[0];if(!voice)throw Error('El dispositivo necesita una voz local instalada');const u=new SpeechSynthesisUtterance([q.q,...q.opts].join('. '));u.voice=voice;u.lang=voice.lang;speechSynthesis.speak(u)},
  doubt:async()=>{S.run.doubt=!S.run.doubt;await saveRun();render()},flip:()=>{S.run.flipped=true;render()},
  intervals:()=>modal(`<h2>Repaso espaciado</h2><label>Intervalos en días, separados por comas<input id="days" value="${(S.prof.intervals||INTERVALS).slice(1).join(',')}"></label><button data-a="saveIntervals">Guardar</button>`),
  saveIntervals:async()=>{const vals=$('#days').value.split(',').map(Number);if(vals.length!==5||vals.some((v,i)=>!Number.isInteger(v)||v<1||v>365||i&&v<=vals[i-1]))throw Error('Introduce cinco intervalos crecientes entre 1 y 365 días');S.prof.intervals=[0,...vals];await saveProf();closeModal()},
  plan:()=>modal(`<h2>Planificador</h2><label>Fecha del examen<input id="examDate" type="date" min="${today()}" value="${esc(S.prof.examDate||'')}"></label><fieldset><legend>Días disponibles</legend>${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((t,i)=>`<label><input type="checkbox" style="width:auto" name="available" value="${i}" ${(S.prof.days||[1,2,3,4,5]).includes(i)?'checked':''}> ${t} </label>`).join('')}</fieldset><label>Objetivo semanal de respuestas<input type="number" min="1" max="10000" id="weekGoal" value="${Number(S.prof.weekGoal||S.prof.goal*7)}"></label><button data-a="savePlan">Guardar</button>`),
  savePlan:async()=>{const date=$('#examDate').value,days=[...document.querySelectorAll('[name=available]:checked')].map(e=>+e.value);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<today()||!days.length)throw Error('Elige una fecha futura y al menos un día disponible');const week=Number($('#weekGoal').value);if(!Number.isInteger(week)||week<1||week>10000)throw Error('Objetivo semanal entre 1 y 10.000');S.prof.weekGoal=week;S.prof.examDate=date;S.prof.days=days;await saveProf();closeModal()},
  report:()=>downloadJSON('progreso',{preparacion:readiness(valid(),S.sessions),sesiones:S.sessions.filter(s=>s.final).map(s=>({fecha:s.ts,modo:s.mode,aciertos:s.res.ok,total:s.res.total,segundos:s.secs}))}),
  errors:()=>{const rows=valid().filter(q=>q.st.ko);downloadJSON('errores',{formato:'TESTCLAU',version:1,total_preguntas:rows.length,preguntas:rows.map((q,i)=>({id:i+1,pregunta:q.q,opciones:Object.fromEntries(q.opts.map((o,j)=>['ABCD'[j],o])),correcta:'ABCD'[q.ans],explicacion:q.expl}))})},
  help:()=>modal(`<h2>Ayuda de TESTCLAU</h2><p>1. En Biblioteca importa JSON TESTCLAU V1, TXT o PDF. El examen necesita preguntas numeradas, opciones A–D y plantilla. En escaneos se usa OCR local en español e inglés. Revisa cada transcripción.</p><p>2. En Revisar, corrige opciones y clave con tu temario. La clave importada reproduce el examen y la revisión académica exige contrastarla personalmente.</p><p>3. Elige un modo en Inicio. En simulacro puedes diferir la corrección. En Más configura fechas, días libres, barajado y accesibilidad. Puedes salir para descansar y reanudar.</p><p>Preparación: cobertura de preguntas practicadas, acierto en las últimas 50 respuestas de sesiones terminadas, proporción con caja ≥2 y repaso vigente entre preguntas vistas al menos dos veces, acierto en los tres últimos simulacros del banco activo y proporción de preguntas antes falladas que alcanzan caja ≥2. Cada indicador pesa 20 %. Si falta un denominador se muestra evidencia incompleta. No predice el aprobado.</p><p>Los datos pertenecen a este navegador y dirección. Exporta antes de borrar almacenamiento o actualizar. La restauración sustituye los datos tras verificar la copia. Conserva el ZIP anterior para volver a desplegarlo en la misma dirección.</p><button data-a="close">Cerrar</button>`)
});
function collections(){
  return (S.prof.groups||[]).map(g=>`<button data-a="groupRun" data-id="${esc(g.id)}">${esc(g.name)}</button>`).join(' ');
}
A.groupEditor=()=>modal(`<h2>Combinar bancos</h2><p>Estudiarás sus preguntas en una colección. Cada pregunta conserva su documento e historial.</p><label>Nombre de la colección<input id="groupName"></label><fieldset><legend>Bancos</legend>${S.docs.map(d=>`<label><input type="checkbox" style="width:auto" name="bank" value="${d.id}"> ${esc(d.name)}</label><br>`).join('')}</fieldset><button data-a="saveGroup">Guardar colección</button> <button data-a="close">Cerrar</button>`);
A.saveGroup=async()=>{const ids=[...document.querySelectorAll('[name=bank]:checked')].map(e=>e.value),name=$('#groupName').value.trim();if(!name||ids.length<2)throw Error('Indica un nombre y dos o más bancos');(S.prof.groups||=[]).push({id:uid(),name,ids});await saveProf();closeModal()};
A.groupRun=d=>{const group=S.prof.groups.find(g=>g.id===d.id);return startRun({mode:'mixed',docIds:group.ids,n:40,learn:true})};
function focusDialog(){
  const dialog=$('.modal');if(!dialog)return;
  dialog.querySelector('input:not([type=checkbox]),textarea,button,select')?.focus({preventScroll:true});
}
document.addEventListener('keydown',e=>{
  const dialog=$('.modal');if(!dialog)return;
  if(e.key==='Escape'){if(previewDecision)A.cancelPreview();else closeModal();return}
  if(e.key!=='Tab')return;
  const items=[...dialog.querySelectorAll('button,input,select,textarea')].filter(el=>!el.disabled);
  if(!items.length)return;
  if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus()}
  else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus()}
});

function correctOption(q,index){const ids=q.optionIds||q.opts.map((_,i)=>q.id+'-'+i);return Number.isInteger(index)&&index>=0&&index<ids.length&&ids[index]===ids[q.ans]}
function trainingSummary(){
  const records=S.sessions.filter(s=>s.final).sort((a,b)=>b.ts-a.ts);
  const recent=records.slice(0,5),previous=records.slice(5,10);
  const mean=rows=>{const total=rows.reduce((a,s)=>a+s.res.total,0);return total?Math.round(100*rows.reduce((a,s)=>a+s.res.ok,0)/total):null};
  const a=mean(recent),b=mean(previous);
  const sims=records.filter(s=>['sim','cert'].includes(s.mode)).slice(0,3);
  const weak=valid().filter(q=>q.st.seen&&q.st.ko).sort((a,b)=>b.st.ko/b.st.seen-a.st.ko/a.st.seen).slice(0,5);
  return `<div class="card"><h3>Evolución</h3><p>${a===null?'Sin sesiones recientes':a+'% en las últimas '+recent.length+' sesiones'}${b===null?'':' · '+b+'% en las '+previous.length+' anteriores'}.</p><h3>Últimos simulacros</h3>${sims.map(s=>`<p>${new Date(s.ts).toLocaleDateString()} · ${s.res.ok}/${s.res.total} · ${s.res.pct}%</p>`).join('')||'<p>Sin simulacros terminados.</p>'}<h3>Preguntas con más errores relativos</h3>${weak.map(q=>`<p>${esc(q.q)} · ${q.st.ko}/${q.st.seen}</p>`).join('')||'<p>Sin errores registrados.</p>'}</div>`;
}
A.source=async d=>{
  const v=S.vers.find(v=>v.id===d.v),file=await dbGet('files',v.id),i=Math.min(v.pages.length-1,Math.max(0,Number(d.page)||0));
  const p=v.pages[i];if(!p)throw Error('Página sin contenido');
  modal(`<h2>Fuente importada</h2><p>Página ${p.n} de ${v.pages.length} · ${esc(p.src)} ${p.conf==null?'':'· '+Number(p.conf)+'% OCR'}</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(p.text)}</pre><div class="row wrap">${[i-1,i+1].filter(j=>j>=0&&j<v.pages.length).map(j=>`<button data-a="source" data-v="${v.id}" data-page="${j}">${j<i?'Anterior':'Siguiente'}</button>`).join('')}${file?`<button data-a="original" data-v="${v.id}">Descargar PDF original</button>`:''}<button data-a="close">Cerrar</button></div>`);
};
A.original=async d=>{const f=await dbGet('files',d.v);if(!f)return;const a=document.createElement('a');a.href=URL.createObjectURL(f.blob);a.download=S.docs.find(doc=>doc.cur===d.v)?.name||'original.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000)};

let installPrompt=null;
if(typeof window!=='undefined'){
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
  window.addEventListener('appinstalled',()=>{installPrompt=null;toast('TESTCLAU instalado')});
}
A.installApp=async()=>{
  if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;return}
  modal('<h2>Instalar TESTCLAU</h2><p>En Android abre el menú del navegador y toca Instalar aplicación o Añadir a la pantalla de inicio. En Safari para iPhone o iPad usa Compartir → Añadir a la pantalla de inicio y, si aparece, Abrir como app web.</p><p>Usa la dirección HTTPS de tu instalación. Mantén abierta la primera carga hasta que se complete la preparación sin conexión.</p><button data-a="close">Cerrar</button>');
};
A.offlineCheck=async()=>{
  const reg=await navigator.serviceWorker?.getRegistration();
  if(!reg||!navigator.serviceWorker.controller){toast('La primera instalación aún no está lista. Mantén la app abierta y vuelve a comprobar.',true);return}
  const cache=await caches.open('testmaster-testclau-2.2.0');
  const required=['index.html','parser-worker.js','vendor/pdf.worker.min.mjs','vendor/tesseract-core-lstm.wasm','vendor/spa.traineddata.gz','vendor/eng.traineddata.gz'];
  const ready=(await Promise.all(required.map(url=>cache.match(url)))).every(Boolean);
  toast(ready?'Preparación sin conexión completada, incluidos español e inglés':'Faltan recursos de la versión 2.2. Abre la app con conexión.',!ready);
};
A.checkUpdate=async()=>{
  const reg=await navigator.serviceWorker?.getRegistration();if(!reg)throw Error('Instala primero la PWA desde HTTPS o localhost');
  await reg.update();
  let worker=reg.installing;
  if(worker&&worker.state!=='installed')await new Promise(resolve=>worker.addEventListener('statechange',()=>{if(['installed','activated','redundant'].includes(worker.state))resolve()}));
  if(reg.waiting){modal('<h2>Actualización preparada</h2><p>Se recargará la aplicación. Podrás reanudar tus sesiones guardadas.</p><button data-a="applyUpdate">Aplicar y recargar</button> <button data-a="close">Más tarde</button>')}
  else toast('Tienes la versión disponible');
};
A.applyUpdate=async()=>{
  const reg=await navigator.serviceWorker.getRegistration();
  if(reg?.waiting){navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});reg.waiting.postMessage('ACTIVAR_TESTCLAU')}
};
A.breakStudy=()=>{modal('<h2>Descanso</h2><p>La sesión está guardada. El contador queda en pausa mientras descansas.</p><button data-a="close">Continuar</button> <button data-a="home2">Volver a Inicio</button>')};
function subjectProgress(){
  const groups=new Map();
  for(const q of valid()){const key=q.tema||q.modulo||'Sin materia';const g=groups.get(key)||[0,0];g[0]++;if(q.st.seen>=2&&q.srs.box>=2&&q.srs.due>Date.now())g[1]++;groups.set(key,g)}
  if(!groups.size)return '';
  return '<details class="card"><summary>Dominio por materia</summary><p class="sm">Dos avances de repaso y plazo vigente.</p>'+[...groups].map(([k,[total,retained]])=>`<p>${esc(k)} · ${retained} de ${total}</p>`).join('')+'</details>';
}
function fieldFilters(){
  const keys=['modulo','ATA','UD','RA','dificultad','carpeta'];
  const pool=curQs();
  return '<details><summary>Filtrar por campo</summary>'+keys.map(k=>{
    const values=[...new Set(pool.map(q=>q[k]||(k==='dificultad'?q.diff:'')).filter(Boolean))].sort();
    return `<label>${esc(k)}<select id="filter-${k}"><option value="">Todos</option>${values.map(v=>`<option value="${esc(v)}" ${S.filters?.[k]===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;
  }).join('')+'</details>';
}

document.addEventListener('change',e=>{if(e.target.id==='ocrLanguage'&&['spa+eng','spa','eng'].includes(e.target.value)){S.prof.ocrLang=e.target.value;dispatchAction(()=>saveProf(),{},e)}});
