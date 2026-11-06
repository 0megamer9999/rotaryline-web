// Genera la web estática en docs/ a partir de datos/*.json y plantillas/*.html.
// Sin dependencias: solo Node (>= 18).
//   node construir.mjs             -> local/  (versión de trabajo: huecos y ejemplos a la vista)
//   node construir.mjs --publicar  -> docs/   (versión publicable: sin rastro de lo que falta)
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PUBLICAR = process.argv.includes("--publicar");
const DOCS = join(AQUI, PUBLICAR ? "docs" : "local");
const DIR_SALIDA = PUBLICAR ? "docs" : "local";
// Lo que se quita al publicar (para el resumen final)
const quitado = { huecos: 0, bloques: 0, ejemplos: {}, omitidas: [], otros: [] };
const contarEj = (tipo, n) => { if (n) quitado.ejemplos[tipo] = (quitado.ejemplos[tipo] ?? 0) + n; };
const leerJson = (n) => JSON.parse(readFileSync(join(AQUI, "datos", n), "utf8"));
/** Los bloques <!--solo-local-->…<!--/solo-local--> de las plantillas solo salen en la versión local. */
const RE_SOLO_LOCAL = /[ \t]*<!--solo-local-->[\s\S]*?<!--\/solo-local-->[ \t]*\n?/g;
const _cachePlantillas = new Map();
const plantilla = (n) => {
  if (_cachePlantillas.has(n)) return _cachePlantillas.get(n);
  const txt = readFileSync(join(AQUI, "plantillas", n + ".html"), "utf8");
  const res = PUBLICAR ? txt.replace(RE_SOLO_LOCAL, () => { quitado.bloques++; return ""; }) : txt.replace(/<!--\/?solo-local-->\n?/g, "");
  _cachePlantillas.set(n, res);
  return res;
};
/** HTML que solo existe en la versión local (huecos, avisos). */
const soloLocal = (html) => { if (PUBLICAR) { quitado.bloques++; return ""; } return html; };

const club = leerJson("club.json");
/** En la versión publicable desaparecen los elementos de ejemplo. */
const sinEjemplos = (tipo, lista) => {
  if (!PUBLICAR) return lista;
  const reales = lista.filter((x) => !x.ejemplo);
  contarEj(tipo, lista.length - reales.length);
  return reales;
};
const miembros = sinEjemplos("miembros", leerJson("miembros.json"));
const coches = sinEjemplos("coches", leerJson("coches.json")).filter((c) => !PUBLICAR || !c.dueno || miembros.some((m) => m.id === c.dueno));
const eventos = sinEjemplos("eventos", leerJson("eventos.json")).map((e) => PUBLICAR ? { ...e, asistentes: e.asistentes.filter((x) => coches.some((c) => c.id === x.coche) && miembros.some((m) => m.id === x.miembro)) } : e);
const redes = leerJson("redes.json");
const proyectos = sinEjemplos("proyectos", leerJson("proyectos.json"));
const historias = sinEjemplos("historias", leerJson("historias.json"));
const siluetas = leerJson("siluetas.json");

// ---------------------------------------------------------------- utilidades
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Texto seguro; los «[Por completar...]» salen resaltados para que no se pasen por alto. */
const RE_HUECO = /\[Por completar[^\]]*\]/g;
/** ¿Es un texto que solo era un hueco (o está vacío)? */
const esHueco = (s) => !String(s ?? "").replace(RE_HUECO, "").replace(/[\s.,:;()\-—]+/g, "");
/** Versión publicable: quita los «[Por completar…]» (y el paréntesis que los envuelve). Si todo era hueco, devuelve "". */
function sinHuecos(s) {
  s = String(s ?? "");
  const n = (s.match(RE_HUECO) || []).length;
  if (!n) return s;
  quitado.huecos += n;
  if (esHueco(s)) return "";
  return s.replace(/\s*\([^()]*\[Por completar[^\]]*\][^()]*\)/g, "").replace(RE_HUECO, "").replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
}
const t = (s) => PUBLICAR ? esc(sinHuecos(s)) : esc(s).replace(RE_HUECO, (m) => `<span class="hueco">${m}</span>`);
const insigniaEjemplo = (o) => (o.ejemplo && !PUBLICAR ? ' <span class="ejemplo">Ejemplo</span>' : "");
const cocheDe = (id) => coches.find((c) => c.id === id);
const nombreCoche = (c) => PUBLICAR ? sinHuecos(`${c.marca} ${c.modelo}`) : `${c.marca} ${c.modelo}`;

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
// Páginas legales: en la versión publicable solo salen si ya no les queda ningún hueco por rellenar.
const LEGALES = { "aviso-legal": "Aviso legal", privacidad: "Privacidad", cookies: "Cookies" };
const legalLista = (n) => !PUBLICAR || !/hueco|Por completar/.test(plantilla(n));
const legalesPublicadas = Object.keys(LEGALES).filter(legalLista);
if (PUBLICAR) for (const n of Object.keys(LEGALES)) if (!legalLista(n)) quitado.omitidas.push(`${n}.html (texto legal sin redactar)`);
const NOMBRE_RED = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok" };
const redesConEnlace = Object.keys(NOMBRE_RED).filter((k) => club.redes[k]?.url && !esHueco(club.redes[k].url));

