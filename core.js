
const uid=()=>(globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():'id'+Date.now().toString(36)+Math.random().toString(36).slice(2,10));
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9%€\s]/g,' ').replace(/\s+/g,' ').trim();
function rng(seed){let a=seed>>>0||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const shuffle=(arr,r)=>{const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const toks=s=>new Set(norm(s).split(' ').filter(w=>w.length>2));
const jacc=(a,b)=>{const A=toks(a),B=toks(b);let i=0;A.forEach(x=>{if(B.has(x))i++});return A.size+B.size-i?i/(A.size+B.size-i):0};
function cleanText(t){return t.replace(/\r/g,'').replace(/([a-záéíóúñ])-\n([a-záéíóúñ])/g,'$1$2').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim()}
// Heurística conservadora: detecta texto corrupto antes de crear preguntas.
function textQuality(t){
  if(!t||!t.trim())return 0;
  const letters=(t.match(/[a-záéíóúüñ]/gi)||[]).length;
  const bad=(t.match(/[�□■]|\(cid:\d+\)/g)||[]).length;
  const words=t.match(/[a-záéíóúüñ]{2,}/gi)||[];
  const strange=(t.match(/[^\p{L}\p{N}\s.,;:()¿?¡!%€ºª\-–—/\[\]"'«»]/gu)||[]).length;
  return Math.max(0,Math.min(1,letters/Math.max(1,t.length)*1.5 -bad*0.12-strange/Math.max(1,t.length)*2+(words.length>=8?0.12:0)));
}
function simpleExplanation(sentence,correct,page){
  const clean=sentence.replace(/\s+/g,' ').trim();
  const brief=clean.length>210?clean.slice(0,207).replace(/\s+\S*$/,'')+'…':clean;
  return `Respuesta correcta: ${correct}. Explicación basada en el texto: «${brief}» (página ${page}).`;
}
const HEAD=/^(art[ií]culo|cap[ií]tulo|t[ií]tulo|tema|secci[oó]n|anexo|disposici[oó]n)\b.{0,90}$/i;
function isHeading(l){l=l.trim();return l.length>2&&l.length<=90&&(HEAD.test(l)||(l===l.toUpperCase()&&/[A-ZÁÉÍÓÚÑ]{4}/.test(l)&&!/[.]$/.test(l)))}
function sentences(t){
  const p=t.replace(/\b(art|arts|núm|pág|págs|apdo|ap|Sr|Sra|Dr|etc|ej|vs)\.\s/gi,m=>m.replace('.','\u2024')).replace(/(\d)\.(\d)/g,'$1\u2024$2');
  const m=p.replace(/\s+/g,' ').match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];
  return m.map(s=>s.replace(/\u2024/g,'.').trim()).filter(s=>s.length>=40&&s.length<=320);
}
function buildChunks(vid,pages){
  const chunks=[],sections=[];
  pages.forEach(p=>{
    if(p.flag)return;let sec='',buf=[];
    const flush=()=>{sentences(buf.join(' ')).forEach(s=>chunks.push({id:vid+'-'+p.n+'-'+chunks.length,page:p.n,sec,text:s}));buf=[]};
    p.text.split('\n').forEach(l=>{if(isHeading(l)){flush();sec=l.trim();sections.push({title:sec,page:p.n})}else if(l.trim())buf.push(l.trim())});
    flush();
  });
  return{chunks,sections};
}
const _dn=new WeakMap();
function docNorm(ver){let v=_dn.get(ver);if(!v){v=ver.pages.map(p=>norm(p.text)).join(' ');_dn.set(ver,v)}return v}
const NUM=/(\d{1,4})\s*(días hábiles|días naturales|días|día|meses|mes|años|año|horas|hora|semanas|semana|euros|%|por ciento|puntos|metros|km|kg)(?![a-záéíóúñ])/i;
const SG={'día':'día','días':'día','año':'año','años':'año','mes':'mes','meses':'mes','semana':'semana','semanas':'semana','hora':'hora','horas':'hora'},PLU={'día':'días','año':'años','mes':'meses','semana':'semanas','hora':'horas'};
const inflect=(u,v)=>{const k=SG[u.toLowerCase()];return k?(v===1?k:PLU[k]):u};
function variantInDoc(docN,sentence,target,rep){
  const nr=norm(sentence.replace(target,rep)),nrep=norm(rep),i=nr.indexOf(nrep);
  if(i<0||!nrep)return true;
  return docN.includes(nr.slice(Math.max(0,i-30),i+nrep.length+30));
}
function parseList(t){
  const i=t.indexOf(':');if(i<10||i>200)return null;
  const head=t.slice(0,i).trim(),rest=t.slice(i+1).replace(/[.;]\s*$/,'');
  const raw=rest.split(/\s*[,;]\s*|\s+y\s+/);
  const items=raw.map(x=>x.replace(/^[a-z0-9]{1,2}[).]\s*/i,'').trim()).filter(x=>x.length>=2&&x.length<=40&&x.split(' ').length<=3);
  return items.length>=3&&items.length===raw.length?{head,items}:null;
}
function genQuestions(ver,max=80){
  const r=rng(parseInt((ver.hash||'1').slice(0,8),16)||1),docN=docNorm(ver),chunks=ver.chunks;
  const freq={};chunks.forEach(c=>(c.text.match(/[A-Za-zÁÉÍÓÚÑáéíóúñü]{7,}/g)||[]).forEach(w=>{const k=w.toLowerCase();freq[k]=(freq[k]||0)+1}));
  const vocab=Object.keys(freq),pool=[];
  chunks.forEach(c=>{const L=parseList(c.text);if(L)L.items.forEach(i=>pool.push({i,c:c.id}))});
  const mk=(c,kind,diff,qtext,correct,ds)=>{
    const opts=shuffle([correct,...ds.slice(0,3)],r);
    return{id:uid(),vid:ver.id,docId:ver.docId,kind,q:qtext,opts,ans:opts.indexOf(correct),
      expl:simpleExplanation(c.text,correct,c.page),
      ev:{vid:ver.id,page:c.page,chunkId:c.id,quote:c.text},diff,meta:{target:correct,sentence:c.text},
      state:'draft',created:Date.now(),srs:{box:0,due:0},st:{seen:0,ok:0,ko:0,last:0},fav:false};
  };
  const tryNum=c=>{
    const m=c.text.match(NUM);if(!m||c.text.split(m[0]).length!==2)return null;
    const n=+m[1],inf=!!SG[m[2].toLowerCase()];
    const cand=[...new Set([n*2,Math.max(1,Math.round(n/2)),n+5,n+10,n+1,Math.max(1,n-5),n*3,n+15,n+2])].filter(v=>v!==n&&v>0&&(inf||v!==1));
    const ds=[];
    for(const v of shuffle(cand,r)){const o=String(v)+m[0].slice(m[1].length).replace(m[2],inflect(m[2],v));if(!variantInDoc(docN,c.text,m[0],o))ds.push(o);if(ds.length===3)break}
    if(ds.length<3)return null;
    return mk(c,'number','media',`Complete correctamente el texto: «${c.text.replace(m[0],'_____')}»`,m[0],ds);
  };
  const tryList=c=>{
    const L=parseList(c.text);if(!L)return null;
    const it=shuffle(L.items,r)[0],nt=norm(c.text),wc=it.split(' ').length,sameHead=chunks.filter(x=>norm(x.text).startsWith(norm(L.head).slice(0,25))).map(x=>norm(x.text)).join(' ');
    const ds=[];
    for(const p of shuffle(pool.filter(p=>p.c!==c.id&&p.i.split(' ').length===wc),r)){
      const n=norm(p.i);if(!nt.includes(n)&&!sameHead.includes(n)&&!ds.some(d=>norm(d)===n))ds.push(p.i);if(ds.length===3)break}
    if(ds.length<3)return null;
    return mk(c,'list','dificil',`Según el texto, ¿cuál de estos elementos pertenece a la enumeración «${L.head}»?`,it,ds);
  };
  const tryCloze=c=>{
    const ws=(c.text.match(/[A-Za-zÁÉÍÓÚÑáéíóúñü]{8,}/g)||[]).filter(w=>c.text.indexOf(w)>0&&c.text.split(w).length===2);
    if(!ws.length)return null;
    const w=shuffle(ws,r)[0],cap=w[0]!==w[0].toLowerCase(),nt=norm(c.text),ds=[];
    for(const v of shuffle(vocab.filter(v=>Math.abs(v.length-w.length)<=3&&v.slice(0,4)!==w.slice(0,4).toLowerCase()&&!nt.includes(norm(v))),r)){
      const d=cap?v[0].toUpperCase()+v.slice(1):v;
      if(!variantInDoc(docN,c.text,w,d))ds.push(d);if(ds.length===3)break}
    if(ds.length<3)return null;
    return mk(c,'cloze',(freq[w.toLowerCase()]||1)>2?'facil':'media',`Complete la frase: «${c.text.replace(w,'_____')}»`,w,ds);
  };
  const out=[];
  for(const c of shuffle(chunks,r)){if(out.length>=max)break;const q=tryNum(c)||tryList(c)||tryCloze(c);if(q)out.push(q)}
  return out;
}

// Importa exámenes ya redactados: conserva enunciado, orden A-D, clave y explicación.
const optionNorm=value=>String(value).normalize('NFC').trim().toLocaleLowerCase('es').replace(/\s+/g,' ');
function providedRow(x,letter,reason='',expl=''){
  const opts=Array.from({length:4},(_,i)=>String(x.opts[i]||'').trim());
  const validKey=typeof letter==='string'&&/^[A-D]$/.test(letter)&&!reason&&opts.every(Boolean)&&new Set(opts.map(optionNorm)).size===4&&!!x.q.trim();
  return {id:uid(),keySource:'documento',academic:false,vid:null,docId:null,kind:'provided',sourceOrder:x.number,sourceNumber:x.number,q:x.q.trim(),opts,ans:validKey?'ABCD'.indexOf(letter):null,answerLetter:validKey?letter:'',expl:expl||(validKey?'Respuesta indicada en el documento.':'Requiere revisión.'),ev:{vid:null,page:x.page,chunkId:null,quote:x.q+' '+opts.map((o,i)=>'ABCD'[i]+') '+o).join(' ')},diff:'media',state:validKey?'validated':'needs_review',score:validKey?100:0,checks:[],reasons:validKey?[]:[reason||'Opciones incompletas, duplicadas o clave ausente'],created:Date.now(),srs:{box:0,due:0},st:{seen:0,ok:0,ko:0,last:0},fav:false};
}
function parseProvidedExam(pages){
  const rows=[], keys=new Map(), explanations=new Map();let cur=null,opt=-1,section='questions',lastExplanation=null;
  const flush=()=>{if(cur){if(rows.length>=10000)throw Error('Máximo 10.000 preguntas por archivo');rows.push(cur)}cur=null;opt=-1};
  for(const pg of pages.filter(Boolean))for(const raw of pg.text.split(/\n/)){
    const l=raw.trim();if(!l)continue;
    if(/^(?:INICIO_RESPUESTAS|plantilla de respuestas|clave de respuestas|respuestas correctas|respuestas)\s*:?$/i.test(l)){flush();section='keys';continue}
    if(/^FIN_RESPUESTAS$/i.test(l)){section='end';continue}
    if(/^soluciones explicadas\s*:?$/i.test(l)){flush();section='expl';continue}
    if(section==='keys'){for(const m of l.matchAll(/(?:^|[\s,;])(\d{1,6})\s*(?:[=.:)–-]\s*|\s+)([A-Z])(?=\s|$|[,;])/gi)){const n=+m[1],v=m[2].toUpperCase();if(!keys.has(n))keys.set(n,new Set());keys.get(n).add(v)}continue}
    if(section==='expl'){const m=l.match(/^(\d{1,6})[.)]\s*([A-D])[.)]\s*(.*)$/i);if(m){const n=+m[1],letter=m[2].toUpperCase(),prev=explanations.get(n);lastExplanation=n;explanations.set(n,{letter:prev&&prev.letter!==letter?'?':letter,text:m[3]})}else if(lastExplanation!==null&&!/^Módulo +\d/i.test(l))explanations.get(lastExplanation).text+=' '+l;continue}
    if(section!=='questions'||/^Módulo +\d+ *(?:[·|–-]|$)/i.test(l))continue;
    if(/^(?:TESTCLAU V1|TOTAL_PREGUNTAS\s*:.*|página\s+\d+(?:\s+de\s+\d+)?)$/i.test(l))continue;
    const q=l.match(/^(\d{1,6})[.)]\s+(.+)$/),o=l.match(/^([A-D])[).:]\s*(.*)$/i);
    if(q){flush();cur={number:+q[1],q:q[2],opts:[],page:pg.n};continue}
    if(cur&&o){opt='ABCD'.indexOf(o[1].toUpperCase());if(cur.opts[opt]!==undefined)cur.reason='Opción repetida';cur.opts[opt]=o[2];continue}
    if(cur&&opt>=0)cur.opts[opt]+=' '+l;else if(cur)cur.q+=' '+l;
  }
  flush();const declared=pages.filter(Boolean).map(p=>p.text).join('\n').match(/TOTAL_PREGUNTAS\s*:\s*(\d+)/i);if(declared&&(rows.length!==+declared[1]||rows.some((r,i)=>r.number!==i+1)))throw new Error('Total o numeración no coincide con TOTAL_PREGUNTAS');const counts=new Map();for(const r of rows)counts.set(r.number,(counts.get(r.number)||0)+1);
  const orphan=[...keys.keys()].find(n=>!counts.has(n));return rows.sort((a,b)=>a.number-b.number).map(r=>{const k=keys.get(r.number),e=explanations.get(r.number),letter=k?.size===1&&/^[A-D]$/.test([...k][0])?[...k][0]:'';return providedRow(r,letter,r.reason||(orphan!==undefined?'Plantilla con número de pregunta inexistente: '+orphan:'')||(counts.get(r.number)>1?'Numeración duplicada':k?.size>1?'Claves contradictorias':!letter?'No aparece en la plantilla de respuestas':e&&e.letter!==letter?'Explicación contradice la clave':''),e?.text)});
}
function parseExamJSON(text){
  const d=JSON.parse(text.replace(/^\uFEFF/,''));if(!d||d.formato!=='TESTCLAU'||d.version!==1||!Array.isArray(d.preguntas)||d.total_preguntas!==d.preguntas.length||!d.preguntas.length||d.preguntas.length>10000)throw new Error('JSON TESTCLAU V1 inválido o total incorrecto');
  return d.preguntas.map((x,i)=>{if(!x||x.id!==i+1||typeof x.pregunta!=='string'||!x.opciones||Array.isArray(x.opciones)||Object.keys(x.opciones).some(k=>!['A','B','C','D'].includes(k))||!['A','B','C','D'].every(k=>typeof x.opciones[k]==='string'))throw new Error('Estructura incorrecta en pregunta '+(i+1));const row=providedRow({number:x.id,q:x.pregunta,opts:['A','B','C','D'].map(k=>x.opciones[k]),page:1},x.correcta,'',typeof x.explicacion==='string'?x.explicacion:'');for(const key of ['tema','modulo','ATA','UD','RA','dificultad','referencia','carpeta'])if(typeof x[key]==='string')row[key]=x[key];return row});
}
async function saveProvidedQuestions(ver,parsed){
  let ok=0,pending=0;
  for(const q of parsed){q.vid=ver.id;q.docId=ver.docId;q.ev.vid=ver.id;if(q.state==='validated')ok++;else pending++}
  await atomicWrite(['questions'],tx=>parsed.forEach(q=>tx.objectStore('questions').put(q)));
  await audit('job',`Importación de examen: ${parsed.length} preguntas, ${ok} con clave, ${pending} pendientes`,{proposed:parsed.length,validated:ok,rejected:0,pending,ms:0,tokens:0,cost:0});
  await load();return{total:parsed.length,ok,pending};
}

