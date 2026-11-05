// Capturas de revisión. Edge sin ventana no baja de ~500 px de ancho, así que el móvil (390) va dentro de un iframe.
// Uso: node capturas/_movil.mjs   (antes: node construir.mjs)
import { writeFileSync, rmSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const barra = String.fromCharCode(92);
const aqui = dirname(fileURLToPath(import.meta.url));
const docs = join(aqui, "..", "docs").split(barra).join("/");
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const url = (p) => "file:///" + p.split(barra).join("/");
const sacar = (salida, ancho, alto, destino) =>
  execFileSync(edge, ["--headless=new", `--screenshot=${join(aqui, salida)}`, `--window-size=${ancho},${alto}`, "--hide-scrollbars", "--virtual-time-budget=2000", destino], { stdio: "ignore" });

// escritorio
sacar("portada-escritorio.png", 1440, 3600, `${url(docs)}/index.html`);
sacar("aplicaciones-escritorio.png", 1440, 2600, `${url(docs)}/aplicaciones.html`);
// móvil
for (const [pagina, salida, alto, menu] of [["index.html", "portada-movil.png", 4200, false], ["index.html", "portada-movil-menu.png", 900, true], ["coches/bmw-e39.html", "coche-movil.png", 2600, false]]) {
  let origen = `${docs}/${pagina}`;
  if (menu) { // copia temporal con el menú y el desplegable abiertos
    const copia = join(aqui, "..", "docs", "_menu.html");
    writeFileSync(copia, readFileSync(join(aqui, "..", "docs", pagina), "utf8").replace("</body>", `<script>document.getElementById("menu").classList.add("abierto");document.querySelector(".con-sub").classList.add("abierto")</script></body>`));
    origen = `${docs}/_menu.html`;
  }
  const marco = join(aqui, "_marco.html");
  writeFileSync(marco, `<!doctype html><body style="margin:0;background:#222"><iframe src="${url(origen)}" style="width:390px;height:${alto}px;border:0;display:block"></iframe>`);
  sacar(salida, 390, alto, url(marco));
  rmSync(marco);
  if (menu) rmSync(join(aqui, "..", "docs", "_menu.html"));
}
