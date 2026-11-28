# Datos locales

IndexedDB testmaster, versión física 1, clave id en los siete almacenes.

| Almacén | Contenido |
|---|---|
| docs | Nombre, versión vigente y marca de papelera |
| versions | Hash, tamaño, páginas, calidad de extracción, fragmentos, secciones y JSON original cuando está disponible |
| questions | Identidad de pregunta y opciones, revisión, versiones anteriores, enunciado, clave, evidencia, razones, nota, imagen local, etiquetas, estado y estadísticas |
| files | Blob del PDF original, identificado por versión |
| sessions | Sesión abierta o resultado, orden de opciones, estado de respuesta y datos históricos |
| kv | Perfil, metas, ajustes, fechas, colecciones y revisión lógica de datos |
| audit | Incidencias y totales de trabajos |

El número que trae el archivo identifica una fila dentro del examen. La pregunta y las opciones tienen identidad interna. Los datos V1 pueden carecer de algunos campos. El lector utiliza valores compatibles y la conversión explícita de Más crea una copia previa.

Una pregunta con state validated puede ser apta para estudiar a partir de una clave. keySource identifica la procedencia. academic registra una declaración de revisión del usuario. Para registrar una revisión académica desde el editor hay que identificar el temario consultado. Los resultados ya terminados conservan su corrección aunque después cambien las opciones. La app no puede reconstruir datos ausentes de un histórico antiguo.

La copia testmaster-v2 contiene la fecha, SHA-256 del texto serializado y los siete almacenes. Los PDF se codifican en Base64 y se contrastan con su huella al restaurar. La suma detecta alteraciones accidentales. La copia contiene el contenido de estudio en claro.
