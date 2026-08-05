-- 0005_rls_grants.sql
-- Habilita el acceso a traves de la API REST de Supabase (PostgREST) para la app web.
--   * public (datos scrapeados): lectura publica (anon + authenticated)
--   * liga (esquema privado): solo usuarios autenticados (lectura y gestion)
-- Nota: ademas hay que exponer el esquema "liga" en el dashboard de Supabase
-- (Settings > API > Exposed schemas > marcar "liga"). Este fichero no puede hacerlo.

-- ========== public: lectura para anon y autenticados ==========
GRANT SELECT ON public.temporadas, public.equipos, public.jugadores,
    public.jornadas, public.partidos, public.clasificacion,
    public.alineaciones, public.precios_diarios, public.v_precio_actual
    TO anon, authenticated;

-- ========== liga: esquema privado ==========
GRANT USAGE ON SCHEMA liga TO anon, authenticated;

GRANT SELECT ON liga.ligas, liga.miembros, liga.movimientos,
    liga.plantillas, liga.clausulas_historial, liga.liga_alineaciones,
    liga.v_clausula_actual, liga.v_miembros_saldo, liga.v_plantilla,
    liga.v_mercado_actual, liga.v_clausulables, liga.v_movimientos_detalle,
    liga.v_resumen_liga
    TO authenticated;

GRANT INSERT, UPDATE, DELETE ON liga.ligas, liga.miembros, liga.movimientos,
    liga.plantillas, liga.clausulas_historial, liga.liga_alineaciones
    TO authenticated;

GRANT USAGE ON SEQUENCE liga.ligas_id_seq, liga.miembros_id_seq,
    liga.movimientos_id_seq, liga.plantillas_id_seq,
    liga.clausulas_historial_id_seq, liga.liga_alineaciones_id_seq
    TO authenticated;

-- ========== RLS ==========
ALTER TABLE liga.ligas ENABLE ROW LEVEL SECURITY;
ALTER TABLE liga.miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE liga.movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE liga.plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE liga.clausulas_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE liga.liga_alineaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS liga_all_autenticado ON liga.ligas;
CREATE POLICY liga_all_autenticado ON liga.ligas
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS miembros_all_autenticado ON liga.miembros;
CREATE POLICY miembros_all_autenticado ON liga.miembros
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS movimientos_all_autenticado ON liga.movimientos;
CREATE POLICY movimientos_all_autenticado ON liga.movimientos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS plantillas_all_autenticado ON liga.plantillas;
CREATE POLICY plantillas_all_autenticado ON liga.plantillas
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS clausulas_all_autenticado ON liga.clausulas_historial;
CREATE POLICY clausulas_all_autenticado ON liga.clausulas_historial
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS alineaciones_all_autenticado ON liga.liga_alineaciones;
CREATE POLICY alineaciones_all_autenticado ON liga.liga_alineaciones
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =DOWN
DROP POLICY IF EXISTS alineaciones_all_autenticado ON liga.liga_alineaciones;
DROP POLICY IF EXISTS clausulas_all_autenticado ON liga.clausulas_historial;
DROP POLICY IF EXISTS plantillas_all_autenticado ON liga.plantillas;
DROP POLICY IF EXISTS movimientos_all_autenticado ON liga.movimientos;
DROP POLICY IF EXISTS miembros_all_autenticado ON liga.miembros;
DROP POLICY IF EXISTS liga_all_autenticado ON liga.ligas;
ALTER TABLE liga.liga_alineaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE liga.clausulas_historial DISABLE ROW LEVEL SECURITY;
ALTER TABLE liga.plantillas DISABLE ROW LEVEL SECURITY;
ALTER TABLE liga.movimientos DISABLE ROW LEVEL SECURITY;
ALTER TABLE liga.miembros DISABLE ROW LEVEL SECURITY;
ALTER TABLE liga.ligas DISABLE ROW LEVEL SECURITY;