/** <!--sec:nombre-->…<!--/sec:nombre-->: si la sección está vacía se quita entera; si no, solo los marcadores. */
function secciones(html, vacias = []) {
  return html.replace(/<!--sec:([\w-]+)-->([\s\S]*?)<!--\/sec:\1-->\n?/g, (_, n, cuerpo) => {
    if (!vacias.includes(n)) return cuerpo;
    quitado.otros.push(`sección «${n}» vacía`);
    return "";
  });
}

function menuHtml(raiz, actual) {
  return paginasActivas
    .map((m) => {
      if (!m.desplegable) return `        <li><a href="${raiz}${m.pagina}.html"${m.pagina === actual ? ' aria-current="page"' : ""}>${esc(m.texto)}</a></li>`;
      // [href, texto, ¿separador antes?]
      const partes = m.desplegable === "club"
        ? [["index.html#quienes-somos", "Quiénes somos"], ["index.html#filosofia", "Filosofía"],
           ...coches.map((c, i) => [`coches/${c.id}.html`, `${nombreCoche(c)} – ${miembros.find((p) => p.id === c.dueno)?.nombre ?? ""}`, i === 0]),
           ...(proyectos.length ? [["index.html#trabajos", "Trabajos", true]] : []),
           ...(historias.length ? [["index.html#historias", "Historias", !proyectos.length]] : [])]
        : redesConEnlace.map((k) => [`redes.html#${k}`, NOMBRE_RED[k]]);
      const sub = partes.map(([href, txt, sep]) => `            <li${sep ? ' class="sep"' : ""}><a href="${raiz}${href}">${esc(txt)}</a></li>`).join("\n");
      return `        <li class="con-sub"><a href="${raiz}${m.pagina}.html"${m.pagina === actual ? ' aria-current="page"' : ""}>${esc(m.texto)}</a><button class="abre-sub" type="button" aria-expanded="false" aria-label="Mostrar: ${esc(m.texto)}">&#9662;</button>
          <ul class="submenu">
${sub}
          </ul></li>`;
    })
    .join("\n");
}
const redesPie = redesConEnlace.map((k) => `          <li><a href="${esc(club.redes[k].url)}" rel="noopener">${NOMBRE_RED[k]}</a></li>`).join("\n");

const base = plantilla("base");
const VERSION = Date.now().toString(36);
const paginasEscritas = [];
function pagina({ ruta, pagina: clave, titulo, descripcion, contenido, raiz = "" }) {
  const html = rellenar(base, {
    titulo: esc(titulo === club.nombre ? `${club.nombre} · Club de coches` : `${titulo} · ${club.nombre}`),
    descripcion: esc(descripcion ?? club.descripcion),
    raiz,
    menu: menuHtml(raiz, clave),
    version: VERSION,
    menu_pie: paginasActivas.map((m) => `          <li><a href="${raiz}${m.pagina}.html">${esc(m.texto)}</a></li>`).join("\n"),
    redes_pie: redesPie,
    legal_pie: legalesPublicadas.map((n) => ` &middot; <a href="${raiz}${n}.html">${LEGALES[n]}</a>`).join(""),
    lema: esc(club.lema),
    contenido,
  }, "base");
  const destino = join(DOCS, ruta);
  mkdirSync(dirname(destino), { recursive: true });
  const limpio = html.replace(/\r\n/g, "\n");
  writeFileSync(destino, limpio, "utf8");
  paginasEscritas.push([ruta, limpio]);
}
const usar = (nombre, valores, vacias = []) => secciones(rellenar(plantilla(nombre), valores, nombre), vacias);

