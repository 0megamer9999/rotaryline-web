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
const redes = leerJson("redes.json");
const proyectos = leerJson("proyectos.json");
const historias = leerJson("historias.json");
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
    .map((m) => {
      if (!m.desplegable) return `        <li><a href="${raiz}${m.pagina}.html"${m.pagina === actual ? ' aria-current="page"' : ""}>${esc(m.texto)}</a></li>`;
      // [href, texto, ¿separador antes?]
      const partes = m.desplegable === "club"
        ? [["index.html#quienes-somos", "Quiénes somos"], ["index.html#filosofia", "Filosofía"],
           ...coches.map((c, i) => [`coches/${c.id}.html`, `${nombreCoche(c)} – ${miembros.find((p) => p.id === c.dueno)?.nombre ?? ""}`, i === 0]),
           ["index.html#trabajos", "Trabajos", true], ["index.html#historias", "Historias"]]
        : [["redes.html#youtube", "YouTube"], ["redes.html#instagram", "Instagram"], ["redes.html#tiktok", "TikTok"]];
      const sub = partes.map(([href, txt, sep]) => `            <li${sep ? ' class="sep"' : ""}><a href="${raiz}${href}">${esc(txt)}</a></li>`).join("\n");
      return `        <li class="con-sub"><a href="${raiz}${m.pagina}.html"${m.pagina === actual ? ' aria-current="page"' : ""}>${esc(m.texto)}</a><button class="abre-sub" type="button" aria-expanded="false" aria-label="Mostrar: ${esc(m.texto)}">&#9662;</button>
          <ul class="submenu">
${sub}
          </ul></li>`;
    })
    .join("\n");
}
const redesPie = (() => {
  const r = club.redes;
  return [r.instagram, r.youtube, r.tiktok].map((x, i) => `          <li><a href="${esc(x.url)}" rel="noopener">${["Instagram", "YouTube", "TikTok"][i]}</a></li>`).join("\n");
})();

