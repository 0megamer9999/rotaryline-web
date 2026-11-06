# Dibuja flechas e indicaciones sobre las capturas de los pasos (datos/anotaciones.json) y las guarda en webp.
# Uso: py -3 anotar.py      (lee estatico/img/instalar/originales/*.png y escribe estatico/img/instalar/<destino>.webp)
import json, math, os
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
ROJO = (230, 20, 20)
FUENTE = "C:/Windows/Fonts/segoeuib.ttf"

def flecha(d, x0, y0, x1, y1, g):
    d.line((x0, y0, x1, y1), fill=ROJO, width=g)
    a = math.atan2(y1 - y0, x1 - x0); L = g * 4.2
    for s in (-1, 1):
        d.line((x1, y1, x1 - L * math.cos(a + s * 0.5), y1 - L * math.sin(a + s * 0.5)), fill=ROJO, width=g)

def anotar(p):
    im = Image.open(os.path.join(AQUI, "originales/instalar", p["origen"])).convert("RGB")
    k = min(2.2, 1100 / im.width); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    # margen alrededor para que quepa el texto
    m = p.get("margen", [0, 0, 0, 0])  # arriba, derecha, abajo, izquierda (en px finales)
    lienzo = Image.new("RGB", (im.width + m[1] + m[3], im.height + m[0] + m[2]), (18, 18, 18))
    lienzo.paste(im, (m[3], m[0])); d = ImageDraw.Draw(lienzo)
    g = max(4, round(lienzo.width / 220)); f = ImageFont.truetype(FUENTE, max(22, round(lienzo.width / 34)))
    for n in p["flechas"]:
        x0, y0, x1, y1 = [v * k for v in n["caja"]]; x0 += m[3]; x1 += m[3]; y0 += m[0]; y1 += m[0]
        pad = g * 1.5
        d.rounded_rectangle((x0 - pad, y0 - pad, x1 + pad, y1 + pad), radius=g * 3, outline=ROJO, width=g)
        tx, ty = n["texto_en"]; tx = tx * lienzo.width; ty = ty * lienzo.height
        caja = d.textbbox((0, 0), n["texto"], font=f); tw, th = caja[2] - caja[0], caja[3] - caja[1]
        bx0, by0 = tx - tw / 2 - 14, ty - th / 2 - 10
        d.rounded_rectangle((bx0, by0, bx0 + tw + 28, by0 + th + 20), radius=10, fill=ROJO)
        d.text((bx0 + 14, by0 + 10 - caja[1]), n["texto"], font=f, fill=(255, 255, 255))
        # flecha desde el borde de la etiqueta hasta el borde de la caja
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        ex = min(max(cx, bx0), bx0 + tw + 28); ey = min(max(cy, by0), by0 + th + 20)
        dx, dy = cx - ex, cy - ey; dist = math.hypot(dx, dy) or 1
        # el final de la flecha se queda fuera del recuadro
        hx = cx - dx / dist * ((x1 - x0) / 2 + pad + g * 2 if abs(dx) > abs(dy) else 0)
        hy = cy - dy / dist * ((y1 - y0) / 2 + pad + g * 2 if abs(dy) >= abs(dx) else 0)
        if abs(dx) > abs(dy): hy = cy
        else: hx = cx
        flecha(d, ex, ey, hx, hy, g)
    lienzo.save(os.path.join(AQUI, "estatico/img/instalar", p["destino"] + ".webp"), quality=88, method=6)
    print(p["destino"], lienzo.size)

for p in json.load(open(os.path.join(AQUI, "datos/anotaciones.json"), encoding="utf-8")):
    anotar(p)
