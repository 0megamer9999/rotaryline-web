// Saca las capturas de los tutoriales de Garaje con Edge sin ventana (CDP) sobre la vista previa del programa (Vite).
// Antes:  cd C:\Users\pepes\Garaje-talleres\app  y  npx vite --port 1460 --strictPort   (en segundo plano)
// Uso:    node capturar-tutoriales.mjs     → originales/tutoriales/*.png + datos/anotaciones-tutoriales.json
// Luego:  py -3 anotar.py                  → estatico/img/tutoriales/*.webp (con flechas)
// Datos de ejemplo ficticios y un perfil temporal limpio. No toca el código ni los datos del programa.
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(AQUI, "originales", "tutoriales");
const URL_APP = "http://localhost:1460/";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const W = 1360, H = 800, DSF = 2;
mkdirSync(SALIDA, { recursive: true });

// ------------------------------------------------------------ Edge por CDP
const perfilTmp = mkdtempSync(join(tmpdir(), "edge-tut-"));
const proc = spawn(EDGE, ["--headless=new", "--remote-debugging-port=9333", `--user-data-dir=${perfilTmp}`, `--window-size=${W},${H}`, "--no-first-run", URL_APP], { stdio: "ignore" });
let tabs;
for (let i = 0; i < 60; i++) { try { tabs = await (await fetch("http://127.0.0.1:9333/json")).json(); if (tabs.find((t) => t.type === "page")) break; } catch {} await new Promise((r) => setTimeout(r, 300)); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let nid = 0; const pend = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++nid; pend.set(i, (m) => (m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: DSF, mobile: false });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails)); return r.result.value; };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
await esperar(2500);

// ------------------------------------------------------------ utilidades de la página
const J = JSON.stringify;
const LIN = "String.fromCharCode(10)";
/** Elementos visibles cuyo primer renglón de texto empieza por t (sin mayúsculas). */
const buscar = (t, sel, n = 0) => `(()=>{const q=${J(t.toLowerCase())};const c=[...document.querySelectorAll(${J(sel)})].filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0&&(x.innerText||'').trim().split(${LIN})[0].trim().toLowerCase().startsWith(q)});return c[${n}]||null})()`;
const clic = async (t, sel = "button", n = 0) => { const r = await ev(`(()=>{const e=${buscar(t, sel, n)};if(!e)return false;e.scrollIntoView({block:'center'});e.click();return true})()`); if (!r) throw new Error(`No encuentro para pulsar: «${t}»`); await esperar(450); };
const poner = async (sel, i, v) => { const r = await ev(`(()=>{const e=document.querySelectorAll(${J(sel)})[${i}];if(!e)return false;const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${J(v)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`); if (!r) throw new Error(`No hay campo ${sel}[${i}]`); await esperar(150); };
const ocultar = (textos) => ev(`(()=>{const ts=${J(textos.map((s) => s.toLowerCase()))};document.querySelectorAll('p,span,div,small,h1,h2,h3,b,i,em,strong,code,pre,textarea').forEach(e=>{if(e.children.length>1||e.querySelector('svg,img,canvas'))return;const x=((e.innerText||e.value||'')).trim().toLowerCase();if(x&&ts.some(t=>x.startsWith(t)))e.style.visibility='hidden'})})()`);

const anotaciones = [];
/** Expresión que devuelve el elemento de una caja: por texto del primer renglón (t, sel), por campo con etiqueta (campo) o por css (css). */
const elemento = (c) => c.clase ? `([...document.querySelectorAll('[class*=${c.clase}]')].filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&(x.innerText||'').toLowerCase().includes(${J(c.contiene.toLowerCase())})}).sort((a,b)=>a.getBoundingClientRect().width*a.getBoundingClientRect().height-b.getBoundingClientRect().width*b.getBoundingClientRect().height)[${c.n ?? 0}]||null)`
  : c.css ? `(document.querySelectorAll(${J(c.css)})[${c.n ?? 0}]||null)`
  : c.campo ? `(()=>{const l=${buscar(c.campo, "label", c.n ?? 0)};return l&&l.querySelector('input,select,textarea')})()`
  : buscar(c.t, c.sel ?? "button", c.n ?? 0);
