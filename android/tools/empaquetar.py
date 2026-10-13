#!/usr/bin/env python3
"""Añade classes.dex al APK que genera aapt2 y alinea los datos a 4 bytes, como hace zipalign.

Android exige que resources.arsc y los archivos sin comprimir estén alineados. Se hace aquí
porque zipalign forma parte del SDK, que no siempre está disponible.
Uso: empaquetar.py <base.apk> <classes.dex> <salida.apk>
También: empaquetar.py --comprobar <apk>  (verifica la alineación)
"""
import struct
import sys
import zipfile

ALINEACION = 4


def empaquetar(base, dex, salida):
    with zipfile.ZipFile(base) as origen, zipfile.ZipFile(salida, "w") as destino:
        entradas = [(i, origen.read(i.filename)) for i in origen.infolist()]
        info_dex = zipfile.ZipInfo("classes.dex", date_time=(2026, 1, 1, 0, 0, 0))
        info_dex.compress_type = zipfile.ZIP_DEFLATED
        with open(dex, "rb") as f:
            entradas.append((info_dex, f.read()))
        # AndroidManifest.xml primero, como en un APK normal
        entradas.sort(key=lambda e: (e[0].filename != "AndroidManifest.xml", e[0].filename))
        for info, datos in entradas:
            nuevo = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            nuevo.compress_type = info.compress_type
            nuevo.external_attr = info.external_attr
            nuevo.extra = b""
            if nuevo.compress_type == zipfile.ZIP_STORED:
                # El archivo comienza tras la cabecera local de 30 bytes + nombre + extra.
                posicion = destino.fp.tell() + 30 + len(nuevo.filename.encode("utf-8"))
                relleno = (-posicion) % ALINEACION
                if relleno:
                    # Campo "extra" de relleno: 2 bytes de id + 2 de tamaño + datos (mínimo 4 bytes).
                    while relleno < 4:
                        relleno += ALINEACION
                    nuevo.extra = struct.pack("<HH", 0xD935, relleno - 4) + b"\0" * (relleno - 4)
            destino.writestr(nuevo, datos)


def comprobar(apk):
    mal = []
    with zipfile.ZipFile(apk) as z:
        for i in z.infolist():
            if i.compress_type == zipfile.ZIP_STORED and i.header_offset is not None:
                with open(apk, "rb") as f:
                    f.seek(i.header_offset)
                    cab = f.read(30)
                    nombre, extra = struct.unpack("<HH", cab[26:30])
                    inicio = i.header_offset + 30 + nombre + extra
                if inicio % ALINEACION:
                    mal.append((i.filename, inicio))
    if mal:
        print("SIN ALINEAR:", mal)
        return 1
    print("Alineación correcta (4 bytes)")
    return 0


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--comprobar":
        sys.exit(comprobar(sys.argv[2]))
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(2)
    empaquetar(*sys.argv[1:])
