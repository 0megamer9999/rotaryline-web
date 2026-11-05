// Genera la web estática en docs/ a partir de datos/*.json y plantillas/*.html.
// Sin dependencias: solo Node (>= 18).   Uso:  node construir.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DOCS = join(AQUI, "docs");
const leerJson = (n) => JSON.parse(readFileSync(join(AQUI, "datos", n), "utf8"));
const plantilla = (n) => readFileSync(join(AQUI, "plantillas", n + ".html"), "utf8");

const club = leerJson("club.json");
const miembros = leerJson("miembros.json");
const coches = leerJson("coches.json");
const eventos = leerJson("eventos.json");
const videos = leerJson("videos.json");
const proyectos = leerJson("proyectos.json");
const siluetas = leerJson("siluetas.json");

// ---------------------------------------------------------------- utilidades
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Texto seguro; los «[Por completar...]» salen resaltados para que no se pasen por alto. */
const t = (s) => esc(s).replace(/\[Por completar[^\]]*\]/g, (m) => `<span class="hueco">${m}</span>`);
const insigniaEjemplo = (o) => (o.ejemplo ? ' <span class="ejemplo">Ejemplo</span>' : "");
const cocheDe = (id) => coches.find((c) => c.id === id);
const nombreCoche = (c) => `${c.marca} ${c.modelo}`;

function rellenar(texto, valores, origen) {
  return texto.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in valores)) throw new Error(`Falta el valor «${k}» en la plantilla ${origen}`);
    return valores[k];
  });
}

function silueta(forma, clase = "silueta") {
  const d = siluetas[forma] ?? siluetas.berlina;
  const trazos = d.trazos.map((p) => `<path d="${p.d}"${p.fino ? ' stroke-width="1.6"' : ""}/>`).join("");
  const ruedas = d.ruedas
    .map((w) => `<g><circle class="rueda-fondo" cx="${w.cx}" cy="${w.cy}" r="${w.r}"/>${w.llanta ? `<circle cx="${w.cx}" cy="${w.cy}" r="${w.llanta}" stroke-width="1.6"/>` : ""}<circle cx="${w.cx}" cy="${w.cy}" r="${w.cubo}" stroke-width="1.6"/></g>`)
    .join("");
  const encima = d.encima.map((p) => `<path class="rueda-fondo" d="${p}"/>`).join("");
  return `<svg class="${clase}" viewBox="0 0 140 70" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Silueta del coche">${trazos}${ruedas}${encima}</svg>`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// ---------------------------------------------------------------- piezas comunes
const paginasActivas = club.menu.filter((m) => m.activo !== false);

function menuHtml(raiz, actual) {
  return paginasActivas
    .map((m) => `        <li><a href="${raiz}${m.pagina}.html"${m.pagina === actual ? ' aria-current="page"' : ""}>${esc(m.texto)}</a></li>`)
    .join("\n");
}
const redesPie = (() => {
  const r = club.redes;
  return [r.instagram, r.youtube, r.tiktok].map((x, i) => `          <li><a href="${esc(x.url)}" rel="noopener">${["Instagram", "YouTube", "TikTok"][i]}</a></li>`).join("\n");
})();

const base = plantilla("base");
function pagina({ ruta, pagina: clave, titulo, descripcion, contenido, raiz = "" }) {
  const html = rellenar(base, {
    titulo: esc(titulo === club.nombre ? `${club.nombre} · Club de coches` : `${titulo} · ${club.nombre}`),
    descripcion: esc(descripcion ?? club.descripcion),
    raiz,
    menu: menuHtml(raiz, clave),
    menu_pie: menuHtml(raiz, clave).replace(/^ {8}/gm, "          "),
    redes_pie: redesPie,
    lema: esc(club.lema),
    contenido,
  }, "base");
  const destino = join(DOCS, ruta);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, html.replace(/\r\n/g, "\n"), "utf8");
}
const usar = (nombre, valores) => rellenar(plantilla(nombre), valores, nombre);

