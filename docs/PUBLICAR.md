# Publicar en GitHub Pages (gratis)

Las apps instalables en móvil necesitan HTTPS. GitHub Pages lo da gratis. El repositorio incluye un workflow que ejecuta los tests y publica la app automáticamente.

## 1. Crear el repositorio

En github.com → **New repository**. Nombre sugerido: `test-master`. Para usar Pages gratis, el repositorio debe ser **público** (los privados requieren un plan de pago).

## 2. Subir los archivos

### Opción A: línea de comandos (recomendada)
Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Test Master 0.1.0"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/test-master.git
git push -u origin main
```

### Opción B: desde la web
*Add file → Upload files* y arrastra **el contenido** de la carpeta (no el ZIP). Comprueba después que existe la carpeta `.github/workflows/`; las carpetas que empiezan por punto a veces no se arrastran desde el explorador de archivos. Si falta, créala con *Add file → Create new file* escribiendo la ruta `.github/workflows/pages.yml` y pegando el contenido.

## 3. Activar Pages

En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Después, en la pestaña **Actions**, el workflow *Publicar en GitHub Pages* se ejecuta con cada subida a `main`. Cuando termina en verde, la app queda en:

```
https://TU_USUARIO.github.io/test-master/
```

Si el workflow falla en `tests`, el despliegue se detiene; abre el registro para ver qué prueba falló.

## 4. Instalar en el móvil

- **Android (Chrome):** abre la URL → menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari):** abre la URL → Compartir → *Añadir a pantalla de inicio*.

La primera vez, con conexión, se guardan la app y (al usar un PDF) pdf.js. Después funciona sin conexión.

## Actualizar

Sube cambios a `main`; el sitio se republica solo. El service worker pide primero a la red, así que la siguiente vez que abras la app con conexión verás la versión nueva.

## Alternativas gratuitas

Netlify y Cloudflare Pages: conecta el repositorio sin comando de compilación y carpeta de publicación vacía o `.`. Si usas estas opciones, publica solo los archivos de la app (`index.html`, `sw.js`, `manifest.webmanifest`, `icon-*.png`).

## Datos y privacidad

Todo se guarda en el navegador del dispositivo (IndexedDB). Publicar la app no publica los documentos ni las preguntas de nadie. Cada dispositivo tiene su propia copia; se pasan datos entre ellos con *Más → Exportar / Importar*.