/** Una captura: cajas = [{ t, sel, campo, css, n, texto, lado, en }]. Saca el rectángulo de cada una del DOM y guarda el original.
 *  centrar: índice de la caja que se lleva al centro de la ventana (0 por defecto; -1 = no mover). clip: [x0,y0,x1,y1] en px CSS para recortar. */
async function paso(id, cajas, { antes, centrar = 0, clip } = {}) {
  if (antes) await antes();
  if (cajas.length && centrar >= 0) await ev(`(()=>{const e=${elemento(cajas[centrar])};if(e)e.scrollIntoView({block:'center'})})()`);
  await esperar(500);
  const rects = [];
  for (const c of cajas) {
    const r = await ev(`(()=>{const e=${elemento(c)};if(!e)return null;const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]})()`);
    if (!r) throw new Error(`${id}: no encuentro la caja «${c.t ?? c.campo ?? c.css ?? c.contiene}»`);
    rects.push(r);
  }
  // clip "auto": un recorte alrededor de las cajas (mínimo 720x440 px CSS) para que el texto se lea grande
  if (clip === "auto") {
    const x0 = Math.min(...rects.map((r) => r[0])), y0 = Math.min(...rects.map((r) => r[1])), x1 = Math.max(...rects.map((r) => r[2])), y1 = Math.max(...rects.map((r) => r[3]));
    const an = Math.min(W, Math.max(720, x1 - x0 + 200)), al = Math.min(H, Math.max(440, y1 - y0 + 220));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const ax = Math.min(Math.max(0, cx - an / 2), W - an), ay = Math.min(Math.max(0, cy - al / 2), H - al);
    clip = [ax, ay, ax + an, ay + al];
  }
  const ox = clip ? clip[0] : 0, oy = clip ? clip[1] : 0, an = clip ? clip[2] - clip[0] : W, al = clip ? clip[3] - clip[1] : H;
  cajas.forEach((c, i) => { const r = rects[i]; if (r[1] < oy || r[3] > oy + al || r[0] < ox || r[2] > ox + an) console.warn(`AVISO ${id}: «${c.t ?? c.campo ?? c.css ?? c.contiene}» queda fuera de la captura`, r.map(Math.round)); });
  const escala = clip ? Math.min(3, 1150 / (an * DSF)) : 1;
  const img = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip: { x: ox, y: oy, width: an, height: al, scale: escala } } : {}) });
  const buf = Buffer.from(img.data, "base64");
  writeFileSync(join(SALIDA, `${id}.png`), buf);
  const f = buf.readUInt32BE(16) / an; // px de la imagen por px CSS
  const flechas = cajas.map((c, i) => ({ caja: [rects[i][0] - ox, rects[i][1] - oy, rects[i][2] - ox, rects[i][3] - oy].map((v) => Math.round(v * f)), texto: c.texto, ...(c.lado ? { lado: c.lado } : {}), ...(c.en ? { en: c.en } : {}) }));
  anotaciones.push({ carpeta: "tutoriales", origen: `${id}.png`, destino: id, flechas });
  console.log("captura", id, `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`);
}
// En la vista previa el QR es un recuadro con el texto "QR de ejemplo". Para la captura se dibuja uno parecido (solo ilustra: no se puede leer).
const falsoQR = () => ev(`(()=>{document.querySelectorAll('main svg').forEach(s=>{if(!(s.textContent||'').includes('QR de ejemplo'))return;const N=29,M=Math.floor(252/N),o=14;let h='<rect width="280" height="280" fill="#fff"/>';let z=12345;const rnd=()=>{z=(z*1103515245+12345)&0x7fffffff;return z/0x7fffffff};const buscador=(x,y)=>x<7&&y<7||x>=N-7&&y<7||x<7&&y>=N-7;for(let y=0;y<N;y++)for(let x=0;x<N;x++){let on;if(buscador(x,y)){const cx=x<7?x:x-(N-7),cy=y<7?y:y-(N-7);on=cx===0||cx===6||cy===0||cy===6||(cx>=2&&cx<=4&&cy>=2&&cy<=4)}else on=rnd()>0.5;if(on)h+='<rect x="'+(o+x*M)+'" y="'+(o+y*M)+'" width="'+M+'" height="'+M+'" fill="#111"/>'}s.innerHTML=h})})()`);
const ocultarVistaPrevia = () => ocultar(["vista previa en navegador", "vista previa del navegador"]);

