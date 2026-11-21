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
