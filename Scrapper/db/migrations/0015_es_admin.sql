-- 0015_es_admin.sql
-- Introduce el rol "admin" en cada liga: solo el admin (por defecto el creador)
-- puede modificar datos; el resto de miembros solo puede ver.
--   * liga.miembros.es_admin: boolean que marca a los admins de su liga.
--   * RLS: SELECT para todos los miembros; INSERT/UPDATE/DELETE solo para admin.

-- =UP
ALTER TABLE liga.miembros ADD COLUMN IF NOT EXISTS es_admin BOOLEAN NOT NULL DEFAULT false;

-- Backfill: el creador de cada liga (ligas.creado_por) pasa a ser admin.
UPDATE liga.miembros m
SET es_admin = true
FROM liga.ligas l
WHERE l.id = m.liga_id
  AND l.creado_por IS NOT NULL
  AND lower(m.email) = lower(l.creado_por);

-- Funcion auxiliar: true si el usuario autenticado es admin de la liga.
CREATE OR REPLACE FUNCTION liga.es_admin(p_liga_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT coalesce(bool_or(m.es_admin), false)
    FROM liga.miembros m
    WHERE m.liga_id = p_liga_id
      AND lower(m.email) = lower(auth.jwt() ->> 'email');
$$;

REVOKE ALL ON FUNCTION liga.es_admin(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION liga.es_admin(bigint) TO authenticated;

-- ============ liga.ligas ============
-- SELECT: todos los miembros. UPDATE/DELETE: solo el admin.
DROP POLICY IF EXISTS liga_update ON liga.ligas;
DROP POLICY IF EXISTS liga_delete ON liga.ligas;
DROP POLICY IF EXISTS liga_update_admin ON liga.ligas;
DROP POLICY IF EXISTS liga_delete_admin ON liga.ligas;

CREATE POLICY liga_update_admin ON liga.ligas
    FOR UPDATE TO authenticated USING (liga.es_admin(id));

CREATE POLICY liga_delete_admin ON liga.ligas
    FOR DELETE TO authenticated USING (liga.es_admin(id));

-- ============ liga.miembros ============
-- SELECT: todos los miembros. INSERT: el admin, o el creador al auto-registrarse.
-- UPDATE/DELETE: solo el admin.
DROP POLICY IF EXISTS miembros_insert ON liga.miembros;
DROP POLICY IF EXISTS miembros_update ON liga.miembros;
DROP POLICY IF EXISTS miembros_delete ON liga.miembros;
DROP POLICY IF EXISTS miembros_insert_admin ON liga.miembros;
DROP POLICY IF EXISTS miembros_update_admin ON liga.miembros;
DROP POLICY IF EXISTS miembros_delete_admin ON liga.miembros;

CREATE POLICY miembros_insert_admin ON liga.miembros
    FOR INSERT TO authenticated
    WITH CHECK (
        liga.es_admin(liga_id)
        OR EXISTS (
            SELECT 1 FROM liga.ligas l
            WHERE l.id = liga_id
              AND l.creado_por IS NOT NULL
              AND lower(l.creado_por) = lower(auth.jwt() ->> 'email')
        )
    );

CREATE POLICY miembros_update_admin ON liga.miembros
    FOR UPDATE TO authenticated USING (liga.es_admin(liga_id));

CREATE POLICY miembros_delete_admin ON liga.miembros
    FOR DELETE TO authenticated USING (liga.es_admin(liga_id));

-- ============ resto de tablas (INSERT/UPDATE/DELETE solo admin) ============
DROP POLICY IF EXISTS movimientos_all ON liga.movimientos;
DROP POLICY IF EXISTS plantillas_all ON liga.plantillas;
DROP POLICY IF EXISTS clausulas_all ON liga.clausulas_historial;
DROP POLICY IF EXISTS alineaciones_all ON liga.liga_alineaciones;
DROP POLICY IF EXISTS market_all ON liga.market_entradas;

DROP POLICY IF EXISTS movimientos_select ON liga.movimientos;
DROP POLICY IF EXISTS plantillas_select ON liga.plantillas;
DROP POLICY IF EXISTS clausulas_select ON liga.clausulas_historial;
DROP POLICY IF EXISTS alineaciones_select ON liga.liga_alineaciones;
DROP POLICY IF EXISTS market_select ON liga.market_entradas;
DROP POLICY IF EXISTS movimientos_write ON liga.movimientos;
DROP POLICY IF EXISTS plantillas_write ON liga.plantillas;
DROP POLICY IF EXISTS clausulas_write ON liga.clausulas_historial;
DROP POLICY IF EXISTS alineaciones_write ON liga.liga_alineaciones;
DROP POLICY IF EXISTS market_write ON liga.market_entradas;

-- SELECT para todos los miembros.
CREATE POLICY movimientos_select ON liga.movimientos
    FOR SELECT TO authenticated USING (liga.accede_a_liga(liga_id));
CREATE POLICY plantillas_select ON liga.plantillas
    FOR SELECT TO authenticated USING (liga.accede_a_liga(liga_id));
CREATE POLICY clausulas_select ON liga.clausulas_historial
    FOR SELECT TO authenticated USING (liga.accede_a_liga(liga_id));
CREATE POLICY alineaciones_select ON liga.liga_alineaciones
    FOR SELECT TO authenticated USING (liga.accede_a_liga(liga_id));
CREATE POLICY market_select ON liga.market_entradas
    FOR SELECT TO authenticated USING (liga.accede_a_liga(liga_id));

-- Escritura (INSERT/UPDATE/DELETE) solo admin.
CREATE POLICY movimientos_write ON liga.movimientos
    FOR ALL TO authenticated USING (liga.es_admin(liga_id)) WITH CHECK (liga.es_admin(liga_id));
CREATE POLICY plantillas_write ON liga.plantillas
    FOR ALL TO authenticated USING (liga.es_admin(liga_id)) WITH CHECK (liga.es_admin(liga_id));
CREATE POLICY clausulas_write ON liga.clausulas_historial
    FOR ALL TO authenticated USING (liga.es_admin(liga_id)) WITH CHECK (liga.es_admin(liga_id));
CREATE POLICY alineaciones_write ON liga.liga_alineaciones
    FOR ALL TO authenticated USING (liga.es_admin(liga_id)) WITH CHECK (liga.es_admin(liga_id));
CREATE POLICY market_write ON liga.market_entradas
    FOR ALL TO authenticated USING (liga.es_admin(liga_id)) WITH CHECK (liga.es_admin(liga_id));

-- =DOWN
DROP POLICY IF EXISTS liga_update_admin ON liga.ligas;
DROP POLICY IF EXISTS liga_delete_admin ON liga.ligas;
DROP POLICY IF EXISTS miembros_insert_admin ON liga.miembros;
DROP POLICY IF EXISTS miembros_update_admin ON liga.miembros;
DROP POLICY IF EXISTS miembros_delete_admin ON liga.miembros;
DROP POLICY IF EXISTS movimientos_select ON liga.movimientos;
DROP POLICY IF EXISTS plantillas_select ON liga.plantillas;
DROP POLICY IF EXISTS clausulas_select ON liga.clausulas_historial;
DROP POLICY IF EXISTS alineaciones_select ON liga.liga_alineaciones;
DROP POLICY IF EXISTS market_select ON liga.market_entradas;
DROP POLICY IF EXISTS movimientos_write ON liga.movimientos;
DROP POLICY IF EXISTS plantillas_write ON liga.plantillas;
DROP POLICY IF EXISTS clausulas_write ON liga.clausulas_historial;
DROP POLICY IF EXISTS alineaciones_write ON liga.liga_alineaciones;
DROP POLICY IF EXISTS market_write ON liga.market_entradas;

CREATE POLICY liga_update ON liga.ligas
    FOR UPDATE TO authenticated USING (liga.accede_a_liga(id));
CREATE POLICY liga_delete ON liga.ligas
    FOR DELETE TO authenticated USING (liga.accede_a_liga(id));
CREATE POLICY miembros_insert ON liga.miembros
    FOR INSERT TO authenticated WITH CHECK (liga.accede_a_liga(liga_id));
CREATE POLICY miembros_update ON liga.miembros
    FOR UPDATE TO authenticated USING (liga.accede_a_liga(liga_id));
CREATE POLICY miembros_delete ON liga.miembros
    FOR DELETE TO authenticated USING (liga.accede_a_liga(liga_id));
CREATE POLICY movimientos_all ON liga.movimientos
    FOR ALL TO authenticated USING (liga.accede_a_liga(liga_id)) WITH CHECK (liga.accede_a_liga(liga_id));
CREATE POLICY plantillas_all ON liga.plantillas
    FOR ALL TO authenticated USING (liga.accede_a_liga(liga_id)) WITH CHECK (liga.accede_a_liga(liga_id));
CREATE POLICY clausulas_all ON liga.clausulas_historial
    FOR ALL TO authenticated USING (liga.accede_a_liga(liga_id)) WITH CHECK (liga.accede_a_liga(liga_id));
CREATE POLICY alineaciones_all ON liga.liga_alineaciones
    FOR ALL TO authenticated USING (liga.accede_a_liga(liga_id)) WITH CHECK (liga.accede_a_liga(liga_id));
CREATE POLICY market_all ON liga.market_entradas
    FOR ALL TO authenticated USING (liga.accede_a_liga(liga_id)) WITH CHECK (liga.accede_a_liga(liga_id));

DROP FUNCTION IF EXISTS liga.es_admin(bigint);
ALTER TABLE liga.miembros DROP COLUMN IF EXISTS es_admin;