// ---------------------------------------------------------------- fragmentos
/** Párrafo con texto; en la versión publicable, si solo era un hueco no se pinta. */
const parrafo = (s, cls = "", sangria = "      ") => {
  const x = t(s);
  return x ? `${sangria}<p${cls ? ` class="${cls}"` : ""}>${x}</p>` : "";
};
const parrafos = (arr) => arr.map((p) => parrafo(p)).filter(Boolean).join("\n");
const sinCorchetes = (s) => String(s ?? "").replace(/\[.*?\]/g, "").trim();

/** Un evento = una tarjeta: fecha grande, nombre, lugar y quién va con qué coche (con su insignia de expo).
 *  Con \`soloCoche\` (página de un coche) solo salen quienes llevan ese coche. */
function tarjetaEvento(e, raiz = "", soloCoche = null) {
  const [a, m, d] = e.fecha.split("-");
  let van = soloCoche ? e.asistentes.filter((x) => x.coche === soloCoche.id) : e.asistentes;
  if (soloCoche && !van.length && e.ejemplo) van = [{ miembro: soloCoche.dueno, coche: soloCoche.id, expo: true }]; // solo para el ejemplo local
  const insigniaExpo = (x) => !e.hay_expo ? '<span class="expo sin">Sin expo</span>' : x.expo ? '<span class="expo si">En la expo</span>' : '<span class="expo no">No va a la expo</span>';
  const quien = van.map((x) => {
    const c = cocheDe(x.coche); const p = miembros.find((q) => q.id === x.miembro);
    return '<li><span class="ev-persona">' + (p ? t(p.nombre) : "Por confirmar") + '</span>' + (!soloCoche && c ? ' <a class="ev-coche" href="' + raiz + 'coches/' + c.id + '.html">' + t(nombreCoche(c)) + '</a>' : "") + insigniaExpo(x) + '</li>';
  }).join("");
  const enlace = e.enlace ? '<p><a href="' + esc(e.enlace) + '" rel="noopener">Más información &rarr;</a></p>' : "";
  const lugar = t(e.lugar), fechaTxt = t(e.fecha_texto);
  return '    <article class="ev-card" data-fecha="' + esc(e.fecha) + '" data-coches="' + esc(e.asistentes.map((x) => x.coche).join(" ")) + '">\n' +
    '      <div class="ev-fecha"><b>' + Number(d) + '</b><span>' + MESES[Number(m) - 1].toUpperCase() + '</span><small>' + a + '</small></div>\n' +
    '      <div class="ev-info"><h3>' + t(e.nombre) + insigniaEjemplo(e) + '</h3>' +
    (fechaTxt ? '<p class="nota">' + fechaTxt + '</p>' : "") + (lugar ? '<p class="ev-lugar">' + lugar + '</p>' : "") + enlace +
    (quien ? '<ul class="ev-quien">' + quien + '</ul>' : "") + '</div>\n    </article>';
}
const listaEventos = (lista, raiz = "", soloCoche = null) => '<div class="ev-lista">\n' + lista.map((e) => tarjetaEvento(e, raiz, soloCoche)).join("\n") + '\n  </div>';

