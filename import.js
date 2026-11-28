let activeImport=null, previewDecision=null;
function checkImport(){if(activeImport&&Date.now()-activeImport.started>300000)throw Error('Se ha alcanzado el límite de cinco minutos. Divide el examen en archivos más pequeños.');if(activeImport?.cancelled)throw Error('Importación cancelada')}
function workerParse(data){
  const job=activeImport;
  return new Promise((resolve,reject)=>{
    const w=new Worker('parser-worker.js');
    const stop=error=>{clearTimeout(timer);w.terminate();job.stop=null;error&&reject(error)};
    const timer=setTimeout(()=>stop(Error('Tiempo de análisis agotado')),90000);
    job.stop=()=>stop(Error('Importación cancelada'));
    w.onerror=e=>stop(Error(e.message));
    w.onmessage=({data})=>{stop();data.error?reject(Error(data.error)):resolve(data)};
    w.postMessage(data);
  });
}
function diagnose(rows,existing,pages){
  const seen=new Map(), issues=[];
  const key=q=>norm(q.q), signature=q=>JSON.stringify(q.opts.map(optionNorm));
  for(const q of [...existing,...rows]){
    const k=key(q);
    if(!seen.has(k))seen.set(k,[]);
    seen.get(k).push(q);
  }
  const variants=new Map([...seen].filter(([,g])=>g.length>1).map(([k,g])=>[k,new Set(g.map(q=>JSON.stringify([signature(q),q.ans])))]));
  const scanned=pages.some(p=>p.src==='ocr'||p.flag);
  for(const q of rows){
    const group=seen.get(key(q));
    if(group.length>1){
      const same=variants.get(key(q)).size===1;
      q.reasons.push(same?'Duplicado exacto':'Coincidencia de enunciado con opciones o clave distintas');
    }
    if(scanned)q.reasons.push('Transcripción OCR o página dudosa. Contrasta el texto y la clave con el PDF.');
    if(q.reasons.length){q.state='needs_review';q.score=0;issues.push(q)}
  }
  return issues;
}
async function preview(rows,issues){
  let page=0;
  function show(){
    const items=issues.slice(page,page+25);
    modal(`<h2>Revisar importación</h2><p>${rows.length} preguntas · ${rows.length-issues.length} listas · ${issues.length} pendientes</p>
    ${items.map(q=>`<p><b>N.º ${q.sourceNumber}</b> ${esc(q.q)}<br>${esc(q.reasons.join(' · '))}</p>`).join('')}
    <div class="row wrap">${page?'<button data-a="prevIssues">Anteriores</button>':''}${page+25<issues.length?'<button data-a="nextIssues">Siguientes</button>':''}
    <button data-a="keepAll">Conservar todas</button>${issues.length<rows.length?'<button data-a="keepValid">Solo las listas</button>':''}<button data-a="cancelPreview">Cancelar</button></div>`);
  }
  const answer=new Promise(resolve=>{previewDecision=choice=>{previewDecision=null;S.modal=null;resolve(choice)}});
  A.prevIssues=()=>{page-=25;show()};A.nextIssues=()=>{page+=25;show()};
  show();return answer;
}
Object.assign(A,{
  cancelJob(){if(activeImport){activeImport.cancelled=true;activeImport.stop?.();if(previewDecision)previewDecision('cancel')}},
  keepAll:()=>previewDecision?.('all'),keepValid:()=>previewDecision?.('valid'),cancelPreview:()=>previewDecision?.('cancel')
});
const closeNormally=A.mbg;
A.mbg=(d,e)=>{if(previewDecision)return;closeNormally(d,e)};
async function ingest(file){
  if(activeImport)return;
  activeImport={cancelled:false,started:Date.now()};
  try{
    if(!file.size||file.size>32*1024*1024)throw Error('El archivo debe ocupar entre 1 byte y 32 MiB');
    progress('Leyendo examen…',0.05);
    const buf=await file.arrayBuffer(),hash=await sha256(buf);checkImport();
    const prior=S.vers.find(v=>v.hash===hash);
    if(prior&&S.qs.some(q=>q.vid===prior.id)){toast('El archivo ya existe. Puedes recuperar sus pendientes en Biblioteca.');return}
    const head=new TextDecoder().decode(buf.slice(0,1024)),pdf=head.includes('%PDF-'),json=!pdf&&(/^\s*[{[]/.test(head)||/\.json$/i.test(file.name));
    if(!pdf&&/\.pdf$/i.test(file.name))throw Error('Cabecera PDF inválida');
    let pages,text;
    if(pdf){({pages}=await extractPdf(buf,progress))}
    else{text=new TextDecoder('utf-8',{fatal:true}).decode(buf)}
    checkImport();progress('Comprobando preguntas y claves…',.8);
    const result=await workerParse({text,pages,json});pages=result.pages;
    let rows=result.rows;
    if(!rows.length||rows.length>10000)throw Error('Se admiten de 1 a 10.000 preguntas numeradas por archivo. Comprueba el formato y las páginas escaneadas.');
    const issues=diagnose(rows,S.qs,pages);
    if(issues.length){progress(null);const action=await preview(rows,issues);if(action==='cancel')return;activeImport.started=Date.now();if(action==='valid')rows=rows.filter(q=>q.state==='validated')}
    checkImport();progress('Guardando examen…',1);
    const res=prior?await saveProvidedQuestions(prior,rows):await registerVersion(file.name,hash,pages,buf.byteLength,pdf?new Blob([buf],{type:'application/pdf'}):null,rows,json?text:null);
    toast(`${res.total} guardadas · ${res.ok} con clave · ${res.pending} pendientes`);
  }catch(e){toast(e.message,true)}
  finally{activeImport=null;progress(null)}
}
function ingestText(name,text){return ingest(new File([text],name||'Examen pegado.txt',{type:'text/plain'}))}
