# Arquitectura de la edición 2.2

La interfaz estática está en index.html. Los controles llaman a las acciones de import.js, study.js y backup.js. core.js contiene el parser, validación, selección y repaso. parser-worker.js analiza archivos en un worker. PDF.js usa su worker local. El reconocimiento rasteriza la página y ejecuta Tesseract en un worker WebAssembly. Las referencias a los recursos se resuelven respecto a la URL de la aplicación. El visor muestra texto importado escapado.

Se admiten hasta 32 MiB por examen, 500 páginas PDF y 10.000 preguntas por archivo. La rasterización limita el lienzo a ocho millones de píxeles. El análisis tiene un tiempo máximo de 90 segundos y se comprueba el presupuesto global entre etapas. La escritura del banco es indivisible. Cancelar una operación en curso evita el guardado si aún no ha empezado la confirmación final.

La app mantiene los almacenes y el nombre de base de V2. En instalaciones nuevas crea índices por versión, documento, estado y fecha donde corresponda. La consulta por identidad de pregunta usa un índice en memoria también disponible con bases originales. La aplicación usa Web Locks cuando el navegador lo ofrece para asegurar un escritor entre pestañas. Las operaciones de usuario se serializan en la interfaz.

Cada sesión nueva fija enunciado, opciones, clave y orden de presentación. La selección apunta a la opción original, con un identificador estable por opción. Las versiones editadas se conservan en la pregunta. En la corrección inmediata, la respuesta, pregunta y perfil se confirman por transacción. En un simulacro se guardan las opciones al seleccionarlas y los resultados se aplican al terminar. La restauración valida los datos antes de abrir la transacción de sustitución.

La caché de la PWA se instala como conjunto versionado. Una instalación incompleta rechaza el nuevo service worker. La versión vigente sirve el conjunto local. Las solicitudes de terceros quedan fuera de su alcance. Esta entrega conserva las cachés previas para las sesiones que aún puedan utilizarlas.

La edición 2.2 carga spa, eng o ambos desde la caché local. Antes de puntuar una elección escribe un recibo corto de recuperación en localStorage cuando está disponible. Al reanudar, comprueba sesión, posición e identidad de pregunta. Si IndexedDB ya confirmó la respuesta inmediata, el bloqueo evita volver a puntuarla. Al restaurar o vaciar se descarta el recibo.
