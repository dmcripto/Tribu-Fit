#!/usr/bin/env bash
# Compila el APK de Tribu Fit sin Android Studio ni el SDK de Android.
#
# Usa solo herramientas oficiales descargadas y verificadas por su huella SHA-256:
#   aapt2 (recursos), d8 (a código Android), apksig (firma) y el android.jar de Android 14.
# Requisitos: Java 17+ (JDK), curl, unzip, python3.
#
# Variables opcionales:
#   APP_URL        dirección de la web (por defecto https://tribu-fit.vercel.app/ir)
#   VERSION_NAME   versión visible, por ejemplo 1.0.0
#   VERSION_CODE   número entero que debe SUBIR en cada versión nueva
#   KEYSTORE       archivo .p12 con tu clave de firma (se crea si no existe)
#   KEYSTORE_PASS  contraseña de esa clave (si se crea, se genera una al azar)
#   TOOLS_DIR      dónde guardar las herramientas descargadas
#   OUT_DIR        dónde dejar el APK
set -euo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
TOOLS_DIR="${TOOLS_DIR:-$HOME/.cache/tribufit-apk-tools}"
OUT_DIR="${OUT_DIR:-$AQUI/build}"
APP_URL="${APP_URL:-https://tribu-fit.vercel.app/ir}"
VERSION_NAME="${VERSION_NAME:-1.0.0}"
VERSION_CODE="${VERSION_CODE:-1}"
KEYSTORE="${KEYSTORE:-$AQUI/claves/tribufit.p12}"
ALIAS="tribufit"
MIN_SDK=26
TARGET_SDK=34
SRC="$AQUI/app/src/main"

# --- Herramientas (con huella SHA-256 fija) ---
declare -A URL=(
  [apktool.jar]="https://github.com/iBotPeaches/Apktool/releases/download/v2.9.3/apktool_2.9.3.jar"
  [r8.jar]="https://storage.googleapis.com/r8-releases/raw/8.5.35/r8.jar"
  [apksig.jar]="https://repo.maven.apache.org/maven2/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar"
  [android.jar]="https://repo.maven.apache.org/maven2/org/robolectric/android-all/14-robolectric-10818077/android-all-14-robolectric-10818077.jar"
)
declare -A SHA=(
  [apktool.jar]="7956eb04194300ce0d0a84ad18771eebc94b89fb8d1ddcce8ea4c056818646f4"
  [r8.jar]="cb112407ef132dfcb1e5e1a9d4e6fefa89807822e65a9ffbdbb68ee442985405"
  [apksig.jar]="9637078c0016244e4be0941836295365a7e2e5b164c59cb7885783c40460bfee"
  [android.jar]="6be2218c6a53fe3c57bc22ebdc723edcb7270a8a6f187545708aa5c0ed813977"
)
mkdir -p "$TOOLS_DIR"
for f in apktool.jar r8.jar apksig.jar android.jar; do
  if [ ! -f "$TOOLS_DIR/$f" ] || [ "$(sha256sum "$TOOLS_DIR/$f" | cut -d' ' -f1)" != "${SHA[$f]}" ]; then
    echo "Descargando $f ..."
    curl -fsSL --retry 4 --retry-delay 5 -o "$TOOLS_DIR/$f" "${URL[$f]}"
  fi
  if [ "$(sha256sum "$TOOLS_DIR/$f" | cut -d' ' -f1)" != "${SHA[$f]}" ]; then
    echo "ERROR: la huella de $f no coincide. No se continúa." >&2; exit 1
  fi
done
if [ ! -x "$TOOLS_DIR/aapt2" ]; then
  unzip -p "$TOOLS_DIR/apktool.jar" prebuilt/linux/aapt2_64 > "$TOOLS_DIR/aapt2"
  chmod +x "$TOOLS_DIR/aapt2"
fi
AAPT2="$TOOLS_DIR/aapt2"; ANDROID_JAR="$TOOLS_DIR/android.jar"