// ---------------------------------------------------------------- fragmentos
function tarjetaCoche(c, raiz = "") {
  const dueno = miembros.find((m) => m.id === c.dueno);
  return `<a class="tarjeta" href="${raiz}coches/${c.id}.html">
        <div class="marco-coche">${silueta(c.silueta)}</div>
        <div class="cuerpo"><span class="insignia rojo">${esc(c.motor_tipo)}</span>${c.ejemplo ? '<span class="ejemplo" style="align-self:flex-start">Ejemplo</span>' : ""}
        <h3>${t(nombreCoche(c))}</h3><p>${dueno ? "De " + t(dueno.nombre) + ". " : ""}${t(c.resumen)}</p><span class="mas">Ver el coche &rarr;</span></div></a>`;
}

function tarjetaEvento(e, c = null) {
  const [a, m, d] = e.fecha.split("-");
  const chips = e.coches.map(cocheDe).filter(Boolean).map((x) => `<a class="insignia rojo" href="coches/${x.id}.html" style="text-decoration:none">${t(nombreCoche(x))}</a>`).join("");
  const enlace = e.enlace ? ` <a href="${esc(e.enlace)}" rel="noopener">Más información</a>` : "";
  return `<article class="evento" data-fecha="${esc(e.fecha)}" data-coches="${esc(e.coches.join(" "))}">
      <div class="fecha">${Number(d)} ${MESES[Number(m) - 1].toUpperCase()}<small>${a}</small></div>
      <div><h3>${t(e.nombre)}${insigniaEjemplo(e)}</h3>
      <p class="nota" style="margin:0 0 6px">${t(e.fecha_texto)} &middot; ${t(e.lugar)}</p>
      <p>${t(e.texto)}${enlace}</p><div class="coches">${chips}</div></div></article>`;
}

function tarjetaVideo(v) {
  const miniatura = v.miniatura ? `<img src="${esc(v.miniatura)}" alt="" loading="lazy">` : "";
  const play = `<span class="play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="#fff"><path d="M6 4l14 8-14 8z"/></svg></span>`;
  const aviso = v.ejemplo ? '<span class="aviso-hueco">Ejemplo, sin miniatura</span>' : "";
  const fachada = v.id
    ? `<button class="fachada" type="button" data-youtube="${esc(v.id)}" data-titulo="${esc(v.titulo)}" aria-label="Reproducir: ${esc(v.titulo)}">${miniatura}${play}${aviso}</button>`
    : `<a class="fachada" href="${esc(club.redes.youtube.url)}" rel="noopener" aria-label="Ver en YouTube: ${esc(v.titulo)}">${miniatura}${play}${aviso}</a>`;
  return `<article class="tarjeta video">${fachada}
      <div class="cuerpo"><h3>${t(v.titulo)}${insigniaEjemplo(v)}</h3><p class="nota">${t(v.fecha)}</p><p>${t(v.texto)}</p></div></article>`;
}

const parrafos = (arr) => arr.map((p) => `      <p>${t(p)}</p>`).join("\n");

// ---------------------------------------------------------------- limpiar y copiar estáticos
rmSync(DOCS, { recursive: true, force: true });
mkdirSync(DOCS, { recursive: true });
cpSync(join(AQUI, "estatico"), DOCS, { recursive: true });
if (existsSync(join(AQUI, "CNAME"))) cpSync(join(AQUI, "CNAME"), join(DOCS, "CNAME"));
writeFileSync(join(DOCS, ".nojekyll"), "");

// ---------------------------------------------------------------- páginas
const eventosOrdenados = [...eventos].sort((a, b) => a.fecha.localeCompare(b.fecha));

