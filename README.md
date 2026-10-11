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

`/registro`, `/login`, `/panel`, `/rutinas`, `/medidas` y `/entrenador` (solo cuentas de entrenador/a).

## Entrenador/a y alumnos

- Al registrarse como entrenador/a se genera un código de invitación.
- El alumno lo escribe al registrarse (o en su Panel) y queda vinculado.
- La entrenadora ve peso, entrenos y estado (al día / revisar / en riesgo) de los alumnos vinculados que marcaron el permiso de compartir con su entrenador.
- Asigna planes de 1, 2, 4 u 8 semanas. La semana N se libera N-1 semanas después del inicio, tanto en la interfaz como en la base de datos.
