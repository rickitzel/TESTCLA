# Verificación de TESTCLAU 2.2

27 de noviembre de 2026. Datos sintéticos, Linux, Node 24.22.3 y Python 3.12.14. Los registros RESULTADO_*.txt contienen las salidas de las pruebas. Los archivos de la entrega 2.1 se utilizaron como referencia de actualización.

| Prueba ejecutada | Resultado y alcance |
|---|---|
| Núcleo y flujos | Las 47 regresiones originales y tres nuevas superadas. Las tres nuevas cubren repetición del recibo de respuesta, intersección de filtros y exclusión de flashcards reveladas de XP y aciertos. Parte de estos casos usa un doble de almacenamiento. |
| Equivalencia de formatos | En Chromium se importaron PDF de texto, TXT y JSON de 10, 50, 80, 100 y 200 preguntas. Se compararon todos los enunciados, alternativas y claves. También se repitió el ensayo independiente de motores en Node. |
| OCR sin servidor | Tres exámenes PDF compuestos exclusivamente por una imagen. Se probaron español, inglés y ambos juntos. El texto español de prueba incluía «señal», «presión», «ángulo», «Avión», «Hélice» y «Válvula». Se exigió coincidencia exacta de enunciado y cuatro alternativas, y estado pendiente de revisión. |
| Volumen | Importación y escritura de 1.000 y 10.000 preguntas en IndexedDB real con emulación táctil de 390 × 844. Los tiempos y el heap observado se registran en RESULTADO_browser.txt. El heap es una lectura puntual del proceso de navegador. |
| Sesiones | Respuestas barajadas y corrección diferida. Recarga inmediata tras pulsar una respuesta, reanudación y calificación de diez preguntas. |
| Integridad | PDF y JSON dañados, cancelación de una importación conflictiva, descarga de una copia, vaciado de los datos sintéticos y restauración del banco completo. Recuperación desde papelera y diagnóstico. |
| Actualización y vuelta atrás | V2 CORE → 2.2 → V2 CORE y 2.1 → 2.2 → 2.1, sustituyendo recursos bajo el mismo origen. Se verificaron identidades de preguntas. En V2 CORE se descargó y volvió a seleccionar la copia previa a migrar. En 2.1 se conservó una sesión con respuesta ya puntuada. |
| Red desconectada | Tras precargar, se detuvo el servidor y se desactivó la red del contexto. Se ejercitaron navegación, estudio, los tres importadores, OCR y restauración. Durante la descarga del archivo local se mantuvo apagado el servidor y se bloquearon las solicitudes HTTP(S); se reactivó el modo offline de CDP para restaurar. El recorrido comprueba que no hubo solicitudes a terceros. |
| Interfaz móvil | Inicio, Biblioteca, Revisar, Progreso y Más en 320 × 640, 390 × 844, 844 × 390 y 768 × 1024. Encabezados visibles y ausencia de desplazamiento horizontal en estas vistas. |
| PWA | El navegador leyó el manifiesto, instaló y activó el service worker y devolvió cero errores de instalabilidad. La recarga y los modelos OCR funcionaron después de detener el servidor. |

**Pendiente en dispositivos.** No hubo teléfono físico Android o iOS. Falta confirmar el alta del icono en el lanzador del sistema, apertura desde ese icono, uso de VoiceOver/TalkBack, rendimiento y memoria en hardware móvil y variaciones del OCR con escaneos reales. La comprobación de instalabilidad del navegador sí se ejecutó. La prueba de instalación de escritorio mediante PWA.install no se completó: Chrome Headless Shell no implementa ese comando y el Chrome completo no pudo abrir el socket local de su perfil en este entorno. Se conserva el guion para un equipo compatible. El PDF original que motivó el encargo tampoco estaba disponible.

## Repetición en un entorno de desarrollo

Estas herramientas solo son necesarias para las pruebas. La aplicación distribuida ya contiene sus dependencias.

- Ejecutar `npm test` en la raíz del código.
- Ejecutar `node tests/engines.mjs` con Node 24 y el adaptador @napi-rs/canvas instalado en el entorno de desarrollo.
- Para los guiones del navegador, instalar playwright, pillow y reportlab en Python. Indicar en CHROMIUM la ruta absoluta al ejecutable real. Si el lanzador de la distribución carece de binario, utilizar Chrome Headless Shell para pruebas. En esta entrega se ejecutó la versión 151.0.7922.34 obtenida con `npx @puppeteer/browsers install chrome-headless-shell@151.0.7922.34 --path ./qa-browser`. También se ejercitó Chromium 158.0.8127.0. La carpeta temporal del proceso debe existir y ser escribible.
- Ejecutar `python tests/browser.py` y `python tests/mobile_browser.py`. Ambos crean un origen y un perfil aislados. Los bancos, copias y vaciados pertenecen únicamente a ese perfil.
- Ejecutar dos veces `python tests/update_browser.py ARCHIVO.zip`, pasando primero TESTCLAU_V2_CORE.zip y después TESTCLAU_2.1.zip.
- Para comprobar el alta real de la PWA en escritorio, definir CHROMIUM como la ruta a una instalación completa de Chrome compatible y ejecutar `python tests/pwa_browser.py`. El guion usa un perfil temporal. Se considera superado solo si imprime la comprobación de ventana standalone y termina con código cero.
