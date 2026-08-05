# fantasy-web

Aplicación web para visualizar y gestionar tu liga privada de LaLiga Fantasy.
Frontend con **Next.js 16** (App Router), **Tailwind CSS v4** y **shadcn/ui**
(Base UI). Autenticación y datos vía **Supabase** (Auth + PostgREST con RLS).

## Requisitos

- Node.js 20+

## Puesta en marcha

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Configuración de Supabase

1. **Variables de entorno**: copia `.env.example` a `.env.local` y rellena los
   valores reales desde el dashboard de Supabase:

   - `NEXT_PUBLIC_SUPABASE_URL` → Settings > API > Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Settings > API > Project API keys > anon public

2. **Exponer el esquema `liga`** (obligatorio para leer los datos privados por REST):
   - Supabase > Settings > API > **Exposed schemas** → marca **`liga`** (además de `public`).

3. **Autenticación**:
   - Settings > Authentication > Providers > Email: asegúrate de que está habilitado.
   - Los usuarios se registran desde `/auth/signup` o se crean desde
     Settings > Authentication > Users.

4. **Permisos (RLS/grants)**: ya quedaron aplicados por la migración SQL `0005_rls_grants.sql`
   del proyecto `Scrapper` (`python main.py setup`). Si cambias el esquema, reaplica.

## Estructura

- `src/lib/supabase/client.ts` — cliente de navegador.
- `src/lib/supabase/server.ts` — cliente de servidor (cookies).
- `src/lib/supabase/middleware.ts` + `src/proxy.ts` — refresco de sesión y protección de rutas.
- `src/app/(auth)` — login y registro.
- `src/app/(app)` — dashboard y secciones (ligas, plantillas, mercado, clausulables,
  movimientos, alineaciones). Por ahora con marcadores "En construcción".

## Despliegue en Vercel

1. Sube este proyecto a un repositorio de GitHub/GitLab.
2. En [vercel.com](https://vercel.com), importa el repositorio (Next.js se detecta solo).
3. Añade las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Project > Settings > Environment Variables.
4. Deploy. La sesión se gestiona con cookies (no hace falta configuración extra).
