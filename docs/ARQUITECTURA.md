# Arquitectura

## Decisión base: local-first, coste cero

El Anexo V2 original asumía servidor, base de datos remota y llamadas a Claude. Esta versión cumple el mismo objetivo (preguntas documentalmente fundamentadas) sin infraestructura ni coste:

- **PWA de un solo archivo** (`index.html`) más `sw.js` y `manifest.webmanifest`. Una base de código para web, Android e iPhone.
- **Persistencia en IndexedDB** del navegador. Sin cuentas ni servidor.
- **Generación sin IA** (reglas deterministas) y **verificación independiente** contra el texto original.
- Los contratos de datos (`question`, `evidence`, estados) están pensados para poder conectar más adelante un generador con IA y un backend sin rehacer el modelo.

Prioridad ante contradicciones (Anexo, apartado 18): seguridad, fidelidad documental, integridad de datos, fiabilidad de preguntas, rendimiento, experiencia de usuario.

## Flujo

```
Archivo / texto
   │  SHA-256 ── ¿ya existe? ── sí ─► se reutiliza (0 coste)
   ▼
Extracción (texto nativo → OCR solo si hace falta)
   │  páginas con calidad dudosa ─► marcadas, sin preguntas, reprocesables
   ▼
Indexado: capítulos, fragmentos (frases) con página exacta
   ▼
GENERADOR  → propone pregunta + 4 alternativas + cita + explicación
   ▼
VERIFICADOR (independiente) → controles críticos + puntuación
   ▼
validated ──► banco ──► exámenes / repaso espaciado
pending_validation / needs_review ──► revisión humana
rejected ──► nunca aparece en un examen
```

## Núcleo

El núcleo (sin DOM) está entre los marcadores `//CORE-START` y `//CORE-END` de `index.html`, y se prueba con Node sin navegador (`tests/core.test.js`).

### Generador
Tres tipos de pregunta, siempre ancladas a una frase del documento:
- **number** – cifras y plazos («30 días»); distractores con concordancia de número.
- **list** – elementos de una enumeración tras «:».
- **cloze** – término clave de una frase; distractores del propio vocabulario del documento.

Antes de aceptar un distractor, comprueba que la frase con esa sustitución **no existe** en el documento.

### Verificador
Controles **críticos** (cualquier fallo rechaza la pregunta):

| Control | Qué comprueba |
|---|---|
| `esquema` | Tipos, 4 alternativas, `ans` 0–3, evidencia presente |
| `version` | La pregunta pertenece a la versión del documento |
| `pagina_valida` | La página existe y no está marcada como dudosa |
| `fragmento_en_pagina` | La cita aparece en la página (texto normalizado) |
| `fragmento_existe` | El fragmento referenciado existe y contiene la cita |
| `opciones_unicas` | Sin alternativas repetidas |
| `respuesta_respaldada` | La respuesta correcta aparece en la cita |
| `distractores_fuera_del_texto` | Ningún distractor aparece en la cita |
| `distractor_no_valido_en_doc` | Ningún distractor produce una frase existente en el documento |
| `sin_duplicado` | Similitud (Jaccard) < 0,85 con otras preguntas |

Controles **no críticos** (−10 puntos cada uno): `explicacion_fiel`, `longitud`.

Una pregunta es `validated` solo si no falla ningún crítico **y** puntúa ≥ 90. Una puntuación alta nunca compensa un fallo crítico.

La normalización (`norm`) pasa a minúsculas, elimina tildes y signos y colapsa espacios, para tolerar diferencias inocuas de extracción y conservar el texto original.

### Preguntas externas
Las preguntas pegadas desde otro chat (`kind: "ext"`) tienen respuesta no demostrable automáticamente, así que quedan en `pending_validation` si su cita existe en la página indicada, y se rechazan si no. Solo se usan en exámenes tras aprobación humana.

## Estado de los requisitos del Anexo V2

Leyenda: ✅ implementado y probado · 🟡 parcial · ⛔ no aplica en modo local · ⏳ pendiente

| § | Requisito | Estado | Notas |
|---|---|---|---|
| 1 | Tres niveles de fiabilidad | ✅ | Esquema, verificación de cita, revisión humana |
| 2 | Motor documental (hash, versiones, índice, fragmentos) | ✅ | Versión de extractor/OCR guardada como texto |
| 2 | No reprocesar archivos idénticos | ✅ | Probado en e2e |
| 3 | Texto nativo, OCR solo si hace falta, páginas dudosas | 🟡 | OCR no verificado contra el servidor real |
| 3 | Tablas como estructuras coherentes | ⏳ | Las tablas se aplanan a texto |
| 4 | Índice jerárquico | 🟡 | Capítulos detectados por título y páginas; sin conceptos |
| 4 | 4 modos de distribución | ⏳ | El examen reparte por páginas; sin selector de modo |
| 5 | Generador y verificador separados | ✅ | |
| 5 | Verificación semántica con segundo proceso de IA | ⛔ | Sustituida por controles deterministas + revisión humana |
| 6 | Estados y puntuación 90/100 | ✅ | `needs_review` se usa en casos límite |
| 7 | Banco persistente, duplicados, estadísticas, versionado | ✅ | Duplicados por similitud léxica, no semántica |
| 7 | Límites de tokens, cuotas, llamadas | ⛔ | No hay llamadas a IA (tokens y coste = 0) |
| 8 | Examen de exactamente 40 o aviso | ✅ | Nunca se presenta incompleto como de 40 |
| 8 | Equilibrio de dificultad | ⏳ | Hay cobertura por página y control de recientes |
| 9 | Clave de respuestas en servidor | ⛔ | Sin servidor: el modo examen no muestra la respuesta hasta corregir, pero los datos residen en el dispositivo |
| 10 | RLS, buckets privados, claves | ⛔ | Sin servidor; los datos no salen del dispositivo |
| 10 | Tablas adicionales | 🟡 | Equivalentes embebidos, ver [ESQUEMA_DATOS.md](ESQUEMA_DATOS.md) |
| 11 | Copias con integridad | 🟡 | Exporta/importa con SHA-256; **los PDF originales no se incluyen** |
| 11 | Pruebas periódicas de restauración | ⏳ | |
| 12 | Sincronización | 🟡 | Manual por archivo; fusión por marca temporal; sin resolución de conflictos explícita |
| 12 | Exámenes finalizados inmutables | 🟡 | Se guardan como `final`, pero la importación puede sustituirlos si traen una marca más reciente |
| 13 | Offline | ✅ | Tras la primera carga; PDF y OCR necesitan conexión la primera vez |
| 14 | Experiencia de usuario | 🟡 | Falta examen por materia/carpeta |
| 15 | Rendimiento (paginación, carga diferida) | ⏳ | Carga el banco completo en memoria |
| 16 | Pruebas adicionales | 🟡 | Ver [PRUEBAS.md](PRUEBAS.md) |
| 17 | Informe de auditoría | ✅ | Documentos, propuestas, validadas, rechazadas, motivos, tiempos, errores |

## Evolución prevista

1. Verificar OCR y carga de pdf.js en dispositivos reales.
2. Incluir los PDF en las copias y añadir prueba de restauración.
3. Selector de distribución (equilibrada, proporcional, personalizada, puntos débiles) y equilibrio de dificultad.
4. Paginación y carga diferida del banco.
5. Backend opcional (Supabase u otro) para sincronización automática, con generador de IA tras una API propia, nunca desde el navegador.
