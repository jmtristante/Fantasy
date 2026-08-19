-- 0026_mapeo_rls_auth.sql
-- Los mapeos solo se crean/refrescan/editan autenticandose en Supabase
-- (rol authenticated). El rol anon (la app sin sesion de admin) puede LEER
-- pero no escribir: asi nadie sin sesion puede modificar ni refrescar mapeos.

-- =UP
-- Quitar la politica de escritura para anon que creo la 0025 (permitia ALL).
DROP POLICY IF EXISTS mapeo_all_anon ON public.mapeo_jugadores;

-- Lectura publica para anon (rentabilidad solo lee el mapeo existente).
CREATE POLICY mapeo_read_anon ON public.mapeo_jugadores
    FOR SELECT TO anon USING (true);

-- Revocar escritura a anon. La politica mapeo_all_auth (authenticated) ya
-- existe en la 0025 y permite SELECT/INSERT/UPDATE/DELETE al rol autenticado.
REVOKE INSERT, UPDATE, DELETE ON public.mapeo_jugadores FROM anon;

-- =DOWN
DROP POLICY IF EXISTS mapeo_read_anon ON public.mapeo_jugadores;
CREATE POLICY mapeo_all_anon ON public.mapeo_jugadores
    FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT INSERT, UPDATE, DELETE ON public.mapeo_jugadores TO anon;