// ------------------------------------------------------------ Tutorial 1: primer arranque
await paso("t1-1-condiciones", [{ t: "Entendido", texto: "Pulsa «Entendido»" }]);
await clic("Entendido");
await paso("t1-2-anadir-perfil", [{ t: "+", sel: "button", texto: "Pulsa «Añadir perfil»" }], { antes: ocultarVistaPrevia });
await clic("+");
await poner("input[placeholder]", 0, "Mi perfil");
await paso("t1-3-crear-perfil", [{ campo: "Nombre", texto: "Escribe tu nombre" }, { t: "Crear perfil", texto: "Pulsa «Crear perfil»" }]);
await clic("Crear perfil");
await paso("t1-4-entrar", [{ t: "M", sel: "button", n: 0, texto: "Pulsa tu perfil" }], { antes: ocultarVistaPrevia });
await clic("M", "button");
await esperar(600);

// ------------------------------------------------------------ Tutorial 2: añadir un coche
await paso("t2-1-anadir-vehiculo", [{ t: "+", sel: "button", n: 0, texto: "Pulsa «Añadir vehículo»" }]);
await clic("+");
await paso("t2-2-clase", [{ t: "Coche", texto: "Coche" }, { t: "Moto", texto: "o moto" }]);
await clic("Coche");
await paso("t2-3-marca", [{ t: "Volkswagen", texto: "Elige la marca" }]);
await clic("Volkswagen");
await paso("t2-4-modelo", [{ t: "Golf", texto: "Elige el modelo" }]);
await clic("Golf");
await paso("t2-5-generacion", [{ t: "Golf 8", texto: "Elige la generación" }]);
await clic("Golf 8");
await paso("t2-6-motor", [{ t: "1.5 TSI 130 CV", texto: "Elige tu motor", lado: "der" }]);
await clic("1.5 TSI 130 CV");
await paso("t2-7-siguiente", [{ t: "Siguiente: tus datos", texto: "Pulsa «Siguiente»" }]);
await clic("Siguiente: tus datos");
await poner("main input:not([type=file])", 0, "Mi coche");
await poner("main input:not([type=file])", 1, "0000 ABC");
await poner("main input:not([type=file])", 2, "2023-05-20");
await poner("main input:not([type=file])", 3, "42000");
await paso("t2-8-datos", [{ campo: "Alias", texto: "Ponle un nombre", lado: "izq" }, { campo: "Kilómetros actuales", texto: "Los km que marca ahora" }], { clip: "auto" });
await paso("t2-9-anadir-garaje", [{ t: "Añadir al garaje", texto: "Pulsa «Añadir al garaje»" }]);
await clic("Añadir al garaje");
await esperar(1200);
await paso("t2-10-ficha", [{ t: "Mi coche", sel: "h1", n: 0, texto: "Esta es la ficha de tu coche", lado: "der" }]);

