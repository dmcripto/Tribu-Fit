# Tribu Fit

Entrena en tribu. Web (Next.js) y apps de fitness con comunidad y seguimiento personalizado.

## Desarrollo

```bash
npm install
npm run dev
```

## Estructura

- `src/app`: páginas de la web (Next.js App Router).
- `supabase/schema.sql`: esquema de base de datos (usuarios, medidas, entrenos, tribus, retos, consentimientos).

## Hoja de ruta

1. MVP: registro, perfil, rutinas, registro de entrenos, medidas y gráficos.
2. Tribu: tribus, retos, rankings, panel del entrenador.
3. Crecimiento: wearables, recomendaciones, informe en PDF, suscripción.

## Modo demo y Supabase

Sin variables de entorno la app funciona en modo demo: cuenta, medidas y entrenos se guardan en el navegador.

Para usar Supabase:

1. Crea un proyecto en supabase.com y ejecuta `supabase/schema.sql` en el editor SQL.
2. Copia `.env.example` a `.env.local` y rellena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. El registro y el inicio de sesión pasan a usar Supabase Auth. Medidas y entrenos siguen locales hasta conectarlos a las tablas.

## Pantallas

`/registro`, `/login`, `/panel`, `/rutinas`, `/medidas`.