/** Fachada de una red: no carga nada de fuera hasta que se pulsa. */
function fachadaRed(tipo, dato) {
  const play = `<span class="play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="#fff"><path d="M6 4l14 8-14 8z"/></svg></span>`;
  const marcos = {
    youtube: dato.id && `https://www.youtube-nocookie.com/embed/${encodeURIComponent(dato.id)}?autoplay=1&rel=0`,
    instagram: dato.codigo && `https://www.instagram.com/reel/${encodeURIComponent(dato.codigo)}/embed`,
    tiktok: dato.id && `https://www.tiktok.com/embed/v2/${encodeURIComponent(dato.id)}`,
  };
  const nombre = NOMBRE_RED[tipo];
  const perfil = club.redes[tipo].url;
  if (!marcos[tipo] && PUBLICAR) {
    quitado.huecos++;
    return `<article class="red red-perfil" id="${tipo}"><p class="etiqueta">${nombre}</p><h3>${esc(club.redes[tipo].texto)}</h3><p><a class="boton primario" href="${esc(perfil)}" rel="noopener">Ver el perfil en ${nombre} &rarr;</a></p></article>`;
  }
  const cuerpo = marcos[tipo]
    ? `<button class="fachada ${tipo}" type="button" data-marco="${esc(marcos[tipo])}" data-titulo="${esc(dato.titulo)}" aria-label="Ver en ${nombre}: ${esc(dato.titulo)}">${play}<span class="aviso-red">Al pulsar se carga ${nombre}</span></button>`
    : `<a class="fachada ${tipo}" href="${esc(perfil)}" rel="noopener" aria-label="Ir a ${nombre}">${play}<span class="aviso-hueco">[Por completar: ${esc(dato.titulo.replace(/^\[Por completar: |\]$/g, ""))}]</span></a>`;
  const titulo = t(dato.titulo);
  return `<article class="red" id="${tipo}"><p class="etiqueta">${nombre}</p>${cuerpo}
      ${titulo ? `<h3>${titulo}</h3>` : ""}<p><a href="${esc(perfil)}" rel="noopener">${esc(club.redes[tipo].texto)} en ${nombre} &rarr;</a></p></article>`;
}

/** Captura de un paso de instalación: estatico/img/instalar/<nombre>.webp. Si no existe: hueco en local, nada al publicar. */
function capturaPaso(nombre, alt) {
  if (existsSync(join(AQUI, "estatico", "img", "instalar", `${nombre}.webp`))) {
    return `<figure class="paso-captura"><img src="img/instalar/${nombre}.webp" alt="${esc(alt)}" loading="lazy"></figure>`;
  }
  if (PUBLICAR) { quitado.otros.push("capturas de instalación sin subir (se ven solo al existir el archivo)"); return ""; }
  return `<div class="hueco-foto paso-captura">[Por completar: captura «${esc(alt)}»<br><b>estatico/img/instalar/${nombre}.webp</b>]</div>`;
}

// ---------------------------------------------------------------- limpiar y copiar estáticos
rmSync(DOCS, { recursive: true, force: true });
mkdirSync(DOCS, { recursive: true });
cpSync(join(AQUI, "estatico"), DOCS, { recursive: true });
if (PUBLICAR && existsSync(join(AQUI, "CNAME"))) cpSync(join(AQUI, "CNAME"), join(DOCS, "CNAME"));
writeFileSync(join(DOCS, ".nojekyll"), "");

// ---------------------------------------------------------------- páginas
const eventosOrdenados = [...eventos].sort((a, b) => a.fecha.localeCompare(b.fecha));

