# Pruebas

## Automáticas (en el repositorio)

```bash
node --test
```
Requiere Node 20 o superior y no tiene dependencias. Se ejecutan en GitHub Actions en cada subida, y el despliegue a Pages solo se hace si pasan.

`tests/core.test.js` cubre:

| Prueba | Verifica |
|---|---|
| Estructura del documento | Capítulos, fragmentos y que cada fragmento está en su página |
| Preguntas generadas válidas | Todas superan los controles críticos y puntúan ≥ 90 |
| Determinismo | Mismo documento, mismas preguntas |
| Rechazo de preguntas incorrectas | Respuesta falsa, página inexistente, cita inventada, alternativas repetidas, versión distinta, esquema roto, fragmento inexistente |
| Duplicados | Se rechazan con el motivo correcto |
| Distractor válido en el documento | Se rechaza si la sustitución produce una frase que existe en el texto |
| Páginas dudosas | No generan fragmentos |
| Importación externa | Cita real → pendiente de revisión; cita falsa → rechazada |
| Concordancia de unidades | Sin «2 año» ni «1 años» en los distractores |
| Repaso espaciado | Sube y reinicia cajas, fechas correctas |
| Selección de examen | Sin repetidos, nunca más de lo pedido, reparto por páginas |
| Nivel | Progresión de niveles |

## Manuales / de extremo a extremo

Se realizaron con Chrome automatizado en vista móvil de 390 px, y **no** están automatizados en este repositorio. Para repetirlas a mano:

1. Biblioteca → *Pegar texto* con un temario de varias frases con plazos y enumeraciones → debe indicar preguntas validadas.
2. Pegar el mismo texto otra vez → «idéntico, ya procesado».
3. Inicio → *Simulacro de 40* con menos de 40 preguntas → debe avisar y ofrecer reducir o añadir material, sin inventar preguntas.
4. Completar un examen → resultado con XP y lista de falladas con cita y página.
5. Modo aprendizaje → feedback inmediato; ✕ → *Salir* → *Reanudar* continúa en la misma pregunta.
6. Subir un PDF con una página en blanco → esa página queda marcada «en revisión» y no genera preguntas.
7. Más → *Informe de auditoría* y *Exportar* → archivo con `format: "testmaster-v1"` y `sha256`.
8. Comprobar en Application → Service Workers que `sw.js` está activo y que, sin conexión, la app abre.

Resultado en la última ejecución: todos los pasos correctos, sin errores de JavaScript en consola. El paso 6 se ejecutó con una copia local de pdf.js (el CDN no era accesible desde el entorno de desarrollo).

## Lo que NO está verificado

- **OCR (Tesseract.js)** sobre escaneados reales.
- **pdf.js desde su CDN** (versión 3.11.174) en un navegador conectado.
- **Android e iPhone físicos**, instalación como app y comportamiento de IndexedDB bajo presión de almacenamiento.
- **Restauración real de copias** y fusión de copias en conflicto entre dos dispositivos.
- **Acceso entre usuarios, RLS, cuotas de API**: no aplican en modo local.
- Documentos de prueba con tablas, documentos contradictorios, información insuficiente y errores de OCR (apartado 16 del Anexo): **pendiente de crear**.

## Cómo añadir pruebas

Los casos nuevos van en `tests/*.test.js`. El núcleo se carga con la misma técnica de `core.test.js`: se extrae el texto entre `//CORE-START` y `//CORE-END` y se evalúa con `new Function`. Cualquier función que deba probarse sin navegador debe vivir dentro de ese bloque y no depender de `document` ni de IndexedDB.
