# Protocolo TESTCLAU V1
Generar PDF seleccionable y JSON UTF-8 desde el mismo conjunto de preguntas. No generar ambos de forma independiente. Verificar respuestas contra el temario; no inventar referencias. Cada pregunta tiene cuatro opciones distintas y una clave explícita. Numeración consecutiva. Metadatos opcionales: tema, explicación, módulo, UD, RA, dificultad y referencia. El formato no garantiza exactitud académica.

JSON: objeto con formato="TESTCLAU", version=1, titulo, total_preguntas y preguntas. Cada pregunta: id entero consecutivo, pregunta, opciones (objeto A/B/C/D), correcta (A/B/C/D), metadatos opcionales. El importador asignará identificadores internos estables; el id del archivo es solo local al examen.

PDF/TXT: primera línea TESTCLAU V1; título en línea independiente; TOTAL_PREGUNTAS: N; preguntas con N. enunciado y opciones A) a D) en líneas separadas. Al final INICIO_RESPUESTAS, una clave N=B por línea, FIN_RESPUESTAS. Sin columnas ni tablas; evitar dividir preguntas entre páginas. El PDF puede incluir explicaciones en un bloque separado en futuras versiones, pero V1 básico no las requiere. La equivalencia mínima es enunciado, opciones y clave.

Validar antes de entregar: total exacto, IDs consecutivos, cuatro opciones no vacías ni duplicadas, clave válida, ausencia de preguntas repetidas, coincidencia entre PDF y JSON. Si el documento fuente es insuficiente, avisar antes de generar preguntas.