function verifyQ(q,ver,others){
  const ck=[],add=(name,ok,crit,why)=>ck.push({name,ok:!!ok,crit:crit!==false,why:why||name});
  const fin=()=>{
    const bad=ck.filter(c=>!c.ok),crit=bad.filter(c=>c.crit),soft=bad.filter(c=>!c.crit);
    let score=100-soft.length*10-(crit.length?50:0),state;
    if(!crit.length&&score>=90)state='validated';
    else if(q&&q.kind==='ext'&&crit.length===1&&crit[0].name==='respuesta_respaldada_humana')state='pending_validation';
    else state=crit.length?'rejected':'needs_review';
    return{checks:ck,score,state,reasons:bad.map(b=>b.why)};
  };
  const sch=q&&typeof q.q==='string'&&q.q.length>=10&&Array.isArray(q.opts)&&q.opts.length===4&&q.opts.every(o=>typeof o==='string'&&o.trim())&&Number.isInteger(q.ans)&&q.ans>=0&&q.ans<4&&q.ev&&typeof q.ev.quote==='string'&&Number.isInteger(q.ev.page);
  add('esquema',sch,true,'Esquema de datos inválido');
  if(!sch)return fin();
  add('version',q.vid===ver.id,true,'Versión del documento no coincide');
  const pg=ver.pages.find(p=>p.n===q.ev.page);
  add('pagina_valida',pg&&!pg.flag,true,'Página inexistente o con calidad dudosa');
  const pn=pg?norm(pg.text):'',nq=norm(q.ev.quote);
  add('fragmento_en_pagina',nq.length>=20&&pn.includes(nq),true,'La cita no aparece en la página indicada');
  if(q.ev.chunkId)add('fragmento_existe',ver.chunks.some(c=>c.id===q.ev.chunkId&&norm(c.text).includes(nq)),true,'Fragmento inexistente');
  add('opciones_unicas',new Set(q.opts.map(norm)).size===4,true,'Alternativas repetidas');
  const cor=norm(q.opts[q.ans]);
  if(q.kind==='ext'){add('respuesta_respaldada_humana',false,true,'Requiere revisión humana')}
  else{
    add('respuesta_respaldada',cor&&nq.includes(cor),true,'La respuesta correcta no está respaldada por la cita');
    add('distractores_fuera_del_texto',q.opts.every((o,i)=>i===q.ans||!nq.includes(norm(o))),true,'Un distractor aparece en la fuente');
    if(q.kind!=='list'&&q.meta){const dn=docNorm(ver);add('distractor_no_valido_en_doc',q.opts.every((o,i)=>i===q.ans||!variantInDoc(dn,q.meta.sentence,q.meta.target,o)),true,'Un distractor podría ser correcto según el documento')}
  }
  add('explicacion_fiel',typeof q.expl==='string'&&q.expl.trim().length>=35,false,'Explicación insuficiente');
  add('sin_duplicado',!(others||[]).some(o=>o.id!==q.id&&o.state!=='rejected'&&jacc(q.q+' '+q.opts[q.ans],o.q+' '+o.opts[o.ans])>0.85),true,'Pregunta duplicada');
  add('longitud',q.q.length<=420,false,'Enunciado demasiado largo');
  return fin();
}
const INTERVALS=[0,3,7,15,30,60];
function srsUpdate(q,ok,now=Date.now(),doubt=false,intervals=INTERVALS){q.st.seen++;q.st.last=now;if(ok){q.st.ok++;q.srs.box=doubt?0:Math.min(5,q.srs.box+1)}else{q.st.ko++;q.srs.box=0}q.srs.due=now+(ok&&doubt?1:intervals[q.srs.box])*864e5}
function pickExam(pool,n,r,now=Date.now()){
  const sc=new Map(pool.map(q=>[q.id,((q.srs.due<=now&&q.st.seen>0)?3:0)+(q.st.ko>0&&q.st.ok<=q.st.ko?2:0)+(q.st.seen===0?1.5:0)-((now-q.st.last)<3*864e5&&q.st.seen>0?2:0)+r()]));
  const sorted=pool.slice().sort((a,b)=>sc.get(b.id)-sc.get(a.id)),groups={};
  sorted.forEach(q=>(groups[q.ev.page]=groups[q.ev.page]||[]).push(q));
  const keys=shuffle(Object.keys(groups),r),out=[];
  while(out.length<n&&keys.some(k=>groups[k].length))for(const k of keys)if(groups[k].length&&out.length<n)out.push(groups[k].shift());
  return shuffle(out,r);
}
const levelOf=xp=>Math.floor(Math.sqrt(xp/60))+1;
function txtPages(text){
  const t=cleanText(text),paras=t.split(/\n\s*\n/),pages=[];let cur='';
  paras.forEach(p=>{if(cur.length+p.length>2800&&cur){pages.push(cur);cur=''}cur+=(cur?'\n\n':'')+p});if(cur)pages.push(cur);
  return pages.map((x,i)=>({n:i+1,text:x,src:'text',conf:null,flag:false}));
}