// Inicio
const reales = coches.filter((c) => !c.ejemplo);
pagina({
  ruta: "index.html", pagina: "index", titulo: club.nombre,
  contenido: usar("inicio", {
    lema: esc(club.lema),
    portada_coches: reales.slice(0, 2).map((c) => `      <a href="coches/${c.id}.html">${silueta(c.silueta)}<div class="pie"><span>${esc(nombreCoche(c))}</span><span>${esc(c.motor_tipo)}</span></div></a>`).join("\n"),
    accesos: paginasActivas.filter((m) => m.pagina !== "index").map((m) => {
      const texto = {
        "quienes-somos": "El club, sus miembros y sus coches.",
        proyectos: "Lo que estamos haciendo.",
        videos: "Los vídeos del canal de YouTube.",
        eventos: "A qué eventos va cada coche, para ir a verlos.",
        aplicaciones: "Garaje y Talleres, las aplicaciones del club.",
        contacto: "Correo e Instagram.",
        tienda: "Los productos del club.",
      }[m.pagina] ?? "";
      return `      <a class="tarjeta" href="${m.pagina}.html"><div class="cuerpo"><h3>${esc(m.texto)}</h3><p>${esc(texto)}</p><span class="mas">Entrar &rarr;</span></div></a>`;
    }).join("\n"),
  }),
});

// Quiénes somos
pagina({
  ruta: "quienes-somos.html", pagina: "quienes-somos", titulo: "Quiénes somos",
  contenido: usar("quienes-somos", {
    texto_club: parrafos(club.quienes_somos),
    miembros: miembros.map((m) => {
      const suyos = m.coches.map(cocheDe).filter(Boolean);
      const ig = m.instagram ? `<p><a href="${esc(m.instagram)}" rel="noopener">Instagram</a></p>` : "";
      return `    <article class="miembro" id="${esc(m.id)}">
      <div class="avatar" aria-hidden="true">${esc([...m.nombre.replace(/^\[.*?\]\s*/, "") || "?"][0] ?? "?").toUpperCase()}</div>
      <div><p class="etiqueta">${t(m.rol)}</p><h2>${t(m.nombre)}${insigniaEjemplo(m)}</h2>
      <p class="texto">${t(m.texto)}</p>${ig}
      <h3 style="margin-top:24px">Sus coches</h3>
      <div class="rejilla">${suyos.map((c) => tarjetaCoche(c)).join("\n")}</div></div></article>`;
    }).join("\n"),
  }),
});

