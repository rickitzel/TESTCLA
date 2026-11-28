# Componentes distribuidos

| Componente | Versión utilizada | Avisos incluidos |
|---|---|---|
| PDF.js, módulos legacy | 5.6.205 | PDFjs.txt; licencias de fuentes, mapas y decodificadores en sus carpetas dentro de vendor |
| Tesseract.js, distribución para navegador y worker | 7.0.0 | TesseractJS.txt y avisos de las distribuciones minificadas en vendor |
| tesseract.js-core, LSTM genérico y WebAssembly | 7.0.0 | TesseractCore.txt |
| Modelo inglés de Tesseract, eng.traineddata | Paquete tesseract-ocr-eng del entorno de construcción | eng.txt |

El modelo español se distribuye desde @tesseract.js-data/spa 1.0.0, variante 4.0.0_best_int. La distribución de npm declara MIT y los datos Tesseract proceden del proyecto tessdata bajo Apache 2.0. Se incluyen sus metadatos en spa-paquete.json y la licencia Apache en TesseractCore.txt.

Los scripts de la aplicación cargan estos archivos desde el mismo origen. El material sintético de tests/fixtures se creó para probar el protocolo. La licencia del código de la aplicación se conserva en LICENSE.
