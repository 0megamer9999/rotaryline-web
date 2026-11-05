# Web del club Rotary&Line

Web estática en español. Sin cookies, sin rastreo, sin CDNs ni Google Fonts (las fuentes van en `estatico/fuentes`). YouTube solo se carga al pulsar un vídeo (`youtube-nocookie.com`).

## Cómo se construye
- Hace falta Node (>= 18) y nada más: `node construir.mjs` genera `docs/` desde `datos/*.json` y `plantillas/*.html`.
- Ver en local: abrir `docs/index.html` (los enlaces son relativos y funcionan con archivo), o `npx serve docs`.
- No edites `docs/` a mano: se borra y se regenera. Lo estático (CSS, JS, fuentes, imágenes) está en `estatico/`.
- Publicación futura: GitHub Pages desde `docs/`; `CNAME` ya contiene `rotaryline.es` (se copia a `docs/`).
- Capturas de revisión: `capturas/` (las de móvil, con `node capturas/_movil.mjs`).

## Dónde se cambia cada cosa
- Aspecto: tokens de `:root` en `estatico/css/estilos.css` (los mismos colores y tipografías del programa Garaje).
- Cabecera y pie: una sola vez, en `plantillas/base.html`. Menú: `menu` de `datos/club.json`.
- **Tienda:** ya está en el menú con `"activo": false`; poner `true` publica `tienda.html` (plantilla `plantillas/tienda.html`).
- Añadir un evento: una entrada en `datos/eventos.json` (`fecha` AAAA-MM-DD, `coches` con ids de coches.json).
- Añadir un coche: entrada en `coches.json` (silueta: compacto, berlina, familiar, coupe, descapotable, suv, clasica, enduro, cafe-racer...) y su id en `coches` del miembro. Fotos: copiar a `estatico/img/` y poner `{"archivo": "img/x.webp", "alt": "..."}` en `galeria`.
- Vídeo: `id` de YouTube en `videos.json`; la miniatura es un archivo local en `miniatura` (no se descarga de YouTube para no contactar con él).

## Huecos por rellenar (aparecen en amarillo como «[Por completar]»)
- Correo del club (`club.json`) y texto de «Quiénes somos» (historia).
- Aviso legal completo (titular, NIF, domicilio, etc.).
- Eventos del próximo año: solo hay uno de ejemplo.
- Vídeos: títulos, fechas e identificadores de YouTube; solo hay dos de ejemplo.
- Fotos de cada coche (galería y portada) y capturas de Talleres (no existen aún en el repositorio).
- Fichas de los coches: motor, año, carrocería (la silueta del E39 es de berlina por defecto), km, modificaciones.
- Otros miembros y coches (hay uno de ejemplo de cada). Proyectos: uno de ejemplo.
- A confirmar: modificaciones del E39 (salen de las notas del modelo 3D) y los datos del RX-8 (notas de octubre 2026). Apellidos y matrículas no se publican.
- Capturas de Garaje: son los diseños de la v0.5 con datos de ejemplo («Álex», sin matrículas), no capturas del programa real; cambiarlas por reales cuando se quiera.
- URL de YouTube y TikTok sacadas de las notas internas (canal UCXkvhz3C6DBaeDC0zwlHRAQ, cuenta rotaryinline): comprobar que abren bien.
