"""Kit de promoción de Tribu Fit: remeras, redes sociales e impresos.
Uso (desde la raíz del proyecto):  node scripts/qr/matriz.mjs && python3 scripts/promo/generar.py
Necesita Pillow y la fuente Inter (o cambiar FUENTE_*)."""
import json
from PIL import Image, ImageDraw, ImageFilter, ImageFont

M = json.load(open("marketing/qr/matriz.json"))
N, DATOS, URL = M["n"], M["datos"], M["url"]
URL_CORTA = URL.replace("https://", "")
LOGO = Image.open("public/logo.png").convert("RGBA")
NEGRO_FONDO = (18, 13, 10)
TINTA = (17, 17, 17)
NARANJA = (234, 88, 12)
NARANJA_CLARO = (255, 138, 40)
AMBAR = (255, 176, 32)
BLANCO = (255, 255, 255)
FUENTE_NEGRA = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
FUENTE_BOLD = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"
FUENTE_MEDIA = "/usr/share/fonts/opentype/inter/InterDisplay-SemiBold.otf"
F = lambda ruta, tam: ImageFont.truetype(ruta, tam)


def qr(lado, tinta=TINTA, fondo=BLANCO, logo=True):
    """QR con corrección H; el logo central (16 %) lo tolera."""
    margen = 2
    px = max(1, lado // (N + margen * 2))
    t = (N + margen * 2) * px
    im = Image.new("RGBA", (t, t), fondo + (255,))
    d = ImageDraw.Draw(im)
    for y in range(N):
        for x in range(N):
            if DATOS[y * N + x]:
                X, Y = (x + margen) * px, (y + margen) * px
                d.rectangle([X, Y, X + px - 1, Y + px - 1], fill=tinta + (255,))
    if logo:
        l = int(N * px * 0.16)
        c = t // 2
        aro = l + px * 2
        d.ellipse([c - aro // 2, c - aro // 2, c + aro // 2, c + aro // 2], fill=BLANCO + (255,))
        im.paste(circulo(LOGO, l), (c - l // 2, c - l // 2), circulo(LOGO, l))
    return im.resize((lado, lado), Image.NEAREST)


def circulo(img, lado):
    r = img.resize((lado, lado), Image.LANCZOS)
    m = Image.new("L", (lado, lado), 0)
    ImageDraw.Draw(m).ellipse([0, 0, lado - 1, lado - 1], fill=255)
    out = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    out.paste(r, (0, 0), m)
    return out


def brillo(im, centro, radio, color, alpha=150):
    """Resplandor suave de color."""
    capa = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(capa).ellipse([centro[0] - radio, centro[1] - radio, centro[0] + radio, centro[1] + radio], fill=color + (alpha,))
    capa = capa.filter(ImageFilter.GaussianBlur(radio * 0.45))
    im.alpha_composite(capa)


def fondo_marca(w, h, claro=False):
    im = Image.new("RGBA", (w, h), (250, 246, 241, 255) if claro else NEGRO_FONDO + (255,))
    s = max(w, h)
    brillo(im, (int(w * 0.92), int(h * 0.06)), int(s * 0.42), NARANJA, 110 if not claro else 70)
    brillo(im, (int(w * 0.02), int(h * 0.98)), int(s * 0.36), AMBAR, 70 if not claro else 50)
    return im


def texto(im, xy, t, fuente, tam, color, ancla="la", interletra=0, maxw=None):
    d = ImageDraw.Draw(im)
    if maxw:  # achica la letra hasta que el texto entre en el ancho disponible
        while tam > 10 and d.textlength(t, font=F(fuente, tam)) + interletra * (len(t) - 1) > maxw:
            tam = int(tam * 0.96)
    f = F(fuente, tam)
    if interletra:
        x, y = xy
        ancho = sum(d.textlength(c, font=f) + interletra for c in t) - interletra
        if ancla[0] == "m":
            x -= ancho / 2
        for c in t:
            d.text((x, y), c, font=f, fill=color, anchor="l" + ancla[1])
            x += d.textlength(c, font=f) + interletra
        return
    d.text(xy, t, font=f, fill=color, anchor=ancla)


def tarjeta_qr(lado, rotulo=None):
    """QR sobre tarjeta blanca redondeada con sombra, para que se lea sobre cualquier fondo."""
    pad = int(lado * 0.07)
    t = lado + pad * 2
    extra = int(lado * 0.1)
    out = Image.new("RGBA", (t + extra * 2, t + extra * 2), (0, 0, 0, 0))
    sombra = Image.new("RGBA", out.size, (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle([extra, extra + int(lado * 0.03), extra + t, extra + t + int(lado * 0.03)], radius=int(lado * 0.09), fill=(0, 0, 0, 120))
    out.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(lado * 0.03)))
    ImageDraw.Draw(out).rounded_rectangle([extra, extra, extra + t, extra + t], radius=int(lado * 0.09), fill=BLANCO + (255,))
    out.paste(qr(lado), (extra + pad, extra + pad))
    return out


def guardar(im, ruta, dpi=None, pdf=False):
    im.save(ruta + ".png", dpi=(dpi, dpi) if dpi else None)
    if pdf:
        base = Image.new("RGB", im.size, BLANCO)
        base.paste(im, mask=im.split()[3])
        base.save(ruta + ".pdf", resolution=float(dpi or 300))


# ───────────── REMERAS (30 x 40 cm, 300 dpi, fondo transparente) ─────────────
W, H = 3543, 4724
for variante, tinta in (("claro", TINTA), ("oscuro", BLANCO)):
    # 1) Frente con logo grande: logo + frase
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    lado = 2300
    im.alpha_composite(circulo(LOGO, lado), ((W - lado) // 2, 380))
    texto(im, (W // 2, 3000), "ENTRENÁ", FUENTE_NEGRA, 520, tinta, "ma")
    texto(im, (W // 2, 3520), "EN TRIBU", FUENTE_NEGRA, 520, NARANJA_CLARO if variante == "oscuro" else NARANJA, "ma")
    guardar(im, f"marketing/promo/remeras/frente-logo-para-prenda-{variante}", 300)
    # 2) Frente solo tipografía
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    texto(im, (W // 2, 560), "NO", FUENTE_NEGRA, 700, tinta, "ma", maxw=W * 0.88)
    texto(im, (W // 2, 1250), "ENTRENÁS", FUENTE_NEGRA, 640, tinta, "ma", maxw=W * 0.88)
    texto(im, (W // 2, 1930), "SOLO.", FUENTE_NEGRA, 1000, NARANJA_CLARO if variante == "oscuro" else NARANJA, "ma")
    texto(im, (W // 2, 3350), "TRIBU FIT", FUENTE_NEGRA, 480, tinta, "ma", interletra=24)
    texto(im, (W // 2, 3900), "ENTRENÁ EN TRIBU", FUENTE_BOLD, 190, tinta, "ma", interletra=60)
    guardar(im, f"marketing/promo/remeras/frente-frase-para-prenda-{variante}", 300)

# 3) Espalda con QR (la tarjeta blanca se lee sobre cualquier color): se reutiliza el diseño de /marketing/qr
Image.open("marketing/qr/remera-qr-diseno.png").save("marketing/promo/remeras/espalda-qr-cualquier-prenda.png", dpi=(300, 300))

# ───────────── REDES SOCIALES ─────────────
def post(w, h, titulo, subtitulo, ruta, historia=False):
    im = fondo_marca(w, h)
    m = int(w * 0.08)
    lg = int(w * 0.14)
    ly = int(h * (0.05 if historia else 0.06))
    im.alpha_composite(circulo(LOGO, lg), (m, ly))
    texto(im, (m + lg + 26, ly + lg // 2), "TRIBU FIT", FUENTE_NEGRA, int(w * 0.05), BLANCO, "lm", interletra=6)
    tam = int(w * (0.125 if len(titulo) < 3 else 0.105))
    paso = int(tam * 1.08)
    y = int(h * (0.2 if historia else 0.24))
    for i, linea in enumerate(titulo):
        texto(im, (m, y + i * paso), linea, FUENTE_NEGRA, tam, NARANJA_CLARO if i == len(titulo) - 1 else BLANCO, "la", maxw=w - 2 * m)
    ys = y + len(titulo) * paso + int(w * 0.02)
    for i, linea in enumerate(subtitulo):
        texto(im, (m, ys + i * int(w * 0.055)), linea, FUENTE_MEDIA, int(w * 0.04), (225, 215, 205), "la", maxw=w - 2 * m)
    if historia:
        q = tarjeta_qr(int(w * 0.42))
        qy = int(h * 0.50)
        im.alpha_composite(q, ((w - q.width) // 2, qy))
        cy = qy + q.height + int(h * 0.01)
        texto(im, (w // 2, cy), "ESCANEÁ Y DESCARGÁ LA APP", FUENTE_NEGRA, int(w * 0.052), BLANCO, "ma", maxw=w - 2 * m)
        texto(im, (w // 2, cy + int(w * 0.08)), URL_CORTA, FUENTE_MEDIA, int(w * 0.038), NARANJA_CLARO, "ma")
    else:
        q = tarjeta_qr(int(w * 0.30))
        im.alpha_composite(q, (w - m - q.width + int(w * 0.03), h - q.height - int(h * 0.02)))
        by = h - int(h * 0.31)
        for i, (t, c) in enumerate([("ESCANEÁ", BLANCO), ("Y DESCARGÁ", BLANCO), ("LA APP", NARANJA_CLARO)]):
            texto(im, (m, by + i * int(w * 0.075)), t, FUENTE_NEGRA, int(w * 0.065), c, "la")
        texto(im, (m, h - int(h * 0.06)), URL_CORTA, FUENTE_MEDIA, int(w * 0.034), (225, 215, 205), "la")
    im.convert("RGB").save(ruta + ".png")

post(1080, 1080, ["ENTRENÁ", "EN TRIBU"], ["Rutinas, nutrición y", "seguimiento en tu celular."], "marketing/promo/redes/post-cuadrado-1080x1080")
post(1080, 1350, ["TU ENTRENADORA", "EN TU", "BOLSILLO"], ["Plan personalizado, chat, retos", "y tus números a la vista."], "marketing/promo/redes/post-vertical-1080x1350")
post(1080, 1920, ["ENTRENÁ", "EN TRIBU"], ["Rutinas, nutrición, recetas,", "chat con tu entrenadora y retos."], "marketing/promo/redes/story-1080x1920", historia=True)

# ───────────── IMPRESOS ─────────────
def afiche(w, h, ruta, titulo_tam, dpi):
    im = fondo_marca(w, h)
    m = int(w * 0.08)
    lg = int(w * 0.20)
    im.alpha_composite(circulo(LOGO, lg), ((w - lg) // 2, int(h * 0.05)))
    y = int(h * 0.05) + lg + int(h * 0.03)
    texto(im, (w // 2, y), "ENTRENÁ", FUENTE_NEGRA, titulo_tam, BLANCO, "ma")
    texto(im, (w // 2, y + int(titulo_tam * 1.02)), "EN TRIBU", FUENTE_NEGRA, titulo_tam, NARANJA_CLARO, "ma")
    ty = y + int(titulo_tam * 2.15)
    for i, t in enumerate(["Rutinas y nutrición hechas para vos,", "seguimiento de tu entrenadora", "y retos con tu tribu."]):
        texto(im, (w // 2, ty + i * int(titulo_tam * 0.24)), t, FUENTE_MEDIA, int(titulo_tam * 0.19), (230, 220, 210), "ma")
    lado = int(w * 0.36)
    q = tarjeta_qr(lado)
    qy = h - q.height - int(h * 0.085)
    im.alpha_composite(q, ((w - q.width) // 2, qy))
    texto(im, (w // 2, qy - int(titulo_tam * 0.08)), "ESCANEÁ Y DESCARGÁ LA APP", FUENTE_NEGRA, int(titulo_tam * 0.2), BLANCO, "ms")
    texto(im, (w // 2, h - int(h * 0.05)), URL_CORTA, FUENTE_MEDIA, int(titulo_tam * 0.17), NARANJA_CLARO, "ma")
    guardar(im, ruta, dpi, pdf=True)

afiche(1748, 2480, "marketing/promo/impresos/flyer-A5", 215, 300)      # 148 x 210 mm
afiche(3508, 4961, "marketing/promo/impresos/afiche-A3", 430, 300)     # 297 x 420 mm

# Stickers redondos de 6 cm (710 px a 300 dpi), con fondo transparente fuera del círculo
def sticker(ruta, contenido):
    L = 1000
    im = Image.new("RGBA", (L, L), (0, 0, 0, 0))
    base = fondo_marca(L, L)
    m = Image.new("L", (L, L), 0)
    ImageDraw.Draw(m).ellipse([0, 0, L - 1, L - 1], fill=255)
    im.paste(base, (0, 0), m)
    contenido(im)
    ImageDraw.Draw(im).ellipse([14, 14, L - 15, L - 15], outline=NARANJA_CLARO + (255,), width=18)
    im.save(ruta + ".png", dpi=(500, 500))

def sticker_logo(im):
    lg = 470
    im.alpha_composite(circulo(LOGO, lg), ((1000 - lg) // 2, 110))
    texto(im, (500, 640), "ENTRENÁ EN TRIBU", FUENTE_NEGRA, 82, BLANCO, "ma")
    texto(im, (500, 760), URL_CORTA, FUENTE_MEDIA, 44, NARANJA_CLARO, "ma")

def sticker_qr(im):
    texto(im, (500, 105), "ESCANEÁ", FUENTE_NEGRA, 96, BLANCO, "ma")
    q = qr(470)
    ImageDraw.Draw(im).rounded_rectangle([500 - 265, 235, 500 + 265, 765], radius=44, fill=BLANCO + (255,))
    im.paste(q, (500 - 235, 265))
    texto(im, (500, 800), "TRIBU FIT", FUENTE_NEGRA, 62, NARANJA_CLARO, "ma", interletra=8)

sticker("marketing/promo/impresos/sticker-redondo-logo-6cm", sticker_logo)
sticker("marketing/promo/impresos/sticker-redondo-qr-6cm", sticker_qr)

# ───────────── TARJETA PERSONAL (90 x 50 mm, 300 dpi = 1063 x 591) — ejemplo; la real se baja desde la app ─────────────
def tarjeta_personal(nombre, codigo, ruta):
    w, h = 1063, 591
    frente = fondo_marca(w, h)
    frente.alpha_composite(circulo(LOGO, 200), (60, 60))
    texto(frente, (60, 330), nombre.upper(), FUENTE_NEGRA, 78, BLANCO, "la")
    texto(frente, (60, 420), "ENTRENADORA PERSONAL", FUENTE_BOLD, 38, NARANJA_CLARO, "la", interletra=6)
    texto(frente, (60, h - 60), "Entrená en tribu · " + URL_CORTA, FUENTE_MEDIA, 30, (225, 215, 205), "ls")
    dorso = Image.new("RGBA", (w, h), BLANCO + (255,))
    d = ImageDraw.Draw(dorso)
    d.rectangle([0, 0, 18, h], fill=NARANJA + (255,))
    dorso.paste(qr(430, logo=False), (w - 430 - 50, 80))
    texto(dorso, (70, 110), "UNITE A MI TRIBU", FUENTE_NEGRA, 56, TINTA, "la")
    texto(dorso, (70, 200), "Escaneá el código, descargá", FUENTE_MEDIA, 36, (90, 90, 90), "la")
    texto(dorso, (70, 245), "la app y usá mi código:", FUENTE_MEDIA, 36, (90, 90, 90), "la")
    d.rounded_rectangle([70, 330, 560, 460], radius=26, outline=NARANJA + (255,), width=8)
    texto(dorso, (315, 395), codigo, FUENTE_NEGRA, 84, NARANJA, "mm", interletra=10)
    texto(dorso, (70, h - 50), URL_CORTA, FUENTE_MEDIA, 30, (110, 110, 110), "ls")
    hoja = Image.new("RGBA", (w, h * 2 + 40), (255, 255, 255, 0))
    hoja.alpha_composite(frente, (0, 0))
    hoja.alpha_composite(dorso, (0, h + 40))
    hoja.save(ruta + ".png", dpi=(300, 300))
    frente.convert("RGB").save(ruta + "-frente.png", dpi=(300, 300))
    dorso.convert("RGB").save(ruta + "-dorso.png", dpi=(300, 300))

tarjeta_personal("Tu Nombre", "ABC123", "marketing/promo/impresos/tarjeta-ejemplo")
print("listo")