// ------------------------------------------------------------ Tutorial 3: los kilómetros
await paso("t3-1-editar-datos", [{ t: "Editar datos", texto: "Pulsa «Editar datos»" }]);
await clic("Editar datos");
await poner("[class*=fixed] input:not([type=file]):not([type=date])", 2, "43500");
await paso("t3-2-km", [{ campo: "Kilómetros actuales", texto: "Pon los km de ahora" }, { t: "Guardar", texto: "Pulsa «Guardar»" }], { clip: "auto" });
await clic("Guardar", "[class*=fixed] button");
await esperar(900);
await paso("t3-3-resultado", [{ t: "Kilómetros", sel: "div", n: 0, texto: "Ya salen los km nuevos" }]);

// ------------------------------------------------------------ Tutorial 5 (se siembran antes algunos trabajos para el 4)
async function anotarTrabajo({ fecha, km, tipos, desc, coste, quien }) {
  await clic("Registro", "main button, nav button, button");
  await poner("main input, main textarea", 0, fecha); await poner("main input, main textarea", 1, String(km));
  for (const t of tipos) await clic(t, "main button");
  await poner("main input, main textarea", 2, desc); await poner("main input, main textarea", 3, coste); await poner("main input, main textarea", 4, quien);
  await clic("Guardar entrada", "main button"); await esperar(900);
}
await clic("Registro", "button");
for (const s of [
  { fecha: "2024-05-20", km: 18000, tipos: ["Neumáticos"], desc: "Cuatro neumáticos nuevos", coste: "420", quien: "Taller de ejemplo" },
  { fecha: "2025-02-10", km: 32000, tipos: ["Pastillas de freno"], desc: "Pastillas delanteras", coste: "95", quien: "Taller de ejemplo" },
  { fecha: "2025-11-12", km: 41000, tipos: ["Filtro de habitáculo"], desc: "Filtro de habitáculo", coste: "25", quien: "Yo mismo" },
]) await anotarTrabajo(s);

// ------------------------------------------------------------ Tutorial 4: qué toca y cuándo
await clic("Mi garaje", "aside button, nav button, button");
await paso("t4-1-mi-garaje", [{ t: "Próximos trabajos", sel: "div,span,h2,h3", texto: "Aquí ves lo que toca primero", lado: "der" }], { centrar: -1 });
await paso("t4-2-pulsa-recordatorios", [{ t: "Recordatorios", sel: "aside button, nav button, button", texto: "Pulsa «Recordatorios»", lado: "der" }], { centrar: -1 });
await clic("Recordatorios", "aside button, nav button, button");
await paso("t4-3-recordatorios", [{ clase: "tarjeta", contiene: "Vencido", n: 0, texto: "Rojo: ya toca, o casi", lado: "der" }, { clase: "tarjeta", contiene: "62.000", n: 0, texto: "Amarillo: se acerca", lado: "der" }], { centrar: 0 });

// ------------------------------------------------------------ Tutorial 5: anotar un trabajo
await clic("Mi coche", "aside button, nav button, button");
await paso("t5-1-registro", [{ t: "Registro", sel: "aside button, nav button, button", texto: "Pulsa «Registro»", lado: "der" }], { centrar: -1 });
await clic("Registro", "aside button, nav button, button");
await poner("main input, main textarea", 0, "2026-09-15"); await poner("main input, main textarea", 1, "42000");
await paso("t5-2-fecha-km", [{ css: "main input", n: 0, texto: "La fecha", lado: "arriba" }, { css: "main input", n: 1, texto: "Los km", lado: "arriba" }], { clip: "auto" });
await clic("Aceite de motor", "main button"); await clic("Filtro de aceite", "main button");
await paso("t5-3-trabajo", [{ t: "Aceite de motor", sel: "main button", texto: "Marca lo que hiciste", lado: "abajo" }, { t: "Filtro de aceite", sel: "main button", texto: "Puedes marcar varios", lado: "arriba" }], { clip: "auto" });
await poner("main input, main textarea", 2, "Cambio de aceite y filtro"); await poner("main input, main textarea", 3, "89,50"); await poner("main input, main textarea", 4, "Taller de ejemplo");
await paso("t5-4-coste-factura", [{ css: "main input", n: 2, texto: "Lo que costó", lado: "arriba" }, { t: "↑ Adjuntar", sel: "main button", texto: "Aquí va la factura", lado: "abajo" }], { clip: "auto" });
await paso("t5-5-guardar", [{ t: "Guardar entrada", sel: "main button", texto: "Pulsa «Guardar entrada»", lado: "arriba" }], { clip: "auto" });
await clic("Guardar entrada", "main button"); await esperar(900);
await paso("t5-6-resultado", [{ clase: "tarjeta", contiene: "Aceite de motor + Filtro de aceite", n: 0, texto: "Ya está en tu historial", lado: "arriba" }], { clip: "auto" });