// Una página por coche
for (const c of coches) {
  const dueno = miembros.find((m) => m.id === c.dueno);
  const suyos = eventosOrdenados.filter((e) => e.coches.includes(c.id));
  const galeria = c.galeria.length
    ? c.galeria.map((g) => `      <figure><img src="../${esc(g.archivo)}" alt="${esc(g.alt)}" loading="lazy"><figcaption class="nota">${t(g.alt)}</figcaption></figure>`).join("\n")
    : [1, 2, 3].map(() => `      <div class="hueco-foto">[Por completar: foto del coche]</div>`).join("\n");
  pagina({
    ruta: `coches/${c.id}.html`, pagina: "quienes-somos", raiz: "../",
    titulo: nombreCoche(c).replace(/\[.*?\]/g, "").trim() || "Coche",
    descripcion: c.resumen.replace(/\[.*?\]/g, "").trim() || club.descripcion,
    contenido: usar("coche", {
      marca: t(c.marca), modelo: t(c.modelo),
      subtitulo: `${esc(c.motor_tipo)}${dueno ? " · de " + esc(dueno.nombre) : ""}${c.ejemplo ? ' · <span class="ejemplo">Ejemplo</span>' : ""}`,
      resumen: t(c.resumen),
      silueta: silueta(c.silueta),
      descripcion: parrafos(c.descripcion),
      ficha: c.ficha.map((f) => `        <div><dt>${esc(f.campo)}</dt><dd>${t(f.valor)}</dd></div>`).join("\n"),
      galeria,
      eventos: suyos.length ? suyos.map((e) => tarjetaEvento(e).replace(/href="coches\//g, 'href="')).join("\n") : '    <p class="texto">Todavía no hay eventos para este coche.</p>',
    }),
  });
}

// Proyectos
pagina({
  ruta: "proyectos.html", pagina: "proyectos", titulo: "Proyectos",
  contenido: usar("proyectos", {
    proyectos: proyectos.map((p) => {
      const cuerpo = `<div class="cuerpo"><span class="insignia ${/desarrollo/i.test(p.estado) ? "dorado" : "rojo"}">${t(p.estado)}</span>${insigniaEjemplo(p) ? '<span class="ejemplo" style="align-self:flex-start">Ejemplo</span>' : ""}<h3>${t(p.titulo)}</h3><p>${t(p.texto)}</p>${p.enlace ? `<span class="mas">${esc(p.enlace.texto)} &rarr;</span>` : ""}</div>`;
      return p.enlace ? `      <a class="tarjeta" href="${esc(p.enlace.url)}">${cuerpo}</a>` : `      <article class="tarjeta">${cuerpo}</article>`;
    }).join("\n"),
  }),
});

// Vídeos
pagina({
  ruta: "videos.html", pagina: "videos", titulo: "Vídeos",
  contenido: usar("videos", { canal: esc(club.redes.youtube.url), videos: videos.map(tarjetaVideo).join("\n") }),
});

// Eventos
pagina({
  ruta: "eventos.html", pagina: "eventos", titulo: "Eventos",
  contenido: usar("eventos", {
    chips: `      <button class="chip" type="button" data-filtro-coche="" aria-pressed="true">Todos</button>\n` +
      coches.map((c) => `      <button class="chip" type="button" data-filtro-coche="${c.id}" aria-pressed="false">${esc(nombreCoche(c))}</button>`).join("\n"),
    eventos: eventosOrdenados.map((e) => "      " + tarjetaEvento(e)).join("\n"),
  }),
});

// Aplicaciones
const figura = (archivo, pie) => `      <figure><img src="${archivo}" alt="${esc(pie)}" width="1640" height="860" loading="lazy"><figcaption>${esc(pie)}</figcaption></figure>`;
pagina({
  ruta: "aplicaciones.html", pagina: "aplicaciones", titulo: "Aplicaciones",
  contenido: usar("aplicaciones", {
    descarga_windows: esc(club.garaje.descarga_windows),
    descarga_android: esc(club.garaje.descarga_android),
    capturas_garaje: [
      figura("img/garaje-1-mi-garaje.webp", "Mi garaje: tus vehículos y lo próximo que toca"),
      figura("img/garaje-2-recordatorios.webp", "Recordatorios por kilómetros y por fecha"),
      figura("img/garaje-3-registro.webp", "Registro de cada trabajo realizado"),
      figura("img/garaje-4-documentos.webp", "Documentos del vehículo"),
    ].join("\n"),
    capturas_talleres: [1, 2, 3].map(() => `      <div class="hueco-foto">[Por completar: captura de Talleres]</div>`).join("\n"),
  }),
});

// Contacto
const r = club.redes;
pagina({
  ruta: "contacto.html", pagina: "contacto", titulo: "Contacto",
  contenido: usar("contacto", {
    contacto: [
      `      <li><span>Correo</span>${/^\[/.test(club.correo) ? t(club.correo) : `<a href="mailto:${esc(club.correo)}">${esc(club.correo)}</a>`}</li>`,
      `      <li><span>Instagram</span><a href="${esc(r.instagram.url)}" rel="noopener">${esc(r.instagram.texto)}</a></li>`,
      `      <li><span>YouTube</span><a href="${esc(r.youtube.url)}" rel="noopener">${esc(r.youtube.texto)}</a></li>`,
      `      <li><span>TikTok</span><a href="${esc(r.tiktok.url)}" rel="noopener">${esc(r.tiktok.texto)}</a></li>`,
    ].join("\n"),
  }),
});

// Aviso legal y 404
pagina({
  ruta: "aviso-legal.html", pagina: "aviso-legal", titulo: "Aviso legal",
  contenido: usar("aviso-legal", { correo: t(club.correo), dominio: esc(club.dominio) }),
});
pagina({ ruta: "404.html", pagina: "", titulo: "Página no encontrada", contenido: plantilla("404") });

// Tienda (solo si está activada en club.json)
if (club.menu.some((m) => m.pagina === "tienda" && m.activo !== false)) {
  pagina({ ruta: "tienda.html", pagina: "tienda", titulo: "Tienda", contenido: plantilla("tienda") });
}

const total = (function contar(d) { return readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? contar(join(d, e.name)) : e.name.endsWith(".html") ? 1 : 0), 0); })(DOCS);
console.log(`Web generada en docs/: ${total} páginas.`);