# --- Clave de firma ---
if [ ! -f "$KEYSTORE" ]; then
  mkdir -p "$(dirname "$KEYSTORE")"
  KEYSTORE_PASS="${KEYSTORE_PASS:-$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20)}"
  keytool -genkeypair -keystore "$KEYSTORE" -storetype PKCS12 -alias "$ALIAS" \
    -keyalg RSA -keysize 4096 -validity 36500 -storepass "$KEYSTORE_PASS" -keypass "$KEYSTORE_PASS" \
    -dname "CN=Tribu Fit, O=Tribu Fit" >/dev/null 2>&1
  echo "$KEYSTORE_PASS" > "${KEYSTORE%.p12}.contraseña.txt"
  chmod 600 "$KEYSTORE" "${KEYSTORE%.p12}.contraseña.txt"
  echo "Clave de firma creada en $KEYSTORE. GUÁRDALA: sin ella no podrás actualizar la app instalada."
fi
if [ -z "${KEYSTORE_PASS:-}" ]; then KEYSTORE_PASS="$(cat "${KEYSTORE%.p12}.contraseña.txt")"; fi

# --- Compilación ---
TMP="$OUT_DIR/tmp"
rm -rf "$TMP"; mkdir -p "$TMP/src" "$TMP/gen" "$TMP/classes" "$TMP/dex" "$OUT_DIR"
cp -r "$SRC/." "$TMP/src/"
sed -i "s#https://tribu-fit.vercel.app/ir#${APP_URL}#" "$TMP/src/res/values/strings.xml"

"$AAPT2" compile --dir "$TMP/src/res" -o "$TMP/recursos.zip"
"$AAPT2" link -o "$TMP/base.apk" -I "$ANDROID_JAR" --manifest "$TMP/src/AndroidManifest.xml" \
  -R "$TMP/recursos.zip" -A "$TMP/src/assets" --java "$TMP/gen" \
  --min-sdk-version "$MIN_SDK" --target-sdk-version "$TARGET_SDK" \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" --auto-add-overlay

# --release 8: solo se permite la API de Java 8, que es la que entiende Android.
javac -nowarn --release 8 -cp "$ANDROID_JAR" -d "$TMP/classes" \
  $(find "$TMP/gen" "$TMP/src/java" -name '*.java')

java -cp "$TOOLS_DIR/r8.jar" com.android.tools.r8.D8 --release --min-api "$MIN_SDK" \
  --lib "$ANDROID_JAR" --output "$TMP/dex" $(find "$TMP/classes" -name '*.class')

python3 "$AQUI/tools/empaquetar.py" "$TMP/base.apk" "$TMP/dex/classes.dex" "$TMP/alineado.apk"

mkdir -p "$TMP/firmar"
javac -nowarn -cp "$TOOLS_DIR/apksig.jar" -d "$TMP/firmar" "$AQUI/tools/Firmar.java"
APK="$OUT_DIR/tribu-fit-$VERSION_NAME.apk"
rm -f "$APK"
# apksig 2.3.0 usa clases internas de Java que hoy hay que exportar de forma explícita.
EXPORTS="--add-exports java.base/sun.security.x509=ALL-UNNAMED --add-exports java.base/sun.security.pkcs=ALL-UNNAMED"
java $EXPORTS -cp "$TOOLS_DIR/apksig.jar:$TMP/firmar" Firmar firmar "$KEYSTORE" "$ALIAS" "$KEYSTORE_PASS" "$TMP/alineado.apk" "$APK" "$MIN_SDK"

# --- Comprobaciones ---
python3 "$AQUI/tools/empaquetar.py" --comprobar "$APK"
java $EXPORTS -cp "$TOOLS_DIR/apksig.jar:$TMP/firmar" Firmar verificar "$APK" "$MIN_SDK"
"$AAPT2" dump badging "$APK" | grep -E "^(package|sdkVersion|targetSdkVersion|uses-permission|application-label:|launchable-activity)" || true
if [ -z "${KEEP_TMP:-}" ]; then rm -rf "$TMP"; fi
echo
echo "Listo: $APK ($(du -h "$APK" | cut -f1))"
