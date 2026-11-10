# Dibuja flechas e indicaciones sobre las capturas de los pasos (datos/anotaciones.json) y las guarda en webp.
# Uso: py -3 anotar.py      (lee originales/<carpeta>/*.png y escribe estatico/img/<carpeta>/<destino>.webp)
# Listas: datos/anotaciones.json (instalar) y datos/anotaciones-tutoriales.json (tutoriales; la genera capturar-tutoriales.mjs).
# Cada entrada puede llevar "carpeta" (por defecto "instalar"). Si una flecha no trae "texto_en", la etiqueta se coloca sola.
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
    carpeta = p.get("carpeta", "instalar")
    im = Image.open(os.path.join(AQUI, "originales", carpeta, p["origen"])).convert("RGB")
    # Opcional (capturas de móvil): "escala_coords" multiplica cajas y recorte (p. ej. si se midieron en una vista reducida),
    # "recorte": [x0, y0, x1, y1] en px de la captura, y "escala_texto" agranda etiquetas y trazos para que se lean en pequeño.
    sc = p.get("escala_coords", 1); et = p.get("escala_texto", 1); ox = oy = 0
    if "recorte" in p:
        rc = [round(v * sc) for v in p["recorte"]]; im = im.crop(rc); ox, oy = rc[0], rc[1]
    k = min(2.2, 1100 / im.width); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    def px(n):
        x0, y0, x1, y1 = [v * sc for v in n["caja"]]
        return [(x0 - ox) * k, (y0 - oy) * k, (x1 - ox) * k, (y1 - oy) * k]
    m = list(p.get("margen", [0, 0, 0, 0]))  # arriba, derecha, abajo, izquierda (en px finales)
    g = max(4, round((im.width + m[1] + m[3]) / 220 * et)); pad = g * 1.5
    f = ImageFont.truetype(FUENTE, max(22, round((im.width + m[1] + m[3]) / 34 * et)))
    medida = ImageDraw.Draw(im)
    # 1.ª pasada: dónde va cada etiqueta (en px de la imagen sin margen). Las que no traen "texto_en" se colocan solas:
    # "en": [fx, fy] (fracciones de la imagen, pueden salirse de 0..1) o "lado": abajo (por defecto) / arriba / izq / der.
    auto = []
    for n in p["flechas"]:
        x0, y0, x1, y1 = px(n)
        caja = medida.textbbox((0, 0), n["texto"], font=f); tw, th = caja[2] - caja[0], caja[3] - caja[1]
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        if "texto_en" in n:
            auto.append(None); continue
        if "en" in n:
            tx, ty = n["en"][0] * im.width, n["en"][1] * im.height
        else:
            lado = n.get("lado", "abajo"); hueco = th + 75
            if lado == "arriba": tx, ty = cx, y0 - pad - hueco
            elif lado == "izq": tx, ty = x0 - pad - 70 - tw / 2 - 14, cy
            elif lado == "der": tx, ty = x1 + pad + 70 + tw / 2 + 14, cy
            else: tx, ty = cx, y1 + pad + hueco
            if lado in ("arriba", "abajo"): tx = min(max(tx, tw / 2 + 30), im.width - tw / 2 - 30)
        auto.append((tx, ty, tw, th, caja))
        # si la etiqueta se sale de la imagen, se amplía el lienzo
        m[0] = max(m[0], round(th / 2 + 30 - ty)); m[2] = max(m[2], round(ty + th / 2 + 30 - im.height))
        m[3] = max(m[3], round(tw / 2 + 44 - tx)); m[1] = max(m[1], round(tx + tw / 2 + 44 - im.width))
    lienzo = Image.new("RGB", (im.width + m[1] + m[3], im.height + m[0] + m[2]), (18, 18, 18))
    lienzo.paste(im, (m[3], m[0])); d = ImageDraw.Draw(lienzo)
    for n, a in zip(p["flechas"], auto):
        x0, y0, x1, y1 = px(n); x0 += m[3]; x1 += m[3]; y0 += m[0]; y1 += m[0]
        d.rounded_rectangle((x0 - pad, y0 - pad, x1 + pad, y1 + pad), radius=g * 3, outline=ROJO, width=g)
        if a is None:
            caja = d.textbbox((0, 0), n["texto"], font=f); tw, th = caja[2] - caja[0], caja[3] - caja[1]
            tx, ty = n["texto_en"]; tx = tx * lienzo.width; ty = ty * lienzo.height
        else:
            tx, ty, tw, th, caja = a; tx += m[3]; ty += m[0]
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
    salida = os.path.join(AQUI, "estatico/img", carpeta); os.makedirs(salida, exist_ok=True)
    lienzo.save(os.path.join(salida, p["destino"] + ".webp"), quality=88, method=6)
    print(p["destino"], lienzo.size)

for lista in ("datos/anotaciones.json", "datos/anotaciones-tutoriales.json"):
    ruta = os.path.join(AQUI, lista)
    if os.path.exists(ruta):
        for p in json.load(open(ruta, encoding="utf-8")):
            anotar(p)
