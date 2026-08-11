-- 0021_rls_public_read.sql
-- RLS en las tablas del esquema public (datos scrapeados). Como la app web lee
-- estos datos a traves de PostgREST con los roles anon/authenticated, sin
-- politicas las consultas devolverian 0 filas. Aqui se anade la politica de
-- lectura para ambos roles (los datos de public son de solo lectura: la escritura
-- la hace el scraper con el rol postgres, que no esta sujeto a RLS).
-- Las vistas se marcan con security_invoker para que apliquen el RLS de las
-- tablas base al ser leidas por la API.

-- =UP
CREATE POLICY public_select_anon ON public.temporadas
    FOR SELECT TO anon USING (true);
CREATE POLICY public_select_anon ON public.equipos
    FOR SELECT TO anon USING (true);
CREATE POLICY public_select_anon ON public.jugadores
    FOR SELECT TO anon USING (true);
CREATE POLICY public_select_anon ON public.jornadas
    FOR SELECT TO anon USING (true);
CREATE POLICY public_select_anon ON public.partidos
    FOR SELECT TO anon USING (true);
CREATE POLICY public_select_anon ON public.clasificacion
    FOR SELECT TO anon USING (true);
CREATE POLICY public_select_anon ON public.alineaciones
    FOR SELECT TO anon USING (true);
CREATE POLICY public_select_anon ON public.precios_diarios
    FOR SELECT TO anon USING (true);

CREATE POLICY public_select_auth ON public.temporadas
    FOR SELECT TO authenticated USING (true);
CREATE POLICY public_select_auth ON public.equipos
    FOR SELECT TO authenticated USING (true);
CREATE POLICY public_select_auth ON public.jugadores
    FOR SELECT TO authenticated USING (true);
CREATE POLICY public_select_auth ON public.jornadas
    FOR SELECT TO authenticated USING (true);
CREATE POLICY public_select_auth ON public.partidos
    FOR SELECT TO authenticated USING (true);
CREATE POLICY public_select_auth ON public.clasificacion
    FOR SELECT TO authenticated USING (true);
CREATE POLICY public_select_auth ON public.alineaciones
    FOR SELECT TO authenticated USING (true);
CREATE POLICY public_select_auth ON public.precios_diarios
    FOR SELECT TO authenticated USING (true);

-- Las vistas de public tambien se leen desde la app (v_precio_actual, etc.).
ALTER VIEW public.v_precio_actual SET (security_invoker = true);

-- =DOWN
ALTER VIEW public.v_precio_actual RESET (security_invoker);

DROP POLICY IF EXISTS public_select_auth ON public.precios_diarios;
DROP POLICY IF EXISTS public_select_auth ON public.alineaciones;
DROP POLICY IF EXISTS public_select_auth ON public.clasificacion;
DROP POLICY IF EXISTS public_select_auth ON public.partidos;
DROP POLICY IF EXISTS public_select_auth ON public.jornadas;
DROP POLICY IF EXISTS public_select_auth ON public.jugadores;
DROP POLICY IF EXISTS public_select_auth ON public.equipos;
DROP POLICY IF EXISTS public_select_auth ON public.temporadas;

DROP POLICY IF EXISTS public_select_anon ON public.precios_diarios;
DROP POLICY IF EXISTS public_select_anon ON public.alineaciones;
DROP POLICY IF EXISTS public_select_anon ON public.clasificacion;
DROP POLICY IF EXISTS public_select_anon ON public.partidos;
DROP POLICY IF EXISTS public_select_anon ON public.jornadas;
DROP POLICY IF EXISTS public_select_anon ON public.jugadores;
DROP POLICY IF EXISTS public_select_anon ON public.equipos;
DROP POLICY IF EXISTS public_select_anon ON public.temporadas;
