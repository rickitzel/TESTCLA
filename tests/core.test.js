// Pruebas del núcleo (generador, verificador, repaso espaciado, selección de examen).
// El núcleo vive dentro de index.html entre //CORE-START y //CORE-END; se carga sin navegador.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const core = html.split('//CORE-START')[1].split('//CORE-END')[0];
const T = new Function(core + ';return {uid,norm,genQuestions,verifyQ,buildChunks,txtPages,pickExam,rng,srsUpdate,levelOf,jacc,INTERVALS}')();

const TEXTO = `TÍTULO I. DISPOSICIONES GENERALES

Artículo 1. El plazo para presentar la reclamación administrativa previa será de 30 días desde la notificación del acto impugnado por el interesado.
Artículo 2. La administración resolverá el procedimiento ordinario en un plazo máximo de 6 meses desde la fecha de entrada de la solicitud en el registro.

Artículo 3. Son órganos de la administración local: el alcalde, los tenientes de alcalde, el pleno y la junta de gobierno local del municipio.
El presidente de la comisión informativa convocará las sesiones ordinarias con una antelación mínima de 48 horas respecto de la fecha prevista.
La responsabilidad patrimonial prescribe al año de producirse el hecho que motive la indemnización reclamada por el particular afectado.
La autoridad competente podrá acordar medidas provisionales cuando existan indicios razonables de incumplimiento sustancial de las obligaciones.
El interesado tendrá derecho a conocer el estado de tramitación de los procedimientos administrativos en los que tenga la condición de interesado.
La notificación electrónica se entenderá rechazada transcurridos 10 días naturales desde la puesta a disposición del contenido en la sede electrónica.
Los documentos originales presentados serán devueltos al interesado tras el cotejo realizado por el registro competente de la administración.
Son principios generales de actuación: legalidad, eficacia, transparencia, jerarquía y coordinación entre las distintas administraciones públicas.
`;

function montar(texto, id = 'v1', hash = 'abcdef0123') {
  const pages = T.txtPages(texto);
  const { chunks, sections } = T.buildChunks(id, pages);
  return { id, docId: 'd', hash, pages, chunks, sections };
}
const clone = (o) => JSON.parse(JSON.stringify(o));

test('el documento se divide en capítulos, fragmentos y páginas', () => {
  const ver = montar(TEXTO);
  assert.equal(ver.pages.length, 1);
  assert.ok(ver.chunks.length >= 8);
  assert.equal(ver.sections[0].title, 'TÍTULO I. DISPOSICIONES GENERALES');
  ver.chunks.forEach((c) => assert.ok(T.norm(ver.pages[0].text).includes(T.norm(c.text))));
});

test('las preguntas generadas superan todos los controles críticos', () => {
  const ver = montar(TEXTO);
  const qs = T.genQuestions(ver, 50);
  assert.ok(qs.length >= 8);
  const acc = [];
  for (const q of qs) {
    const r = T.verifyQ(q, ver, acc);
    assert.equal(r.state, 'validated', q.q + ' -> ' + r.reasons.join(', '));
    assert.ok(r.score >= 90);
    acc.push(q);
  }
});

test('el generador es determinista para un mismo documento', () => {
  const ver = montar(TEXTO);
  const a = T.genQuestions(ver, 50).map((q) => q.q + q.opts[q.ans]);
  const b = T.genQuestions(ver, 50).map((q) => q.q + q.opts[q.ans]);
  assert.deepEqual(a, b);
});

test('rechaza preguntas incorrectas aunque estén bien formadas', () => {
  const ver = montar(TEXTO);
  const base = T.genQuestions(ver, 50).find((q) => q.kind === 'number');
  assert.ok(base);
  const casos = {
    'respuesta falsa': (q) => { q.ans = (q.ans + 1) % 4; },
    'página inexistente': (q) => { q.ev.page = 99; },
    'cita inventada': (q) => { q.ev.quote = 'El plazo será de 45 días hábiles según la ley inventada del año dos mil.'; },
    'alternativas repetidas': (q) => { q.opts[1] = q.opts[0]; },
    'versión distinta': (q) => { q.vid = 'otra'; },
    'esquema roto': (q) => { delete q.opts; },
    'fragmento inexistente': (q) => { q.ev.chunkId = 'no-existe'; },
  };
  for (const [nombre, alterar] of Object.entries(casos)) {
    const q = clone(base);
    alterar(q);
    assert.equal(T.verifyQ(q, ver, []).state, 'rejected', nombre);
  }
});