// ------------------------------------------------------------ Tutorial 6: documentos
await paso("t6-1-documentos", [{ t: "Documentos", sel: "aside button, nav button, button", texto: "Pulsa «Documentos»", lado: "der" }], { centrar: -1 });
await clic("Documentos", "aside button, nav button, button");
await paso("t6-2-anadir", [{ t: "+ Añadir documento", sel: "main button", texto: "Pulsa «Añadir documento»", lado: "abajo" }]);
await clic("+ Añadir documento", "main button");
await poner("[class*=fixed] input[type=date]", 0, "2027-02-28");
await poner("[class*=fixed] input:not([type=file]):not([type=date])", 0, "Seguro del coche");
await paso("t6-3-tipo-fecha", [{ css: "[class*=fixed] select", n: 0, texto: "Qué papel es", lado: "abajo" }, { css: "[class*=fixed] input[type=date]", n: 0, texto: "Cuándo caduca", lado: "abajo" }], { clip: "auto" });
await paso("t6-4-guardar", [{ t: "↑ Adjuntar foto", sel: "[class*=fixed] button", texto: "Aquí va la foto o el PDF", lado: "arriba" }, { t: "Guardar", sel: "[class*=fixed] button", texto: "Pulsa «Guardar»", lado: "arriba" }], { clip: "auto" });
await clic("Guardar", "[class*=fixed] button"); await esperar(900);
await paso("t6-5-resultado", [{ clase: "tarjeta", contiene: "Seguro del coche", n: 0, texto: "El seguro ya está guardado", lado: "abajo" }], { clip: "auto" });

// ------------------------------------------------------------ Tutorial 7: un vehículo que no está en el catálogo
const ponerOpcion = async (sel, i, texto) => { const r = await ev(`(()=>{const e=document.querySelectorAll(${J(sel)})[${i}];const o=[...e.options].find(x=>x.text.trim().toLowerCase()===${J(texto.toLowerCase())});if(!o)return false;Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,o.value);e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`); if (!r) throw new Error("sin opción " + texto); await esperar(150); };
await clic("Mi garaje", "aside button, nav button, button");
await paso("t7-1-anadir-otro", [{ t: "+", sel: "main button", n: 0, texto: "Pulsa «Añadir vehículo»", lado: "abajo" }]);
await clic("+", "main button");
await clic("Coche", "main button");
await paso("t7-2-otra-marca", [{ t: "+ Otra marca", sel: "main button", texto: "Pulsa «+ Otra marca»", lado: "abajo" }]);
await clic("+ Otra marca", "main button");
await poner("main input", 0, "Alfa Romeo");
await paso("t7-3-marca", [{ css: "main input", n: 0, texto: "Escribe la marca", lado: "arriba" }, { t: "Siguiente: modelo", sel: "button", texto: "Pulsa «Siguiente»", lado: "arriba" }]);
await clic("Siguiente: modelo");
await poner("main input", 0, "Giulietta");
await paso("t7-4-modelo", [{ css: "main input", n: 0, texto: "Escribe el modelo", lado: "arriba" }, { t: "Siguiente: generaci", sel: "button", texto: "Pulsa «Siguiente»", lado: "arriba" }]);
await clic("Siguiente: generaci");
await poner("main input", 0, "Tipo 940"); await poner("main input", 1, "2010–2020");
await paso("t7-5-generacion", [{ css: "main input", n: 0, texto: "Versión del modelo", lado: "arriba" }, { css: "main input", n: 1, texto: "Años de fabricación", lado: "abajo" }]);
await clic("Siguiente: motor");
await poner("main input", 0, "1.4 turbo 170 CV"); await ponerOpcion("main select", 0, "Gasolina");
await paso("t7-6-motor", [{ css: "main input", n: 0, texto: "Nombre del motor", lado: "arriba" }, { css: "main select", n: 0, texto: "Combustible", lado: "abajo" }]);
await clic("Siguiente: tus datos");
await poner("main input:not([type=file])", 0, "Mi otro coche");
await paso("t7-7-datos", [{ campo: "Alias", texto: "Ponle un nombre", lado: "abajo" }, { t: "Añadir al garaje", sel: "button", texto: "Pulsa «Añadir al garaje»", lado: "izq" }]);
await clic("Añadir al garaje"); await esperar(1200);
await clic("Mi garaje", "aside button, nav button, button");
await paso("t7-8-resultado", [{ clase: "tarjeta", contiene: "Mi otro coche", n: 0, texto: "Ya está en tu garaje", lado: "abajo" }]);

