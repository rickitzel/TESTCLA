importScripts('core.js');

// La entrada normal sigue el protocolo estricto. Ante anomalías recuperables,
// cada fila conserva la numeración de origen y queda disponible para edición.
function readJSON(text){
  try{return parseExamJSON(text)}catch(strictError){
    const doc=JSON.parse(text.replace(/^\uFEFF/,''));
    if(doc?.formato!=='TESTCLAU'||doc.version!==1||!Array.isArray(doc.preguntas)||!doc.preguntas.length||doc.preguntas.length>10000)throw strictError;
    return doc.preguntas.map((raw,i)=>{
      const x=raw&&typeof raw==='object'?raw:{};
      const reasons=[];
      if(doc.total_preguntas!==doc.preguntas.length)reasons.push('El total declarado difiere del número de filas');
      if(x.id!==i+1)reasons.push('Identificador ausente o fuera de secuencia en la fila '+(i+1));
      if(typeof x.pregunta!=='string')reasons.push('Enunciado ausente');
      if(!x.opciones||Object.keys(x.opciones).length!==4)reasons.push('Se requieren cuatro opciones A–D');
      const opts=Array.from('ABCD',k=>typeof x.opciones?.[k]==='string'?x.opciones[k]:'');
      const row=providedRow({number:Number.isSafeInteger(x.id)?x.id:i+1,q:typeof x.pregunta==='string'?x.pregunta:'',opts,page:1},x.correcta,reasons.join(' · '),typeof x.explicacion==='string'?x.explicacion:'');
      for(const k of ['tema','modulo','ATA','UD','RA','dificultad','referencia','carpeta'])if(typeof x[k]==='string')row[k]=x[k];
      return row;
    });
  }
}
self.onmessage=({data})=>{
  try{
    let {text,pages,json}=data;
    if(json){
      const rows=readJSON(text);
      pages=txtPages(rows.map(q=>q.sourceNumber+'. '+q.ev.quote).join('\n\n'));
      let index=0;for(const p of pages){for(const para of p.text.split(/\n\n/)){if(index<rows.length)rows[index++].ev.page=p.n}}
      self.postMessage({pages,rows});
    }else{
      pages=pages||txtPages(text);
      try{self.postMessage({pages,rows:parseProvidedExam(pages)})}
      catch(e){
        if(!e.message.includes('TOTAL_PREGUNTAS'))throw e;
        const cleaned=pages.map(p=>({...p,text:p.text.replace(/^TOTAL_PREGUNTAS\s*:\s*\d+\s*$/gim,'')}));
        const rows=parseProvidedExam(cleaned);
        if(!rows.length)throw e;
        for(const q of rows){q.state='needs_review';q.reasons.push('Total o numeración incompatible con el encabezado del examen')}
        self.postMessage({pages,rows});
      }
    }
  }catch(error){self.postMessage({error:error.message})}
};