// Inicio: el club entero, desplegado en secciones
const reales = coches.filter((c) => !c.ejemplo);
const bloqueMiembro = (m) => {
  const suyos = m.coches.map(cocheDe).filter(Boolean);
  const ig = m.instagram ? `<p class="pp-ig"><a href="${esc(m.instagram)}" rel="noopener">Instagram</a></p>` : "";
  const ini = esc([...(m.nombre.replace(/^\[.*?\]\s*/, "") || "?")][0] ?? "?").toUpperCase();
  const foto = m.foto
    ? `<div class="pp-foto" style="background-image:url('${esc(m.foto)}')" role="img" aria-label="${esc(m.nombre)}"></div>`
    : `<div class="pp-foto sin-foto"><span class="inicial" aria-hidden="true">${ini}</span>${soloLocal(`<span class="falta">[Por completar: foto de ${esc(m.nombre)}]</span>`)}</div>`;
  const chips = suyos.length
    ? `<p class="subtitulo">${suyos.length > 1 ? "Sus coches" : "Su coche"}</p>
      <div class="chips-coche">${suyos.map((c) => `<a class="chip-coche" href="coches/${c.id}.html">${t(nombreCoche(c))}<span aria-hidden="true"> &rarr;</span></a>`).join("")}</div>`
    : "";
  return `  <article class="persona-pila" id="${esc(m.id)}">
    ${foto}
    <div class="pp-velo" aria-hidden="true"></div>
    <div class="pp-sombra" aria-hidden="true"></div>
    <div class="contenedor pp-cuerpo"><div class="pp-contenido" data-anim="arriba">
      <p class="etiqueta">${t(m.rol)}</p><h3 class="gigante">${t(m.nombre)}${insigniaEjemplo(m)}</h3>
${parrafo(m.texto, "texto", "      ")}
      ${ig}
      ${chips}
    </div></div></article>`;
};
const trabajoHtml = (p, i = 0) => {
  const c = p.coche ? cocheDe(p.coche) : null;
  const estado = t(p.estado);
  const cuerpo = `<div class="cuerpo">${estado ? `<span class="insignia ${/desarrollo/i.test(p.estado) ? "dorado" : "rojo"}">${estado}</span>` : ""}${p.ejemplo && !PUBLICAR ? '<span class="ejemplo" style="align-self:flex-start">Ejemplo</span>' : ""}<h3>${t(p.titulo)}</h3>${c ? `<p class="nota">En el ${t(nombreCoche(c))}</p>` : ""}${parrafo(p.texto, "", "")}${p.enlace ? `<span class="mas">${esc(p.enlace.texto)} &rarr;</span>` : ""}</div>`;
  const anim = ` data-anim="difumina" style="--d:${(i % 3) * 0.18}s"`;
  return p.enlace ? `      <a class="tarjeta"${anim} href="${esc(p.enlace.url)}">${cuerpo}</a>` : `      <article class="tarjeta"${anim}>${cuerpo}</article>`;
};
const historiaHtml = (h) => {
  const cs = h.coches.map(cocheDe).filter(Boolean).map((c) => `<a class="insignia" href="coches/${c.id}.html">${t(nombreCoche(c))}</a>`).join(" ");
  const fecha = t(h.fecha);
  const cab = fecha || (h.ejemplo && !PUBLICAR) ? `<p class="nota">${fecha}${h.ejemplo && !PUBLICAR ? ' <span class="ejemplo">Ejemplo</span>' : ""}</p>` : "";
  const foto = soloLocal(`<div class="historia-foto" aria-hidden="true"><span>[Por completar: foto]</span></div>`);
  return `      <article class="historia">${foto}<div class="historia-cuerpo">${cab}<h3>${t(h.titulo)}</h3>${parrafo(h.texto, "", "")}${cs}</div></article>`;
};
const textosAcceso = { redes: "YouTube, Instagram y TikTok", eventos: "Quién va a cada evento y con qué coche", garaje: "El mantenimiento de tus vehículos", taller: "Para talleres, en desarrollo", contacto: "Correo e Instagram", tienda: "Los productos del club" };

// Fondo de la portada: en local, el hueco de la foto de grupo; al publicar, un mosaico tenue con los coches
const conFoto = reales.filter((c) => c.foto);
const fondoHero = PUBLICAR
  ? `<div class="foto-fondo fondo-mosaico" aria-hidden="true">${conFoto.map((c) => `<img src="${esc(c.foto)}" alt="">`).join("")}</div>`
  : `<div class="foto-fondo" aria-hidden="true"><span>[Por completar: foto de grupo con todos los coches del club]</span></div>`;
if (PUBLICAR) quitado.otros.push("hueco de la foto de grupo (sustituido por un mosaico de los coches)");

pagina({
  ruta: "index.html", pagina: "index", titulo: club.nombre,
  contenido: usar("inicio", {
    lema: esc(club.lema),
    fondo_hero: fondoHero,
    texto_club: parrafos(club.quienes_somos),
    filosofia: club.filosofia.map((f, i) => `      <div class="filosofia-parte" data-anim="izq"><h3>${esc(f.titulo)}</h3>\n${parrafos(f.parrafos)}\n      </div>`).join("\n"),
    filas_fotos: String(Math.max(1, Math.ceil(conFoto.length / 2))),
    portada_coches: conFoto.map((c) => `      <a href="coches/${c.id}.html"><img src="${esc(c.foto)}" alt="${esc(nombreCoche(c))}" loading="lazy"><span>${esc(nombreCoche(c))}</span></a>`).join("\n"),
    miembros: miembros.map((m) => bloqueMiembro(m) + '\n  <div class="pp-pausa" aria-hidden="true"></div>').join("\n"),
    trabajos: proyectos.map((p, i) => trabajoHtml(p, i)).join("\n"),
    historias: historias.map(historiaHtml).join("\n"),
    accesos: paginasActivas.filter((m) => m.desplegable !== "club").map((m) => `  <a href="${m.pagina}.html"><b>${esc(m.texto)}</b><span>${esc(textosAcceso[m.pagina] ?? "")}</span></a>`).join("\n"),
  }, [!miembros.length && "personas", !proyectos.length && "trabajos", !historias.length && "historias"].filter(Boolean)),
});

