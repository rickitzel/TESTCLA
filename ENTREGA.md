# Entrega 2.2

Abre **LEEME_PRIMERO.html** para instalar o actualizar. El ZIP completo incluye código, motores, licencias, ejemplos, regresiones y un segundo ZIP de carga web con index.html en la raíz. Ningún banco personal forma parte del paquete.

## Revisión del plan maestro

| Área acordada | Disponible en la aplicación |
|---|---|
| Importación | JSON V1, TXT y PDF, claves y explicaciones, huellas de archivos, revisión localizada, conservación de pendientes, duplicados y coincidencias de enunciado, selección parcial y reintento. OCR local español, inglés o bilingüe. |
| Integridad y operación local | Identidades de pregunta y opción, instantáneas de sesión, IndexedDB y escrituras transaccionales, papelera reversible, exportación con PDF, restauración comprobada, diagnóstico, modo de rescate, migración tras verificar la copia y actualización con caché versionada. |
| Estudio y organización | Test rápido, aprendizaje, simulacro, supervivencia, falladas, difíciles, mixto, reto diario, flashcards, certificación interna, nuevas y olvidadas. Favoritas, duda, repaso espaciado configurable, notas, imágenes, referencias, búsqueda y filtros combinables por módulo, ATA, UD, RA, dificultad y carpeta. Las colecciones permiten estudiar bancos juntos manteniendo su procedencia. |
| Motivación y accesibilidad | Continuar sesión, metas diaria y semanal, dominio por materia, repasos, XP, niveles, rachas flexibles y logros. Concentración, letra grande, contraste, temas, sonido, vibración opcional, descanso y voz local si el dispositivo tiene una instalada. |
| Planificación y progreso | Fecha de examen, días disponibles, reserva de días de repaso, calendario de actividad, cobertura, evolución, tiempo transcurrido medio, resultados de simulacros, errores, estadísticas e informes exportables. El indicador de preparación muestra la falta de evidencia. |
| Distribución y pruebas | Paquete web estático listo para subir, ayuda integrada e instalación desde el navegador móvil. Ensayos en Chromium con red cortada, actualizaciones y vuelta atrás. Las comprobaciones físicas pendientes figuran en docs/PRUEBAS.md. |

Se corrigió la pérdida de la última selección al recargar durante la escritura en IndexedDB. En 2.2 se conserva un recibo breve para recuperar la respuesta sin puntuarla dos veces. Las flashcards que muestran la solución no incrementan aciertos ni XP. Una migración de registros antiguos comprueba que el usuario puede volver a leer la copia previa. Al exportar, la app también ofrece descarga alternativa y, cuando el dispositivo lo permite, el selector nativo para guardar o compartir.

La estructura y la existencia de una clave permiten estudiar un examen. La verificación académica exige contrastar la respuesta con el temario. El OCR de documentos manuscritos, con columnas o símbolos técnicos sigue requiriendo revisión. Los tiempos del historial incluyen pausas. El almacenamiento sigue vinculado al navegador, perfil y origen. No se ha publicado el sitio ni se han cambiado servicios externos.
