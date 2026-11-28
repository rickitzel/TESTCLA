# Cambios de TESTCLAU

## 2.2.0

- Modelos español e inglés incluidos, con selección de idioma y revisión del texto OCR.
- Recuperación de una respuesta si se recarga mientras IndexedDB está confirmándola.
- Descarga explícita de copias. Verificación de la copia externa antes de convertir registros antiguos desde Más.
- Filtros por campo, dominio por materia en Inicio, descanso, imágenes durante el estudio y reto diario reproducible. Las flashcards reveladas se excluyen de los aciertos evaluados.
- Instalación y comprobación offline desde Más, aviso de actualización y distribución lista para carga directa.
- Regresiones en Chromium real sobre IndexedDB, descarga y restauración, OCR, caché y actualizaciones en ambos sentidos.

## 2.1.0 · Entrega de prueba

- Parser en worker para PDF, TXT y JSON, conservación de metadatos, revisión de anomalías, opciones repetidas, claves incompatibles y duplicados.
- PDF.js 5.6.205, Tesseract.js 7.0.0, núcleo 7.0.0 y modelo inglés empaquetados. El texto reconocido se somete a revisión antes de estudiarlo.
- Copia completa con PDF, rescate de solo lectura, restauración transaccional, conversión opcional con copia, papelera reversible y consulta de fuente.
- Corrección diferida de simulacros, reanudación sin doble puntuación, opciones identificadas, instantáneas de sesiones e historial de ediciones.
- Modos de estudio, selección de preguntas, colecciones de bancos, notas, referencias, imágenes, repaso espaciado configurable y preferencias de accesibilidad.
- Planificador, indicadores de preparación con evidencia explícita, calendario, evolución, simulacros e informes.
- Instalación estática sin compilación, lanzador local y pruebas reproducibles con documentos sintéticos.

# Changelog

## 0.1.0 — primera versión

### Añadido
- PWA local-first (IndexedDB) instalable en Android, iPhone y escritorio, con service worker.
- Motor documental: PDF/TXT/texto, SHA-256, versiones, índice de capítulos, fragmentos con página, OCR opcional y marcado de páginas dudosas.
- Generador determinista (cifras y plazos, enumeraciones, términos clave) y verificador independiente con controles críticos y puntuación.
- Banco persistente, estados, detección de duplicados, repaso espaciado (Leitner), estadísticas.
- Exámenes de 40 preguntas con aviso de escasez, modo examen y aprendizaje, falladas, favoritas, contrarreloj, reanudación.
- Gamificación: XP, niveles, racha, meta diaria, combos, logros, mapa de dominio.
- Importación de preguntas externas con comprobación de cita y revisión humana.
- Exportar/importar copia con integridad SHA-256 e informe de auditoría.

### Corregido durante el desarrollo
- Fondo de la interfaz descartado por un color hexadecimal inválido.
- Distractores numéricos con unidad mal concordada que delataban la respuesta.
- Preguntas de versiones anteriores de un documento ahora pasan a `archived`.
- Regenerar ya no guarda duplicados; la importación acepta respuestas A/B/C/D; la fusión de copias respeta la fecha real de las respuestas.
- Service worker con red primero para ver actualizaciones.

## 0.2.0 — mejora de lectura y corrección
- Fondo azul petróleo para identificar la nueva versión.
- Detección heurística de extracción defectuosa y OCR alternativo para páginas sospechosas.
- Explicación breve vinculada a la fuente en el modo aprendizaje y en la corrección final de todas las preguntas.
- Cambio de caché del service worker para forzar la actualización.
- Nota: las preguntas siguen siendo deterministas; no se incorpora un modelo de comprensión semántica ni se garantiza la exactitud del OCR.


## 0.3.0 — importación de exámenes existentes

- Sustituida la generación automática de preguntas a partir de frases por la importación estructurada de preguntas proporcionadas.
- Conserva enunciados, opciones A-D y orden original.
- Importa la clave y las explicaciones del documento; preguntas sin clave quedan pendientes.
- Señal visual ✓/✕ en la corrección.
- No inventa preguntas cuando el documento no tiene formato de examen reconocible.


## 0.4.0 — corrección inmediata

- Todos los modos de examen muestran el resultado al seleccionar una respuesta, sin esperar al final.
- La opción correcta queda marcada en verde y la explicación aparece inmediatamente.
- Se muestra explícitamente la letra y el texto de la respuesta correcta.
- El service worker utiliza una nueva versión de caché para distribuir la actualización.
