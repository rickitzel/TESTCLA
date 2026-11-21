# Esquema de datos

Base IndexedDB `testmaster` (versión 1). Todos los almacenes usan `id` como clave. Los identificadores son UUID (`crypto.randomUUID`) salvo `profile`.

## Almacenes

| Almacén | Contenido |
|---|---|
| `docs` | Documentos lógicos |
| `versions` | Versiones procesadas de cada documento (páginas, fragmentos, índice) |
| `questions` | Banco de preguntas con evidencia, validación y estadísticas |
| `sessions` | Exámenes abiertos y finalizados |
| `kv` | Perfil del usuario (`id: "profile"`) |
| `audit` | Registro de auditoría y trabajos de generación |
| `files` | PDF originales (Blob), clave = id de versión |

### `docs`
```
id, name, created, vcount, cur   // cur = id de la versión vigente
```

### `versions`
```
id, docId, n, hash (SHA-256), size, processed, extractor, ocr, status,
pages:    [{ n, text, src: native|ocr|text, conf, flag }]
chunks:   [{ id, page, sec, text }]
sections: [{ title, page }]
```
`flag` contiene el motivo cuando la página tiene calidad dudosa; esas páginas no generan fragmentos.

### `questions`
```
id, vid, docId, kind: number|list|cloze|ext
q, opts[4], ans (0-3), expl, diff: facil|media|dificil
ev: { vid, page, chunkId, quote }          // evidencia documental
meta: { target, sentence }                  // solo generadas
state: draft|pending_validation|validated|rejected|needs_review|archived
score, checks: [{ name, ok, crit, why }], reasons[]
created, validatedAt, reviewedBy, prevState
srs: { box (0-5), due }                     // repaso espaciado (Leitner)
st:  { seen, ok, ko, last }                 // estadísticas individuales
fav
```

### `sessions`
Abierta: `{ id, status: "open", run, ts }`.
Finalizada: `{ id, status: "final", final: true, mode, res: { ok, total, pct, det: [{ id, a, good }], bonus }, ts, secs }`.

### `kv` (perfil)
```
id: "profile", xp, streak, best, lastDay, todayDay, todayN,
exams, correct, answered, perfect, sound, ocr, goal
```

### `audit`
```
id, ts, type: doc|job|error|review, msg
// type "job": proposed, validated, rejected, pending, reasons{motivo:n}, ms, tokens, cost
```

## Equivalencias con el Anexo V2 (apartado 10)

| Tabla del Anexo | Dónde está |
|---|---|
| `document_versions` | `versions` |
| `content_sections` | `versions.sections` (embebido) |
| `question_validations` | `questions.checks`, `score`, `reasons`, `validatedAt` |
| `question_evidence` | `questions.ev` |
| `question_usage` | `questions.st`, `questions.srs` y `sessions` |
| `generation_jobs` | `audit` con `type: "job"` |
| `usage_quotas` | No aplica (no hay llamadas de pago) |
| `sync_events` | No implementado; la importación fusiona por marca temporal |
| `audit_logs` | `audit` |

## Formato de copia de seguridad

```json
{ "format": "testmaster-v1", "created": "ISO-8601", "sha256": "…", "data": "<JSON serializado de todos los almacenes>" }
```
`sha256` es la huella del campo `data`; al importar se recalcula y, si no coincide, se rechaza la copia. Los PDF originales (`files`) **no** se incluyen todavía.

## Formato de importación de preguntas externas

```json
[{ "q": "enunciado", "opts": ["A", "B", "C", "D"], "ans": 0,
   "expl": "explicación", "page": 1, "quote": "cita literal", "diff": "media" }]
```
`ans` puede ser un índice 0–3 o una letra A–D. Las alternativas pueden llevar prefijo «A)».
