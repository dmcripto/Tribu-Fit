# Tribu Fit

Entrena en tribu. Web (Next.js) y apps de fitness con comunidad y seguimiento personalizado.

## Desarrollo

```bash
npm install
npm run dev
```

## Estructura

- `src/app`: páginas de la web (Next.js App Router).
- `supabase/schema.sql`: esquema de base de datos (usuarios, consentimientos, medidas, entrenos, planes y semanas del plan, tribus) con reglas de privacidad (RLS).

## Hoja de ruta

1. MVP: registro, perfil, rutinas, registro de entrenos, medidas y gráficos.
2. Tribu: tribus, retos, rankings, panel del entrenador.
3. Crecimiento: wearables, recomendaciones, informe en PDF, suscripción.

## Modo demo y Supabase

Sin variables de entorno la app funciona en modo demo: cuenta, medidas y entrenos se guardan en el navegador.

Para usar Supabase:

1. Crea un proyecto en supabase.com y ejecuta `supabase/schema.sql` en el editor SQL.
2. Copia `.env.example` a `.env.local` y rellena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Registro, inicio de sesión, medidas, entrenos y planes pasan a guardarse en Supabase.
4. En Authentication → Providers → Email puedes desactivar "Confirm email" mientras pruebas.

## Pantallas

`/registro`, `/login`, `/panel`, `/rutinas`, `/nutricion`, `/medidas`, `/pagos`, `/propuestas`, `/cuenta`, `/olvide`, `/nueva-clave`, `/terminos`, `/privacidad` y `/entrenador` (solo cuentas de entrenador/a).

## Entrenador/a y alumnos

- Al registrarse como entrenador/a se genera un código de invitación.
- El alumno lo escribe al registrarse (o en su Panel) y queda vinculado.
- La entrenadora ve peso, entrenos y estado (al día / revisar / en riesgo) de los alumnos vinculados que marcaron el permiso de compartir con su entrenador.
- Personaliza las rutinas de cada alumno: edita ejercicios, series y cargas, o crea rutinas propias, y elige cuáles tocan cada semana.
- Fija el objetivo de nutrición de cada alumno (calorías, macros, agua y notas). Sin objetivo, el alumno ve una estimación orientativa según su peso y objetivo.
- Ve la media de calorías y proteína que registra cada alumno.
- Asigna planes de 1, 2, 4 u 8 semanas. La semana N se libera N-1 semanas después del inicio, tanto en la interfaz como en la base de datos.

## Propuestas automáticas (rutinas y nutrición)

Con muchos alumnos no se puede armar cada plan a mano, así que el sistema **genera borradores** y la entrenadora los **valida**:

1. El alumno completa su **perfil de entrenamiento** en Inicio: edad, sexo, altura, días por semana, lugar (casa o gimnasio), molestias o lesiones, y restricciones alimentarias.
2. Al abrir la app, el sistema prepara, para cada alumno con perfil que le dio permiso, un **plan de 4 semanas** (cuando no tiene uno en marcha) y un **objetivo de nutrición** (cuando no tiene o conviene ajustarlo).
3. La entrenadora los ve en **Propuestas**: los que traen avisos (lesiones, menores de edad, datos que faltan) aparte, y los limpios listos para **aprobar en bloque**. Puede editar cualquiera antes de enviarlo, o rechazarlo.
4. **Nada llega al alumno hasta que se aprueba.** El alumno no puede ver ni consultar los borradores (no hay política de acceso para él en la base de datos).

El motor (`src/lib/motor.ts`) usa reglas explicables, sin IA: objetivo y nivel, días y lugar de entrenamiento, ejercicios que evitan las zonas con molestias, constancia real de las últimas 4 semanas, tendencia del peso, y la fórmula de Mifflin-St Jeor para las calorías con suelos de seguridad. Cada propuesta explica sus razones. Se puede probar aparte, sin la web.

## Pagos y sector premium

- La entrenadora configura su cuota (precio, moneda, días de gracia), un enlace de pago con tarjeta del proveedor que prefiera (Mercado Pago, Stripe, PayPal...) y su código QR.
- Tribu Fit **no recibe ni guarda datos de tarjeta**: el pago con tarjeta se hace en la página del proveedor. El alumno avisa su pago (con comprobante opcional) y la entrenadora lo confirma, o registra cobros en efectivo.
- El seguimiento personalizado (plan de rutinas y objetivo de nutrición) es **premium**. Si la cuota vence y pasan los días de gracia, se bloquea solo, y vuelve al confirmar un pago nuevo. La entrenadora puede bloquear o dar cortesía a mano. El bloqueo se aplica en la base de datos (función `premium_activo`), no solo en la interfaz.
- Una entrenadora que no configura un cobro no bloquea a nadie.

## Cuenta, recuperar contraseña y aviso legal

- **Confirmación de correo:** el enlace del correo lleva a `/confirmado`, que termina el alta y entra a la app. Si Supabase redirige a la portada, esta reenvía el enlace a `/confirmado` (o a `/nueva-clave` si es de recuperación).
- **Recuperar contraseña:** `/olvide` envía un enlace por correo y `/nueva-clave` permite elegir la clave nueva. En Supabase hay que configurar, en *Authentication → URL Configuration*, el **Site URL** (`https://tribu-fit.vercel.app`) y añadir `https://tribu-fit.vercel.app/nueva-clave` a **Redirect URLs**. El correo predeterminado de Supabase tiene un límite muy bajo de envíos por hora: para uso real conviene configurar un SMTP propio (*Authentication → SMTP Settings*).
- **Aviso legal:** `/terminos` y `/privacidad`. Son una **plantilla orientativa** y deben revisarse con un profesional antes de abrir al público. El registro exige aceptarlos y guarda la versión aceptada (`VERSION_LEGAL` en `src/lib/legal.ts`; súbela cuando cambien los textos).
- **Variables de entorno opcionales** (Vercel, *Settings → Environment Variables*): `NEXT_PUBLIC_RESPONSABLE` (nombre o razón social) y `NEXT_PUBLIC_CONTACTO_EMAIL` (correo para derechos de datos). Salen en las páginas legales.
- **Derechos del usuario** (`/cuenta`): descargar sus datos, cambiar permisos de compartir, cambiar contraseña y **eliminar la cuenta** (función `eliminar_mi_cuenta`, migración 005).

