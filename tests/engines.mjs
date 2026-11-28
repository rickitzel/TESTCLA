// Integration check for the shipped engines. Node 24+ and @napi-rs/canvas.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const canvas=require('@napi-rs/canvas');
Object.assign(globalThis,{DOMMatrix:canvas.DOMMatrix,ImageData:canvas.ImageData,Path2D:canvas.Path2D});
const read=file=>fs.readFileSync(new URL(file,import.meta.url));
const pdf=await import('../vendor/pdf.min.mjs');
pdf.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdf.worker.min.mjs',import.meta.url).href;
const html=read('../index.html').toString();
const ctx=vm.createContext({console,document:{baseURI:new URL('../index.html',import.meta.url).href,createElement:()=>canvas.createCanvas(10,10)},URL,crypto,Date,TextEncoder,TextDecoder,Uint8Array,checkImport:()=>{},S:{prof:{ocr:true}},pdfLib:()=>pdf});
vm.runInContext(read('../core.js').toString(),ctx);
const pathFor=name=>fileURLToPath(new URL('../vendor/'+name+'/',import.meta.url));
ctx.pdfOptions=data=>({data,isEvalSupported:false,useSystemFonts:true,cMapUrl:pathFor('pdf-cmaps'),standardFontDataUrl:pathFor('pdf-fonts'),wasmUrl:pathFor('pdf-wasm'),cMapPacked:true});
const core=require('../vendor/tesseract-core-lstm.js');
ctx.ocrCanvas=async image=>{
  const wasm=await core({wasmBinary:read('../vendor/tesseract-core-lstm.wasm')});
  wasm.FS.writeFile('/eng.traineddata',zlib.gunzipSync(read('../vendor/eng.traineddata.gz')));
  const api=new wasm.TessBaseAPI();assert.equal(api.Init(null,'eng',1),0);
  wasm.FS.writeFile('/input',image.toBuffer('image/png'));assert.equal(api.SetImageFile(1,0),0);
  const text=api.GetUTF8Text(),conf=api.MeanTextConf();api.End();wasm.destroy(api);return {text,conf};
};
vm.runInContext(html.slice(html.indexOf('async function ocrPage'),html.indexOf('async function atomicWrite')),ctx);
for(const n of [10,50,80,100,200]){
  const parsed=await ctx.extractPdf(new Uint8Array(read('./fixtures/'+n+'.pdf')));
  const rows=ctx.parseProvidedExam(parsed.pages);
  const json=ctx.parseExamJSON(read('./fixtures/'+n+'.json').toString());
  const txt=ctx.parseProvidedExam(ctx.txtPages(read('./fixtures/'+n+'.txt').toString()));
  const project=rows=>JSON.stringify(rows.map(q=>[q.sourceNumber,q.q,q.opts,q.ans,q.state]));
  assert.equal(project(rows),project(json));assert.equal(project(rows),project(txt));assert.equal(rows.length,n);
  console.log('PDF real, TXT y JSON equivalentes:',n);
}
const {pages}=await ctx.extractPdf(new Uint8Array(read('./fixtures/scan.pdf')));
assert.equal(pages[0].src,'ocr',JSON.stringify(pages));
const rows=ctx.parseProvidedExam(pages);
assert.equal(rows.length,2,pages[0].text);
console.log('PDF escaneado, OCR local:',rows.length,'preguntas; confianza del motor',pages[0].conf,'; claves detectadas',rows.map(q=>q.answerLetter));
