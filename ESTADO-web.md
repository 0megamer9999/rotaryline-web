# Estado de la web del club (5 nov 2026)

**Publicada el 7 nov 2026, con orden de Pepe, y en marcha en https://rotaryline.es desde el 8 nov.** DNS de IONOS apuntadas a GitHub, certificado de Let's Encrypt aprobado (caduca el 6 feb 2027; GitHub lo renueva solo) y HTTPS obligatorio activado. Si algún día el certificado se atasca: quitar el dominio en Pages y volver a ponerlo (GitHub hace los commits «Delete CNAME» y «Create CNAME»; luego `git pull`).

## Dónde está
- **Proyecto:** `W:\Claude\rotaryline-web`, también accesible desde `W:\WEB R&L\Proyecto web`. Es un enlace: es la misma carpeta, no una copia.
- **Repositorio:** `0megamer9999/rotaryline-web`, **público** y con GitHub Pages **activado** (rama `main`, carpeta `/docs`, dominio `rotaryline.es`, dominio verificado). Los commits llevan el correo privado de GitHub, no la Gmail.
- **Dominio:** `rotaryline.es`. Ya está verificado en GitHub y las DNS de IONOS apuntan a GitHub. El correo `contacto@rotaryline.es` es un reenvío de IONOS a la Gmail del club.

## Cómo se trabaja
- **Dos versiones:**
  - `node construir.mjs` → `local/` (huecos en amarillo y ejemplos a la vista; para saber qué falta). Se ve con `py -3 servir.py` → http://localhost:4180 (configuración «web-club»).
  - `node construir.mjs --publicar` → `docs/` (versión bonita, sin ningún rastro de lo que falta; lo que se publicará). Se ve con `py -3 servir.py publicar` → http://localhost:4181 (configuración «web-club-publicable»).
  - Detalle de lo que quita la publicable en `LEEME.md`. Hay páginas que no salen aún al publicar: aviso legal y privacidad (textos sin redactar).
- Pepe mira la web en el navegador integrado y va diciendo cambios. Se trabaja primero la versión de PC; el móvil (menú con las tres rayitas) va al final.

## Hecho
- **Barra:**
  - Roja con degradado hacia abajo.
  - Logo nuevo en círculo, por encima de la barra.
  - Desplegables: «El club» lleva Quiénes somos, Filosofía, cada coche con su dueño, Trabajos e Historias; «Redes sociales» lleva YouTube, Instagram y TikTok.
- **Inicio:**
  - Portada, con hueco para una foto de grupo con todos los coches.
  - Quiénes somos, con el texto de Pepe y el mosaico de fotos.
  - Filosofía: en la carretera y en el club.
  - Personas, Trabajos, Historias y accesos al resto.
- **Miembros y coches:** Pepe (BMW E39), Mario (Mazda RX-8), Anna (Opel Astra TT), Dani (Hyundai i20 N azul), Obed (Hyundai i20 N rojo y Honda Civic), Barbas/Alejandro (Ford Fiesta ST-Line) y Javi (Honda S2000).
  - Hay fotos de todos menos del Civic.
  - Las matrículas están tapadas.
- **Páginas:**
  - Redes sociales: tres huecos que se cargan al pulsar, el último de YouTube, el último reel de Instagram y el penúltimo de TikTok.
  - Eventos: tabla con quién va, con qué coche y si estará en la expo.
  - Aplicación Garaje y Programa Taller, cada una en su página.
  - Contacto.
  - Aviso legal, Privacidad y Cookies, con el esqueleto y los huecos.
- **Sin cookies ni rastreo.** Las fuentes van en local, con su licencia OFL.

- **Animaciones del inicio (6 nov):** Filosofía entra por los lados, las Personas son tarjetas apiladas con sticky a pantalla completa (la siguiente se desliza sobre la anterior), parallax en el título, mosaico escalonado. Respetan «reducir movimiento».
- **Garaje, Cómo instalarlo:** cada paso tiene su hueco de captura (`estatico/img/instalar/`, nombres en `LEEME.md`). Pepe tiene que hacer las 7 capturas.

- **Tutoriales de Garaje (6 nov):** `tutoriales.html` con 9 tutoriales y 46 capturas reales (vista previa del programa, datos ficticios) con flecha roja; enlazada desde el menú «Aplicación Garaje» y desde la página de Garaje. Falta lo del móvil (hueco solo en local en el tutorial 9) y las ventanas de Windows de guardar/elegir archivo de la copia de seguridad (no se pueden capturar desde el navegador; van descritas solo con texto). Cómo regenerar: `LEEME.md`.

- **Instalar en Android (10 nov):** 8 pasos con las capturas de Pepe y sus flechas (`originales/instalar/android-*.jpg` → `estatico/img/instalar/android-*.webp`). Las de móvil se recortan y llevan el texto más grande (`recorte`, `escala_coords` y `escala_texto` en `datos/anotaciones.json`) y se ven más estrechas (clase `movil`).

- **12 nov:** ficha de Dani completa (texto, Instagram @d_de_anyy y su Hyundai i20 BC3 1.0 100 CV de 2022). Primer evento real: Volrace Ice, con el BMW, el RX-8 y el i20 azul, de público (no corremos ni hacemos drift) y la expo por confirmar. La página de Eventos admite ahora un evento sin fecha cerrada (`fecha: ""` → «Fecha por confirmar»), `expo: "por-confirmar"` y una `nota`. Fecha y lugar puestos el 12 nov: Navarra, 20 y 21 de febrero de 2027 (volrace.com); también va el Barbas con el Fiesta.

- **13 nov (subido):** vídeo de fondo en Filosofía (`estatico/video/filosofia.mp4`, clip de dron del 2:59 al 4:42, 960 px, 4,4 MB, oscurecido; se reproduce solo a la vista; `filosofia_fondo` en `datos/club.json`). En Eventos: coche «preparándose» a la derecha de los eventos futuros, animación de «cuadrando el calendario» cuando el filtro no tiene eventos, y el trazado del circuito de Navarra en la Volrace Ice (de OpenStreetMap, con su crédito; campo `trazado` del evento). Logos de eventos: solo con permiso del organizador.

## Pendiente
1. **Respuestas de los miembros:** `cuestionario-miembros.md`. La excusa es el contenido del canal, porque **la web es una sorpresa**. Con ellas se rellenan los textos de cada persona y las fichas de los coches.
2. **Aplicación Garaje:** capturas reales del programa con datos de ejemplo y textos. Es lo siguiente que propuso Claude.
3. **Programa Taller:** capturas y textos.
4. **Trabajos e Historias:** Pepe tiene que contar cuáles.
5. **Fotos:** Pepe tiene más guardadas, y la carpeta `W:\WEB R&L\Fotos` está vacía por ahora. Faltan la foto de grupo y la del Civic.
6. **Redes:** los enlaces del último vídeo y de los reels.
7. **Textos legales:** los redacta Pepe.
8. **Versión móvil.**
9. **Más adelante:** guías de instalación y uso paso a paso para Garaje y Taller, en la hoja de ruta del Garaje.
10. **Publicar, solo con la orden de Pepe:**
    - Repositorio en público.
    - Pages desde `main` y `/docs`, con dominio `rotaryline.es`.
    - Activar «Enforce HTTPS».