test('rechaza preguntas duplicadas', () => {
  const ver = montar(TEXTO);
  const base = T.genQuestions(ver, 50)[0];
  const copia = clone(base);
  copia.id = 'otra-id';
  const r = T.verifyQ(copia, ver, [base]);
  assert.equal(r.state, 'rejected');
  assert.ok(r.reasons.includes('Pregunta duplicada'));
});

test('rechaza un distractor que también sería correcto según el documento', () => {
  const t = `Artículo 1. El plazo para presentar el recurso de alzada ordinario será de 30 días desde la notificación del acto.
Artículo 2. El plazo para presentar el recurso de alzada ordinario será de 15 días desde la notificación del acto.`;
  const ver = montar(t);
  const q = clone(T.genQuestions(ver, 20).find((x) => x.kind === 'number' && x.opts[x.ans] === '30 días'));
  assert.ok(q);
  q.opts[(q.ans + 1) % 4] = '15 días';
  const r = T.verifyQ(q, ver, []);
  assert.equal(r.state, 'rejected');
  assert.ok(r.reasons.includes('Un distractor podría ser correcto según el documento'));
});

test('páginas marcadas como dudosas no generan fragmentos ni preguntas', () => {
  const pages = [{ n: 1, text: TEXTO, src: 'ocr', conf: 40, flag: 'OCR de baja confianza (40%)' }];
  const { chunks } = T.buildChunks('v1', pages);
  assert.equal(chunks.length, 0);
});

test('importación externa: cita real queda pendiente de revisión humana, cita falsa se rechaza', () => {
  const ver = montar(TEXTO);
  const base = clone(T.genQuestions(ver, 50).find((q) => q.kind === 'number'));
  base.kind = 'ext';
  delete base.meta;
  assert.equal(T.verifyQ(clone(base), ver, []).state, 'pending_validation');
  const falsa = clone(base);
  falsa.ev.quote = 'Esta cita no aparece en ninguna página del documento original que se cargó.';
  assert.equal(T.verifyQ(falsa, ver, []).state, 'rejected');
});

test('los distractores numéricos concuerdan en singular/plural', () => {
  const t = `Artículo 9. La responsabilidad patrimonial de la administración prescribe a los 1 año de producirse el hecho que motive la indemnización reclamada.
Artículo 10. La resolución expresa deberá dictarse en el plazo de 3 meses desde el acuerdo de iniciación del procedimiento sancionador correspondiente.`;
  const ver = montar(t);
  const nums = T.genQuestions(ver, 20).filter((q) => q.kind === 'number');
  assert.ok(nums.length >= 1);
  for (const q of nums) {
    for (const o of q.opts) {
      assert.doesNotMatch(o, /\b1 (años|meses)\b/, o);
      assert.doesNotMatch(o, /\b([2-9]|\d{2,}) (año|mes)\b/, o);
    }
  }
});

test('repaso espaciado: acertar sube de caja y fallar la reinicia', () => {
  const q = { srs: { box: 0, due: 0 }, st: { seen: 0, ok: 0, ko: 0, last: 0 } };
  const t0 = 1_000_000_000_000;
  T.srsUpdate(q, true, t0);
  assert.equal(q.srs.box, 1);
  assert.equal(q.srs.due, t0 + T.INTERVALS[1] * 864e5);
  T.srsUpdate(q, true, t0);
  assert.equal(q.srs.box, 2);
  T.srsUpdate(q, false, t0);
  assert.equal(q.srs.box, 0);
  assert.equal(q.st.seen, 3);
  assert.equal(q.st.ok, 2);
  assert.equal(q.st.ko, 1);
});

test('el examen nunca supera lo pedido ni repite preguntas, y reparte por páginas', () => {
  const pool = Array.from({ length: 60 }, (_, i) => ({
    id: 'q' + i, ev: { page: (i % 6) + 1 },
    srs: { box: 0, due: 0 }, st: { seen: 0, ok: 0, ko: 0, last: 0 },
  }));
  const sel = T.pickExam(pool, 40, T.rng(7));
  assert.equal(sel.length, 40);
  assert.equal(new Set(sel.map((q) => q.id)).size, 40);
  const paginas = new Set(sel.map((q) => q.ev.page));
  assert.equal(paginas.size, 6);
  assert.equal(T.pickExam(pool.slice(0, 10), 40, T.rng(1)).length, 10);
});

test('nivel de usuario crece con la experiencia', () => {
  assert.equal(T.levelOf(0), 1);
  assert.equal(T.levelOf(60), 2);
  assert.equal(T.levelOf(240), 3);
});
