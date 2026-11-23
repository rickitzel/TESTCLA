# Test Master

App de tests **local, gratuita e instalable** (PWA) que genera preguntas a partir de tus propios documentos y **solo acepta las que puede demostrar con la fuente**. Funciona en web, Android e iPhone desde una única base de código. Todo se guarda en tu dispositivo: sin servidor, sin cuentas y sin coste de IA.

## Por qué es distinta

Una pregunta bien redactada no es una pregunta correcta. Test Master separa tres niveles:

1. **Formato válido** – el esquema de datos se cumple.
2. **Respuesta convincente** – la pregunta suena bien.
3. **Respuesta respaldada** – la cita existe en la página indicada y demuestra la respuesta.

Solo las preguntas que superan el nivel 3 entran en los exámenes.

## Qué hace

- **Documentos:** PDF, TXT o texto pegado. Huella SHA-256, versiones, índice de capítulos, fragmentos con página exacta. Un archivo idéntico no se vuelve a procesar.
- **Calidad del texto:** texto nativo primero, OCR solo si hace falta, páginas dudosas marcadas y reprocesables, sin preguntas basadas en texto dudoso.
- **Generador + verificador independientes:** el generador (sin IA, determinista) propone; el verificador comprueba cita, página, versión, respuesta respaldada, distractores y duplicados. Umbral 90/100 **y** todos los controles críticos.
- **Banco de preguntas persistente** con estados `draft`, `pending_validation`, `validated`, `rejected`, `needs_review`, `archived`.
- **Exámenes:** simulacro de exactamente 40 preguntas validadas (si no hay suficientes, avisa y no inventa), modo examen y modo aprendizaje, falladas, favoritas, contrarreloj, repaso espaciado y reanudación.
- **Motivación:** XP, niveles, racha diaria, meta diaria, combos, logros y mapa de dominio por página.
- **Preguntas desde otro chat:** copias un prompt, pegas el JSON de vuelta, la app comprueba cada cita contra el documento y la respuesta la apruebas tú.
- **Datos:** copia exportable/importable con comprobación de integridad e informe de auditoría.

## Probar en local

```bash
python3 -m http.server 8000      # o: npx serve .
# abre http://localhost:8000
```

También puedes abrir `index.html` directamente. Para PDF, la primera vez necesita conexión (descarga pdf.js, y Tesseract si hay páginas escaneadas); después queda en caché.

## Publicar gratis (GitHub Pages)

Ver [docs/PUBLICAR.md](docs/PUBLICAR.md). Resumen: sube el repositorio, activa Pages con "GitHub Actions" y la app queda en `https://TU_USUARIO.github.io/NOMBRE_REPO/`.

Instalación en el móvil:
- **Android (Chrome):** menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari):** Compartir → *Añadir a pantalla de inicio*.

## Tests

```bash
node --test          # Node 20 o superior, sin dependencias
```

Detalle en [docs/PRUEBAS.md](docs/PRUEBAS.md).

## Documentación

| Documento | Contenido |
|---|---|
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Decisiones de diseño y estado de cada requisito del Anexo V2 |
| [docs/ESQUEMA_DATOS.md](docs/ESQUEMA_DATOS.md) | Almacenes de IndexedDB y campos |
| [docs/PRUEBAS.md](docs/PRUEBAS.md) | Qué se prueba, cómo y qué falta |
| [docs/PUBLICAR.md](docs/PUBLICAR.md) | Despliegue en GitHub Pages |
| [CHANGELOG.md](CHANGELOG.md) | Cambios por versión |

## Limitaciones conocidas

Estado honesto de la versión 0.1:

- **OCR de escaneados y carga de pdf.js desde CDN:** implementados pero no verificados contra los servidores reales.
- **Dispositivos reales:** probada en Chrome de escritorio con tamaño móvil, no en Android/iPhone físicos.
- **Sincronización** entre dispositivos: manual (exportar/importar), no automática.
- **Distribuciones de preguntas** personalizada y por puntos débiles, equilibrio explícito de dificultad y paginación: pendientes.
- **Tipos de pregunta:** el generador sin IA produce huecos, plazos/cifras y enumeraciones; menos variedad que un redactor humano o una IA.

## Licencia

MIT. Ver [LICENSE](LICENSE).

## Actualización 0.2.0
El fondo azul petróleo permite comprobar que se ha cargado esta versión. Tras contestar en modo aprendizaje se muestra una explicación basada en la cita, y al finalizar un examen se corrigen todas las respuestas. Se intenta OCR también cuando la extracción nativa parece corrupta. **Importante:** no se ha incorporado inteligencia artificial para generar preguntas conceptuales; el generador sigue siendo por reglas. Revisa los resultados OCR y las preguntas antes de estudiar contenidos críticos.

### Subir a GitHub
Copia los archivos de esta carpeta a la raíz de tu repositorio y confirma los cambios. Activa GitHub Pages desde Settings → Pages, seleccionando Deploy from a branch y la rama main, carpeta /(root). No se ha publicado automáticamente en tu cuenta.