// ------------------------------------------------------------ Tutorial 8: copia de seguridad (en la vista previa los botones de copia están apagados: se encienden solo para la captura)
const habilitarCopias = () => ev(`(()=>{document.querySelectorAll('button[disabled]').forEach(b=>{const x=(b.innerText||'').toLowerCase();if(x.includes('exportar')||x.includes('importar')||x.includes('elegir carpeta'))b.removeAttribute('disabled')});document.querySelectorAll('p').forEach(p=>{if((p.innerText||'').toLowerCase().startsWith('las copias solo funcionan'))p.style.display='none'})})()`);
await paso("t8-1-ajustes", [{ t: "Ajustes", sel: "aside button, nav button, button", texto: "Pulsa «Ajustes»", lado: "der" }], { centrar: -1 });
await clic("Ajustes", "aside button, nav button, button");
await paso("t8-2-exportar", [{ t: "Exportar el garaje", sel: "main button", texto: "Para hacer la copia", lado: "abajo" }], { clip: "auto", antes: async () => { await habilitarCopias(); await ocultarVistaPrevia(); } });
await paso("t8-3-importar", [{ t: "Importar un garaje", sel: "main button", texto: "Para recuperarla", lado: "abajo" }], { clip: "auto", antes: habilitarCopias });
await paso("t8-4-automatica", [{ t: "Elegir carpeta", sel: "main button", texto: "Copia automática cada semana", lado: "abajo" }], { clip: "auto", antes: habilitarCopias });

// ------------------------------------------------------------ Tutorial 9: conectar el móvil (solo la parte del ordenador)
await falsoQR();
await paso("t9-1-instalar-app", [{ css: "main svg", n: 0, texto: "Con el móvil, escanea este QR", lado: "der" }], { antes: ocultarVistaPrevia });
await paso("t9-2-emparejar", [{ t: "Enseñar el QR", sel: "main button", texto: "Pulsa «Enseñar el QR»", lado: "der" }], { antes: ocultarVistaPrevia });
await clic("Enseñar el QR", "main button");
await esperar(700);
await falsoQR();
await paso("t9-3-qr", [{ css: "main svg", n: 1, texto: "Este QR lo lee la app", lado: "der" }], { antes: async () => { await ocultarVistaPrevia(); await ocultar(['{"app"']); } });

console.log("Listo: " + anotaciones.length + " capturas. Ahora: py -3 anotar.py");
writeFileSync(join(AQUI, "datos", "anotaciones-tutoriales.json"), JSON.stringify(anotaciones, null, 2) + "\n");
try { await send("Browser.close"); } catch {}
ws.close(); setTimeout(() => { proc.kill(); try { rmSync(perfilTmp, { recursive: true, force: true }); } catch {} process.exit(0); }, 1000);
