# Web del club Rotary&Line

Web estática en español. Sin cookies, sin rastreo, sin CDNs ni Google Fonts (las fuentes van en `estatico/fuentes`). YouTube solo se carga al pulsar un vídeo (`youtube-nocookie.com`).

## Cómo se construye: dos versiones
- Hace falta Node (>= 18) y nada más.
- **`node construir.mjs`** → versión **local**, en `local/` (va al `.gitignore`). Enseña lo que falta: los «[Por completar…]» en amarillo y los elementos de ejemplo. Verla: `py -3 servir.py` → http://localhost:4180.
- **`node construir.mjs --publicar`** → versión **publicable**, en `docs/` (lo que sirve GitHub Pages). Sin rastro de que falta algo. Verla: `py -3 servir.py publicar` → http://localhost:4181. Al acabar imprime un resumen de lo quitado y avisa si queda algún rastro.
- Qué quita la publicable: los elementos con `"ejemplo": true` (miembros, coches, eventos, proyectos, historias); los «[Por completar…]» de los textos (un campo que solo era un hueco no se pinta, ni su párrafo ni su fila de la ficha); los bloques `<!--solo-local-->…<!--/solo-local-->` de las plantillas; las secciones que se quedan vacías (y su entrada del menú: Historias, Trabajos…); las páginas legales mientras tengan huecos (aviso legal y privacidad, ahora); las redes sin vídeo puesto se quedan con el enlace al perfil; sin eventos reales, «Próximamente anunciaremos los eventos a los que vamos»; la portada sin foto de grupo usa un mosaico tenue de los coches.
- En las plantillas: `<!--solo-local-->…<!--/solo-local-->` = solo en local; `<!--sec:nombre-->…<!--/sec:nombre-->` = sección que se quita entera si `construir.mjs` la declara vacía.
- No edites `local/` ni `docs/` a mano: se borran y se regeneran. Lo estático (CSS, JS, fuentes, imágenes) está en `estatico/`.
- Publicación futura: GitHub Pages desde `docs/`; `CNAME` ya contiene `rotaryline.es` (solo se copia en la publicable).
- Capturas de revisión: `capturas/`.

## Capturas de «Cómo instalarlo» (Garaje)
Pepe las deja en `estatico/img/instalar/` con estos nombres exactos (webp). Si el archivo existe, se ve; si no, en local sale un hueco amarillo con su nombre y al publicar no sale nada.
- Windows: `windows-1-descarga.webp` (página de descargas), `windows-2-smartscreen.webp` («Windows protegió su PC»), `windows-3-instalador.webp`, `windows-4-primer-vehiculo.webp`.
- Android: `android-1-descarga.webp`, `android-2-permiso.webp` (permiso de la fuente), `android-3-conectar.webp` (conectar con el programa).
Para añadir un paso: una llamada `capturaPaso("nombre", "descripción")` en `construir.mjs` y `{{cap_...}}` en `plantillas/garaje.html`.

## Animaciones del inicio
En `estatico/js/sitio.js` y al final de `estilos.css`: entrada al bajar con `IntersectionObserver` (atributo `data-anim`), parallax del título de la portada y tarjetas de personas apiladas (`position: sticky`, `.persona-pila`). Con «reducir movimiento» o sin JavaScript todo se ve sin animar.

## Dónde se cambia cada cosa
- Aspecto: tokens de `:root` en `estatico/css/estilos.css` (los mismos colores y tipografías del programa Garaje).
- Cabecera y pie: una sola vez, en `plantillas/base.html`. Menú: `menu` de `datos/club.json`.
- **Tienda:** ya está en el menú con `"activo": false`; poner `true` publica `tienda.html` (plantilla `plantillas/tienda.html`).
- Inicio = el club desplegado (Quiénes somos, Personas, Trabajos, Historias); el desplegable «El club» de la barra se genera solo de `miembros.json`. Historias: `datos/historias.json`. Trabajos: `proyectos.json` (con `"coche"` si son de un coche).
- Fuentes: licencias OFL en `estatico/fuentes/LICENCIA-OFL-*.txt` (se copian a `docs/fuentes/`).
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
- Historias reales (hay dos de ejemplo), fotos de portada y de cada persona, trabajos hechos en los coches (uno de ejemplo).
- Otros miembros y coches (hay uno de ejemplo de cada). Proyectos: uno de ejemplo.
- A confirmar: modificaciones del E39 (salen de las notas del modelo 3D) y los datos del RX-8 (notas de octubre 2026). Apellidos y matrículas no se publican.
- Capturas de Garaje: son los diseños de la v0.5 con datos de ejemplo («Álex», sin matrículas), no capturas del programa real; cambiarlas por reales cuando se quiera.
- URL de YouTube y TikTok sacadas de las notas internas (canal UCXkvhz3C6DBaeDC0zwlHRAQ, cuenta rotaryinline): comprobar que abren bien.