// Una página por coche
for (const c of coches) {
  const dueno = miembros.find((m) => m.id === c.dueno);
  const suyosReales = eventosOrdenados.filter((e) => e.asistentes.some((x) => x.coche === c.id));
  // En local, sin eventos reales del coche, se enseña el ejemplo; al publicar la sección no sale
  const suyos = suyosReales.length || PUBLICAR ? suyosReales : eventosOrdenados.filter((e) => e.ejemplo);
  const galeria = c.galeria.length
    ? c.galeria.map((g, i) => `      <figure data-anim="izq" style="--d:${(i % 4) * 0.22}s"><img src="../${esc(g.archivo)}" alt="${esc(g.alt)}" loading="lazy"><figcaption class="nota">${t(g.alt)}</figcaption></figure>`).join("\n")
    : PUBLICAR ? "" : [1, 2, 3].map(() => `      <div class="hueco-foto">[Por completar: foto del coche]</div>`).join("\n");
  const descripcion = parrafos(c.descripcion);
  // Ficha: en la versión publicable, las filas que eran solo un hueco no se pintan
  const filas = c.ficha.map((f) => {
    if (Array.isArray(f.valor)) {
      const items = f.valor.map((v) => t(v)).filter(Boolean);
      return items.length ? `        <div><dt>${esc(f.campo)}</dt><dd><ul>${items.map((v) => `<li>${v}</li>`).join("")}</ul></dd></div>` : "";
    }
    const v = t(f.valor);
    return v ? `        <div><dt>${esc(f.campo)}</dt><dd>${v}</dd></div>` : "";
  }).filter(Boolean);
  const resumen = parrafo(c.resumen, "texto", "        ");
  const vacias = [!descripcion && "descripcion", !filas.length && "ficha", (!descripcion && !filas.length) && "detalle", !galeria && "galeria", (!suyos.length && PUBLICAR) && "eventos"].filter(Boolean);
  pagina({
    ruta: `coches/${c.id}.html`, pagina: "index", raiz: "../",
    titulo: sinCorchetes(nombreCoche(c)) || "Coche",
    descripcion: sinCorchetes(c.resumen) || club.descripcion,
    contenido: usar("coche", {
      marca: t(c.marca), modelo: t(c.modelo),
      subtitulo: `${esc(c.motor_tipo)}${dueno ? " · de " + esc(dueno.nombre) : ""}${c.ejemplo && !PUBLICAR ? ' · <span class="ejemplo">Ejemplo</span>' : ""}`,
      resumen,
      clase_hero: c.foto ? "" : " sin-foto",
      silueta: c.foto ? `<img src="../${esc(c.foto)}" alt="${esc(nombreCoche(c))}">` : silueta(c.silueta),
      descripcion,
      ficha: filas.join("\n"),
      galeria,
      eventos: suyos.length ? listaEventos(suyos, "../", c) : '    <p class="texto">Todavía no hay eventos para este coche.</p>',
    }, vacias),
  });
}

// Redes sociales: lo último de cada red, con fachada
const hayEmbed = redesConEnlace.some((k) => redes[k].id || redes[k].codigo);
pagina({
  ruta: "redes.html", pagina: "redes", titulo: "Redes sociales",
  contenido: usar("redes", {
    texto: parrafos(redes.texto),
    redes: redesConEnlace.map((k) => fachadaRed(k, redes[k])).join("\n"),
  }, [(!hayEmbed && PUBLICAR) && "nota-carga", !parrafos(redes.texto) && "texto-redes"].filter(Boolean)),
});

