"""Paso 2: genera los PNG/PDF para imprimir a partir de marketing/qr/matriz.json (ver matriz.mjs)."""
import json, sys
from PIL import Image, ImageDraw, ImageFont

M = json.load(open("marketing/qr/matriz.json"))
N, DATOS, URL = M["n"], M["datos"], M["url"]
LOGO = "marketing/logo/logo-tribu-fit-2000.png"
FUENTE = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
FUENTE2 = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"
NARANJA = (234, 88, 12)

def qr(px_modulo, color, margen=4, fondo=(0, 0, 0, 0), logo=False):
    t = (N + margen * 2) * px_modulo
    im = Image.new("RGBA", (t, t), fondo)
    d = ImageDraw.Draw(im)
    for y in range(N):
        for x in range(N):
            if DATOS[y * N + x]:
                X, Y = (x + margen) * px_modulo, (y + margen) * px_modulo
                d.rectangle([X, Y, X + px_modulo - 1, Y + px_modulo - 1], fill=color)
    if logo:  # el centro (≈16 % del ancho) queda cubierto: la corrección H (30 %) lo tolera
        lado = int(N * px_modulo * 0.16)
        c = t // 2
        aro = lado + px_modulo * 2
        d.ellipse([c - aro // 2, c - aro // 2, c + aro // 2, c + aro // 2], fill=(255, 255, 255, 255))
        l = Image.open(LOGO).convert("RGBA").resize((lado, lado), Image.LANCZOS)
        mask = Image.new("L", (lado, lado), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, lado - 1, lado - 1], fill=255)
        im.paste(l, (c - lado // 2, c - lado // 2), mask)
    return im

PX = 3000 // (N + 8)
# 1) QR sueltos, fondo transparente: negro para prendas claras, blanco para oscuras
qr(PX, (0, 0, 0, 255)).save("marketing/qr/qr-tribufit-negro.png")
qr(PX, (255, 255, 255, 255)).save("marketing/qr/qr-tribufit-blanco.png")

# 2) Diseño para remera, 30 x 40 cm a 300 dpi (3543 x 4724 px): tarjeta blanca que se lee sobre cualquier color
W, H = 3543, 4724
lienzo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(lienzo)
d.rounded_rectangle([60, 60, W - 60, H - 60], radius=260, fill=(255, 255, 255, 255))
d.rounded_rectangle([60, 60, W - 60, H - 60], radius=260, outline=NARANJA, width=44)

def centrado(texto, y, fuente, tam, color):
    f = ImageFont.truetype(fuente, tam)
    w = d.textlength(texto, font=f)
    d.text(((W - w) / 2, y), texto, font=f, fill=color)

centrado("ESCANEÁ", 330, FUENTE, 520, (17, 17, 17))
centrado("Y ENTRENÁ EN TRIBU", 900, FUENTE, 255, NARANJA)
lado_qr = 2500
codigo = qr(lado_qr // (N + 8), (17, 17, 17, 255), fondo=(255, 255, 255, 255), logo=True).resize((lado_qr, lado_qr), Image.NEAREST)
lienzo.paste(codigo, ((W - lado_qr) // 2, 1320), codigo)
centrado("TRIBU FIT", 3880, FUENTE, 330, (17, 17, 17))
centrado(URL.replace("https://", ""), 4260, FUENTE2, 130, (90, 90, 90))
lienzo.save("marketing/qr/remera-qr-diseno.png", dpi=(300, 300))
fondo = Image.new("RGB", (W, H), (255, 255, 255))
fondo.paste(lienzo, mask=lienzo.split()[3])
fondo.save("marketing/qr/remera-qr-diseno.pdf", resolution=300.0)
print("listo")
