// Saca capturas en formato móvil (390 px) metiendo la página en un iframe: Edge sin ventana no baja de ~500 px.
import { writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const aqui = dirname(fileURLToPath(import.meta.url));
const docs = join(aqui, "..", "docs").split(String.fromCharCode(92)).join("/");
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
for (const [pagina, salida, alto] of [["index.html", "portada-movil.png", 2100], ["coches/bmw-e39.html", "coche-movil.png", 2600], ["eventos.html", "eventos-movil.png", 1500], ["aplicaciones.html", "aplicaciones-movil.png", 2600]]) {
  const marco = join(aqui, "_marco.html");
  writeFileSync(marco, `<!doctype html><body style="margin:0;background:#222"><iframe src="file:///${docs}/${pagina}" style="width:390px;height:${alto}px;border:0;display:block"></iframe>`);
  execFileSync(edge, ["--headless=new", `--screenshot=${join(aqui, salida)}`, `--window-size=390,${alto}`, "--hide-scrollbars", "--virtual-time-budget=2000", "file:///" + marco.split(String.fromCharCode(92)).join("/")], { stdio: "ignore" });
  rmSync(marco);
}