// Eventos: quién va, con qué coche y si está en la expo
pagina({
  ruta: "eventos.html", pagina: "eventos", titulo: "Eventos",
  contenido: usar("eventos", {
    chips: `      <button class="chip" type="button" data-filtro-coche="" aria-pressed="true">Todos</button>\n` +
      coches.map((c) => `      <button class="chip" type="button" data-filtro-coche="${c.id}" aria-pressed="false">${esc(nombreCoche(c))}</button>`).join("\n"),
    eventos: listaEventos(eventosOrdenados),
  }, eventosOrdenados.length ? ["proximamente"] : ["lista"]),
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
    cap_windows_1: capturaPaso("windows-1-descarga", "Página de descargas de Garaje: el archivo _x64-setup.exe"),
    cap_windows_2: capturaPaso("windows-2-smartscreen", "Aviso «Windows protegió su PC»: Más información y Ejecutar de todas formas"),
    cap_windows_3: capturaPaso("windows-3-instalador", "El instalador de Garaje"),
    cap_windows_4: capturaPaso("windows-4-primer-vehiculo", "Añadir el primer vehículo en Garaje"),
    cap_android_1: capturaPaso("android-1-descarga", "Descarga de la app Android (.apk)"),
    cap_android_2: capturaPaso("android-2-permiso", "Permiso para instalar aplicaciones de esa fuente"),
    cap_android_3: capturaPaso("android-3-conectar", "Conectar la app con el programa del ordenador"),
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
const filaContacto = (k) => (redesConEnlace.includes(k) ? `      <li><span>${NOMBRE_RED[k]}</span><a href="${esc(r[k].url)}" rel="noopener">${esc(r[k].texto)}</a></li>` : "");
pagina({
  ruta: "contacto.html", pagina: "contacto", titulo: "Contacto",
  contenido: usar("contacto", {
    contacto: [
      PUBLICAR && esHueco(club.correo) ? "" : `      <li><span>Correo</span>${/^\[/.test(club.correo) ? t(club.correo) : `<a href="mailto:${esc(club.correo)}">${esc(club.correo)}</a>`}</li>`,
      filaContacto("instagram"), filaContacto("youtube"), filaContacto("tiktok"),
    ].filter(Boolean).join("\n"),
  }),
});

// Páginas legales y 404
const correoLegal = /^\[/.test(club.correo) ? t(club.correo) : `<a href="mailto:${esc(club.correo)}">${esc(club.correo)}</a>`;
if (legalesPublicadas.includes("aviso-legal")) pagina({ ruta: "aviso-legal.html", pagina: "aviso-legal", titulo: "Aviso legal", contenido: usar("aviso-legal", { correo: correoLegal, dominio: esc(club.dominio) }) });
if (legalesPublicadas.includes("privacidad")) pagina({ ruta: "privacidad.html", pagina: "privacidad", titulo: "Privacidad", contenido: usar("privacidad", { correo: correoLegal, dominio: esc(club.dominio) }) });
if (legalesPublicadas.includes("cookies")) pagina({ ruta: "cookies.html", pagina: "cookies", titulo: "Cookies", contenido: usar("cookies", { dominio: esc(club.dominio) }) });
pagina({ ruta: "404.html", pagina: "", titulo: "Página no encontrada", contenido: plantilla("404") });

// Tienda (solo si está activada en club.json)
if (club.menu.some((m) => m.pagina === "tienda" && m.activo !== false)) {
  pagina({ ruta: "tienda.html", pagina: "tienda", titulo: "Tienda", contenido: plantilla("tienda") });
}

// ---------------------------------------------------------------- resumen
console.log(`Web ${PUBLICAR ? "PUBLICABLE" : "LOCAL"} generada en ${DIR_SALIDA}/: ${paginasEscritas.length} páginas.`);
if (PUBLICAR) {
  // Red de seguridad: nada que delate que falta algo
  const rastro = /Por completar|class="[^"]*\b(hueco|hueco-foto|falta|aviso-hueco|ejemplo)\b|>Ejemplo</i;
  const fallos = paginasEscritas.filter(([, h]) => rastro.test(h)).map(([n]) => n);
  const ej = Object.entries(quitado.ejemplos).map(([k, n]) => `${n} de ${k}`);
  const partes = [
    ej.length && `ejemplos (${ej.join(", ")})`,
    `${quitado.huecos} huecos «Por completar» de los datos`,
    `${quitado.bloques} bloques de plantilla solo-local`,
    ...quitado.omitidas.map((o) => `página omitida: ${o}`),
    ...[...new Set(quitado.otros)],
  ].filter(Boolean);
  console.log("Quitado: " + partes.join("; ") + ".");
  if (fallos.length) { console.error("¡OJO! Queda rastro de huecos o ejemplos en: " + fallos.join(", ")); process.exitCode = 1; }
}