const base = plantilla("base");
const VERSION = Date.now().toString(36);
function pagina({ ruta, pagina: clave, titulo, descripcion, contenido, raiz = "" }) {
  const html = rellenar(base, {
    titulo: esc(titulo === club.nombre ? `${club.nombre} · Club de coches` : `${titulo} · ${club.nombre}`),
    descripcion: esc(descripcion ?? club.descripcion),
    raiz,
    menu: menuHtml(raiz, clave),
    version: VERSION,
    menu_pie: paginasActivas.map((m) => `          <li><a href="${raiz}${m.pagina}.html">${esc(m.texto)}</a></li>`).join("\n"),
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
        <div class="marco-coche${c.foto ? " con-foto" : ""}">${c.foto ? `<img src="${raiz}${esc(c.foto)}" alt="${esc(nombreCoche(c))}" loading="lazy">` : silueta(c.silueta)}</div>
        <div class="cuerpo"><span class="insignia rojo">${esc(c.motor_tipo)}</span>${c.ejemplo ? '<span class="ejemplo" style="align-self:flex-start">Ejemplo</span>' : ""}
        <h3>${t(nombreCoche(c))}</h3><p>${dueno ? "De " + t(dueno.nombre) + ". " : ""}${t(c.resumen)}</p><span class="mas">Ver el coche &rarr;</span></div></a>`;
}

/** Un evento = un <tbody> con una fila por persona y coche que va. Los datos del evento ocupan la primera fila (rowspan). */
function filasEvento(e, raiz = "") {
  const [a, m, d] = e.fecha.split("-");
  const van = e.asistentes.length ? e.asistentes : [{ miembro: "", coche: "", expo: false }];
  const n = van.length;
  const enlace = e.enlace ? `<br><a href="${esc(e.enlace)}" rel="noopener">Más información</a>` : "";
  const filas = van.map((x, i) => {
    const c = cocheDe(x.coche); const p = miembros.find((q) => q.id === x.miembro);
    const expo = !e.hay_expo ? '<span class="nota">Sin expo</span>' : x.expo ? '<span class="insignia rojo">Sí</span>' : '<span class="nota">No</span>';
    const cab = i === 0 ? `<td rowspan="${n}" class="fecha">${Number(d)} ${MESES[Number(m) - 1].toUpperCase()}<small>${a}</small></td>
        <td rowspan="${n}"><b>${t(e.nombre)}</b>${insigniaEjemplo(e)}<br><span class="nota">${t(e.fecha_texto)}</span>${enlace}</td>
        <td rowspan="${n}">${t(e.lugar)}</td>` : "";
    return `      <tr>${cab}
        <td>${p ? t(p.nombre) : "—"}</td><td>${c ? `<a href="${raiz}coches/${c.id}.html">${t(nombreCoche(c))}</a>` : "—"}</td><td>${expo}</td></tr>`;
  }).join("\n");
  return `    <tbody class="evento" data-fecha="${esc(e.fecha)}" data-coches="${esc(e.asistentes.map((x) => x.coche).join(" "))}">
${filas}
    </tbody>`;
}
const tablaEventos = (lista, raiz = "") => `<div class="tabla-envoltura"><table class="tabla-eventos">
    <thead><tr><th>Fecha</th><th>Evento</th><th>Lugar</th><th>Quién</th><th>Coche</th><th>En la expo</th></tr></thead>
${lista.map((e) => filasEvento(e, raiz)).join("\n")}
  </table></div>`;

/** Fachada de una red: no carga nada de fuera hasta que se pulsa. */
function fachadaRed(tipo, dato) {
  const play = `<span class="play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="#fff"><path d="M6 4l14 8-14 8z"/></svg></span>`;
  const marcos = {
    youtube: dato.id && `https://www.youtube-nocookie.com/embed/${encodeURIComponent(dato.id)}?autoplay=1&rel=0`,
    instagram: dato.codigo && `https://www.instagram.com/reel/${encodeURIComponent(dato.codigo)}/embed`,
    tiktok: dato.id && `https://www.tiktok.com/embed/v2/${encodeURIComponent(dato.id)}`,
  };
  const nombre = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok" }[tipo];
  const perfil = club.redes[tipo].url;
  const cuerpo = marcos[tipo]
    ? `<button class="fachada ${tipo}" type="button" data-marco="${esc(marcos[tipo])}" data-titulo="${esc(dato.titulo)}" aria-label="Ver en ${nombre}: ${esc(dato.titulo)}">${play}<span class="aviso-red">Al pulsar se carga ${nombre}</span></button>`
    : `<a class="fachada ${tipo}" href="${esc(perfil)}" rel="noopener" aria-label="Ir a ${nombre}">${play}<span class="aviso-hueco">[Por completar: ${esc(dato.titulo.replace(/^\[Por completar: |\]$/g, ""))}]</span></a>`;
  return `<article class="red" id="${tipo}"><p class="etiqueta">${nombre}</p>${cuerpo}
      <h3>${t(dato.titulo)}</h3><p><a href="${esc(perfil)}" rel="noopener">${esc(club.redes[tipo].texto)} en ${nombre} &rarr;</a></p></article>`;
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

// Inicio: el club entero, desplegado en secciones
const reales = coches.filter((c) => !c.ejemplo);
const bloqueMiembro = (m, i) => {
  const suyos = m.coches.map(cocheDe).filter(Boolean);
  const ig = m.instagram ? `<p><a href="${esc(m.instagram)}" rel="noopener">Instagram</a></p>` : "";
  const ini = esc([...(m.nombre.replace(/^\[.*?\]\s*/, "") || "?")][0] ?? "?").toUpperCase();
  return `  <article class="persona${i % 2 ? " inversa" : ""}" id="${esc(m.id)}">
    ${m.foto ? `<div class="persona-foto con-foto" style="background-image:url('${esc(m.foto)}')" role="img" aria-label="${esc(m.nombre)}"></div>` : `<div class="persona-foto"><span class="inicial" aria-hidden="true">${ini}</span><span class="falta">[Por completar: foto de ${esc(m.nombre)}]</span></div>`}
    <div class="persona-texto"><p class="etiqueta">${t(m.rol)}</p><h3 class="gigante">${t(m.nombre)}${insigniaEjemplo(m)}</h3>
      <p class="texto">${t(m.texto)}</p>${ig}
      <p class="subtitulo">Sus coches</p>
      <div class="rejilla">${suyos.map((c) => tarjetaCoche(c)).join("\n")}</div></div></article>`;
};
const trabajoHtml = (p) => {
  const c = p.coche ? cocheDe(p.coche) : null;
  const cuerpo = `<div class="cuerpo"><span class="insignia ${/desarrollo/i.test(p.estado) ? "dorado" : "rojo"}">${t(p.estado)}</span>${p.ejemplo ? '<span class="ejemplo" style="align-self:flex-start">Ejemplo</span>' : ""}<h3>${t(p.titulo)}</h3>${c ? `<p class="nota">En el ${t(nombreCoche(c))}</p>` : ""}<p>${t(p.texto)}</p>${p.enlace ? `<span class="mas">${esc(p.enlace.texto)} &rarr;</span>` : ""}</div>`;
  return p.enlace ? `      <a class="tarjeta" href="${esc(p.enlace.url)}">${cuerpo}</a>` : `      <article class="tarjeta">${cuerpo}</article>`;
};
const historiaHtml = (h) => {
  const cs = h.coches.map(cocheDe).filter(Boolean).map((c) => `<a class="insignia" href="coches/${c.id}.html">${t(nombreCoche(c))}</a>`).join(" ");
  return `      <article class="historia"><div class="historia-foto" aria-hidden="true"><span>[Por completar: foto]</span></div><div class="historia-cuerpo"><p class="nota">${t(h.fecha)}${h.ejemplo ? ' <span class="ejemplo">Ejemplo</span>' : ""}</p><h3>${t(h.titulo)}</h3><p>${t(h.texto)}</p>${cs}</div></article>`;
};
const textosAcceso = { redes: "YouTube, Instagram y TikTok", eventos: "Quién va a cada evento y con qué coche", garaje: "El mantenimiento de tus vehículos", taller: "Para talleres, en desarrollo", contacto: "Correo e Instagram", tienda: "Los productos del club" };
pagina({
  ruta: "index.html", pagina: "index", titulo: club.nombre,
  contenido: usar("inicio", {
    lema: esc(club.lema),
    texto_club: parrafos(club.quienes_somos),
    filosofia: club.filosofia.map((f) => `      <div class="filosofia-parte"><h3>${esc(f.titulo)}</h3>\n${parrafos(f.parrafos)}\n      </div>`).join("\n"),
    portada_coches: reales.filter((c) => c.foto).map((c) => `      <a href="coches/${c.id}.html"><img src="${esc(c.foto)}" alt="${esc(nombreCoche(c))}" loading="lazy"><span>${esc(nombreCoche(c))}</span></a>`).join("\n"),
    miembros: miembros.map(bloqueMiembro).join("\n"),
    trabajos: proyectos.map(trabajoHtml).join("\n"),
    historias: historias.map(historiaHtml).join("\n"),
    accesos: paginasActivas.filter((m) => m.desplegable !== "club").map((m) => `  <a href="${m.pagina}.html"><b>${esc(m.texto)}</b><span>${esc(textosAcceso[m.pagina] ?? "")}</span></a>`).join("\n"),
  }),
});

// Una página por coche
for (const c of coches) {
  const dueno = miembros.find((m) => m.id === c.dueno);
  const suyos = eventosOrdenados.filter((e) => e.asistentes.some((x) => x.coche === c.id));
  const galeria = c.galeria.length
    ? c.galeria.map((g) => `      <figure><img src="../${esc(g.archivo)}" alt="${esc(g.alt)}" loading="lazy"><figcaption class="nota">${t(g.alt)}</figcaption></figure>`).join("\n")
    : [1, 2, 3].map(() => `      <div class="hueco-foto">[Por completar: foto del coche]</div>`).join("\n");
  pagina({
    ruta: `coches/${c.id}.html`, pagina: "index", raiz: "../",
    titulo: nombreCoche(c).replace(/\[.*?\]/g, "").trim() || "Coche",
    descripcion: c.resumen.replace(/\[.*?\]/g, "").trim() || club.descripcion,
    contenido: usar("coche", {
      marca: t(c.marca), modelo: t(c.modelo),
      subtitulo: `${esc(c.motor_tipo)}${dueno ? " · de " + esc(dueno.nombre) : ""}${c.ejemplo ? ' · <span class="ejemplo">Ejemplo</span>' : ""}`,
      resumen: t(c.resumen),
      silueta: c.foto ? `<img src="../${esc(c.foto)}" alt="${esc(nombreCoche(c))}">` : silueta(c.silueta),
      descripcion: parrafos(c.descripcion),
      ficha: c.ficha.map((f) => `        <div><dt>${esc(f.campo)}</dt><dd>${Array.isArray(f.valor) ? `<ul>${f.valor.map((v) => `<li>${t(v)}</li>`).join("")}</ul>` : t(f.valor)}</dd></div>`).join("\n"),
      galeria,
      eventos: suyos.length ? tablaEventos(suyos, "../") : '    <p class="texto">Todavía no hay eventos para este coche.</p>',
    }),
  });
}

// Redes sociales: lo último de cada red, con fachada
pagina({
  ruta: "redes.html", pagina: "redes", titulo: "Redes sociales",
  contenido: usar("redes", {
    texto: parrafos(redes.texto),
    redes: ["youtube", "instagram", "tiktok"].map((k) => fachadaRed(k, redes[k])).join("\n"),
  }),
});

// Eventos: quién va, con qué coche y si está en la expo
pagina({
  ruta: "eventos.html", pagina: "eventos", titulo: "Eventos",
  contenido: usar("eventos", {
    chips: `      <button class="chip" type="button" data-filtro-coche="" aria-pressed="true">Todos</button>\n` +
      coches.map((c) => `      <button class="chip" type="button" data-filtro-coche="${c.id}" aria-pressed="false">${esc(nombreCoche(c))}</button>`).join("\n"),
    eventos: tablaEventos(eventosOrdenados),
  }),
});

// Aplicación Garaje y Programa Taller, cada uno en su página
const figura = (archivo, pie) => `      <figure><img src="${archivo}" alt="${esc(pie)}" width="1640" height="860" loading="lazy"><figcaption>${esc(pie)}</figcaption></figure>`;
pagina({
  ruta: "garaje.html", pagina: "garaje", titulo: "Aplicación Garaje",
  contenido: usar("garaje", {
    videos_garaje: esc(club.redes.youtube.url.replace(/\/$/, "") + "/search?query=Garaje"),
    descarga_windows: esc(club.garaje.descarga_windows),
    descarga_android: esc(club.garaje.descarga_android),
    capturas_garaje: [
      figura("img/garaje-1-mi-garaje.webp", "Mi garaje: tus vehículos y lo próximo que toca"),
      figura("img/garaje-2-recordatorios.webp", "Recordatorios por kilómetros y por fecha"),
      figura("img/garaje-3-registro.webp", "Registro de cada trabajo realizado"),
      figura("img/garaje-4-documentos.webp", "Documentos del vehículo"),
    ].join("\n"),
  }),
});
pagina({
  ruta: "taller.html", pagina: "taller", titulo: "Programa Taller",
  contenido: usar("taller", {
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
pagina({ ruta: "privacidad.html", pagina: "privacidad", titulo: "Privacidad", contenido: usar("privacidad", { correo: t(club.correo), dominio: esc(club.dominio) }) });
pagina({ ruta: "cookies.html", pagina: "cookies", titulo: "Cookies", contenido: usar("cookies", { dominio: esc(club.dominio) }) });
pagina({ ruta: "404.html", pagina: "", titulo: "Página no encontrada", contenido: plantilla("404") });

// Tienda (solo si está activada en club.json)
if (club.menu.some((m) => m.pagina === "tienda" && m.activo !== false)) {
  pagina({ ruta: "tienda.html", pagina: "tienda", titulo: "Tienda", contenido: plantilla("tienda") });
}

const total = (function contar(d) { return readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? contar(join(d, e.name)) : e.name.endsWith(".html") ? 1 : 0), 0); })(DOCS);
console.log(`Web generada en docs/: ${total} páginas.`);