## Migraciones de base de datos

`supabase/schema.sql` crea todo desde cero. Si ya ejecutaste una versión anterior, ejecuta solo las migraciones nuevas de `supabase/migraciones/` en orden (`002_nutricion.sql`, `003_pagos.sql`, `004_premium.sql`, `005_cuenta_legal.sql`, `006_propuestas.sql`, `007_comunidad.sql`, `008_mercadopago_bancos.sql`, `009_aviso_cuentas.sql`, `010_chequeo_mensual.sql`).

## App móvil (PWA y APK)

- **PWA**: `manifest.webmanifest`, iconos, service worker (`public/sw.js`, solo estáticos + `/offline`) y botón de instalación en `/descargar`.
- **APK Android** (`android/`): envoltorio WebView que abre `/ir`. Se compila sin Android Studio con `cd android && bash build-apk.sh` (descarga herramientas fijadas por SHA-256; crea `android/claves/` la primera vez).
  **Guarda `android/claves/` (git-ignorado): las actualizaciones deben firmarse con la misma clave.**
- **Publicar una versión**: compilar y luego `node scripts/publicar-apk.mjs android/build/tribu-fit-X.Y.Z.apk <SHA256_certificado>`; copia el APK a `public/` y actualiza `src/lib/apk.json`. La web lo ofrece en `/descargar` y en la portada.

## Comunidad y herramientas (migración 007)

- **Chat** entrenador/a ↔ alumno (con tema opcional: una rutina o ejercicio). Solo dentro de la pareja vinculada; solo el destinatario puede marcar «leído».
- **Avisos**: campana con contador. Los crean disparadores de la base (mensaje nuevo, plan nuevo, nutrición actualizada, pago por confirmar/resuelto). Además, «Para hoy» calcula recordatorios en el dispositivo (entreno, peso, comidas, cuota, retos). Notificaciones del navegador (opt‑in en Cuenta) solo con la app abierta: no hay *push* con la app cerrada (requeriría un servidor de notificaciones).
- **Fotos de progreso** y **marcas por ejercicio** (1RM estimado y gráfico); la entrenadora las ve en la ficha solo si el alumno le dio permiso.
- **Biblioteca de ejercicios** (`src/lib/ejercicios.ts`) enlazada desde las rutinas.
- **Retos** de la entrenadora, **ranking** de la tribu (función `ranking_tribu`, solo quien activó «compartir con la tribu») e **insignias**.
- **Recetas** (`src/lib/recetas.ts`): sugiere recetas según lo que le queda del día, respeta restricciones del perfil y ajusta la porción.
- **Panel de la entrenadora**: resumen semanal y alertas (inactivos, sin peso, estancados, sin permiso, pago bloqueado).
- **Tema** claro/oscuro/automático (Cuenta) y **deslizar** entre pestañas.

## Cobro automático con Mercado Pago y bancos (migración 008)

1. Ejecuta `supabase/migraciones/008_mercadopago_bancos.sql` en Supabase.
2. En Vercel → Settings → Environment Variables añade (solo servidor): `SUPABASE_SERVICE_ROLE_KEY` y `MP_ENCRYPTION_KEY` (ver `.env.example`) y vuelve a desplegar.
3. La entrenadora entra a **Pagos → Mi cobro → Cobro automático** y pega su *Access Token de producción* (Mercado Pago Developers → Tus integraciones → Credenciales de producción).

Cómo funciona: el alumno toca «Pagar con Mercado Pago» → `POST /api/mp/pagar` crea una preferencia (Checkout Pro) **en la cuenta de su entrenadora** con `external_reference = tf:<alumno>` y `notification_url = /api/mp/webhook?c=<entrenadora>`. Mercado Pago avisa al webhook; el servidor **consulta el pago a Mercado Pago con el token de la entrenadora** (no se fía del aviso), comprueba alumno, monto y moneda, y registra un pago `confirmado` (+30 días, idempotente por `mp_payment_id`). Reembolsos/contracargos pasan el pago a `rechazado`.

Seguridad: el token se cifra con AES‑256‑GCM (`src/lib/servidor/cripto.ts`) y se guarda en `mp_cuentas`, tabla sin acceso desde la app (solo la clave de servicio). Nunca vuelve al navegador. El webhook no valida la firma `x-signature` (cada entrenadora tiene su propia aplicación); la autenticidad se garantiza consultando el pago directamente.

Bancos y billeteras: tabla `cuentas_bancarias` (banco, titular, alias, CBU/CVU con verificación del dígito, CUIT/CUIL). Los alumnos ven las cuentas de su entrenadora con botón de copiar.

## Chequeo mensual con fotos (migración 010)

Cada 30 días el alumno sube 3 fotos (frente, perfil, espalda) en **Progreso**; la app compara con su primer chequeo («antes y después»), avisa cuando se acerca (25 días), toca (30) o vence (35) y la entrenadora ve el estado en las alertas, la lista de alumnos y la ficha (solo si el alumno dio permiso). Sin la migración 010 las fotos siguen funcionando, sin ángulo.
