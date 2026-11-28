# TESTCLAU 2.2

Aplicación de estudio de mantenimiento aeronáutico. Importa exámenes, estudia con tus propias claves y conserva el progreso en este navegador. La aplicación se distribuye con código, recursos y modelos OCR en español e inglés.

## Empezar sin programar

Abre **LEEME_PRIMERO.html**. Si ya tienes una instalación servida por HTTPS, conserva su dirección y sigue los tres pasos de actualización. Si empiezas desde cero, el paquete **TESTCLAU_2.2_WEB.zip** permite crear el sitio mediante carga directa, sin compilación. En el móvil se instala desde esa dirección con el navegador. La primera carga debe completarse con conexión.

Para el equipo que ya usa el lanzador local, sigue disponible `python3 iniciar.py` (Windows: `py iniciar.py`). Conserva el mismo navegador, nombre de host y puerto. La dirección de pruebas sigue siendo http://127.0.0.1:8765/. El lanzador es opcional en un ordenador.

## Primer examen

1. Abre **Biblioteca → Importar examen**. Para probarla, selecciona **tests/fixtures/10.json**. El archivo contiene diez preguntas sintéticas de demostración. Hay versiones equivalentes en PDF y TXT.
2. En **Inicio**, abre el examen y elige corrección inmediata o al final. Para barajar las opciones activa la preferencia en **Más**.
3. Consulta **Progreso**. Desde **Más → Exportar** descarga una copia externa con documentos, archivos originales disponibles, notas, progreso y sesiones.

Las preguntas importadas con clave se pueden estudiar directamente. La ficha indica su procedencia. Si el examen presenta dudas, la vista previa permite cancelar, conservar las pendientes o guardar solo las listas. Los escaneos se revisan manualmente. Desde **Revisar** puedes editar y registrar la fuente académica consultada. **Biblioteca → Consultar fuente** muestra el texto extraído y permite descargar el PDF original, si está disponible.

En **Más → Ayuda** encontrarás las instrucciones de estudio y la fórmula de preparación. **Más → Diagnóstico local** genera un informe de contadores sin incluir enunciados ni notas. El modo de rescate se abre añadiendo **#seguro** a la dirección y recargando.

- [Informe y limitaciones de la entrega](ENTREGA.md)
- [Pruebas y reproducción](docs/PRUEBAS.md)
- [Formato de examen](docs/PROTOCOLO.md)
- [Cambios](CHANGELOG.md)
