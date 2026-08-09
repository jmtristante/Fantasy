-- 0014_rls_visibilidad_liga.sql
-- Solo los miembros de una liga (o su creador) pueden verla y operar sobre ella.
-- Regla: un usuario autenticado ve/gestiona una liga si su email
--   * coincide con liga.ligas.creado_por, o
--   * esta en liga.miembros.email de esa liga.
-- Las vistas del esquema liga se marcan con security_invoker para que el RLS
-- de las tablas base se aplique tambien al leerlas (por defecto las vistas se
-- ejecutan con el owner y eluden RLS).

-- =UP
-- Columna que identifica al creador de la liga (email del que la crea).
ALTER TABLE liga.ligas ADD COLUMN IF NOT EXISTS creado_por TEXT;

-- Backfill: las ligas ya creadas toman como creador al primer miembro (el que
-- se auto-añadió al crear la liga).
UPDATE liga.ligas l
SET creado_por = (
    SELECT m.email FROM liga.miembros m
    WHERE m.liga_id = l.id AND m.email IS NOT NULL
    ORDER BY m.id LIMIT 1
)
WHERE l.creado_por IS NULL;

-- Funcion auxiliar: true si el usuario autenticado pertenece a la liga
-- (es el creador o su email esta en la tabla de miembros).
CREATE OR REPLACE FUNCTION liga.accede_a_liga(p_liga_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM liga.ligas l
        WHERE l.id = p_liga_id
          AND (
                lower(l.creado_por) = lower(auth.jwt() ->> 'email')
                OR EXISTS (
                    SELECT 1 FROM liga.miembros m
                    WHERE m.liga_id = l.id
                      AND lower(m.email) = lower(auth.jwt() ->> 'email')
                )
          )
    );
$$;

REVOKE ALL ON FUNCTION liga.accede_a_liga(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION liga.accede_a_liga(bigint) TO authenticated;

-- ============ liga.ligas ============
DROP POLICY IF EXISTS liga_all_autenticado ON liga.ligas;
DROP POLICY IF EXISTS liga_select ON liga.ligas;
DROP POLICY IF EXISTS liga_insert ON liga.ligas;
DROP POLICY IF EXISTS liga_update_delete ON liga.ligas;

CREATE POLICY liga_select ON liga.ligas
    FOR SELECT TO authenticated USING (liga.accede_a_liga(id));

-- Solo puedes crear ligas cuyo creador seas tu.
CREATE POLICY liga_insert ON liga.ligas
    FOR INSERT TO authenticated WITH CHECK (lower(creado_por) = lower(auth.jwt() ->> 'email'));

CREATE POLICY liga_update ON liga.ligas
    FOR UPDATE TO authenticated USING (liga.accede_a_liga(id));

CREATE POLICY liga_delete ON liga.ligas
    FOR DELETE TO authenticated USING (liga.accede_a_liga(id));

-- ============ liga.miembros ============
DROP POLICY IF EXISTS miembros_all_autenticado ON liga.miembros;
DROP POLICY IF EXISTS miembros_select ON liga.miembros;
DROP POLICY IF EXISTS miembros_insert ON liga.miembros;
DROP POLICY IF EXISTS miembros_update_delete ON liga.miembros;

CREATE POLICY miembros_select ON liga.miembros
    FOR SELECT TO authenticated USING (liga.accede_a_liga(liga_id));

-- El creador (o un miembro) puede registrar a otros participantes.
CREATE POLICY miembros_insert ON liga.miembros
    FOR INSERT TO authenticated WITH CHECK (liga.accede_a_liga(liga_id));

CREATE POLICY miembros_update ON liga.miembros
    FOR UPDATE TO authenticated USING (liga.accede_a_liga(liga_id));

CREATE POLICY miembros_delete ON liga.miembros
    FOR DELETE TO authenticated USING (liga.accede_a_liga(liga_id));

-- ============ resto de tablas (todas keyed por liga_id) ============
DROP POLICY IF EXISTS movimientos_all_autenticado ON liga.movimientos;
DROP POLICY IF EXISTS movimientos_all ON liga.movimientos;
CREATE POLICY movimientos_all ON liga.movimientos
    FOR ALL TO authenticated USING (liga.accede_a_liga(liga_id)) WITH CHECK (liga.accede_a_liga(liga_id));

DROP POLICY IF EXISTS plantillas_all_autenticado ON liga.plantillas;
DROP POLICY IF EXISTS plantillas_all ON liga.plantillas;
CREATE POLICY plantillas_all ON liga.plantillas
    FOR ALL TO authenticated USING (liga.accede_a_liga(liga_id)) WITH CHECK (liga.accede_a_liga(liga_id));

DROP POLICY IF EXISTS clausulas_all_autenticado ON liga.clausulas_historial;
DROP POLICY IF EXISTS clausulas_all ON liga.clausulas_historial;
CREATE POLICY clausulas_all ON liga.clausulas_historial
    FOR ALL TO authenticated USING (liga.accede_a_liga(liga_id)) WITH CHECK (liga.accede_a_liga(liga_id));

DROP POLICY IF EXISTS alineaciones_all_autenticado ON liga.liga_alineaciones;
DROP POLICY IF EXISTS alineaciones_all ON liga.liga_alineaciones;
CREATE POLICY alineaciones_all ON liga.liga_alineaciones
    FOR ALL TO authenticated USING (liga.accede_a_liga(liga_id)) WITH CHECK (liga.accede_a_liga(liga_id));

DROP POLICY IF EXISTS market_all_autenticado ON liga.market_entradas;
DROP POLICY IF EXISTS market_all ON liga.market_entradas;
CREATE POLICY market_all ON liga.market_entradas
    FOR ALL TO authenticated USING (liga.accede_a_liga(liga_id)) WITH CHECK (liga.accede_a_liga(liga_id));

-- ============ vistas: aplican el RLS de las tablas base ============
ALTER VIEW liga.v_clausula_actual SET (security_invoker = true);
ALTER VIEW liga.v_miembros_saldo SET (security_invoker = true);
ALTER VIEW liga.v_plantilla SET (security_invoker = true);
ALTER VIEW liga.v_mercado_actual SET (security_invoker = true);
ALTER VIEW liga.v_clausulables SET (security_invoker = true);
ALTER VIEW liga.v_movimientos_detalle SET (security_invoker = true);
ALTER VIEW liga.v_resumen_liga SET (security_invoker = true);
ALTER VIEW liga.v_market_historial SET (security_invoker = true);
ALTER VIEW liga.v_bloqueo_actual SET (security_invoker = true);

-- =DOWN
ALTER VIEW liga.v_clausula_actual RESET (security_invoker);
ALTER VIEW liga.v_miembros_saldo RESET (security_invoker);
ALTER VIEW liga.v_plantilla RESET (security_invoker);
ALTER VIEW liga.v_mercado_actual RESET (security_invoker);
ALTER VIEW liga.v_clausulables RESET (security_invoker);
ALTER VIEW liga.v_movimientos_detalle RESET (security_invoker);
ALTER VIEW liga.v_resumen_liga RESET (security_invoker);
ALTER VIEW liga.v_market_historial RESET (security_invoker);
ALTER VIEW liga.v_bloqueo_actual RESET (security_invoker);

DROP POLICY IF EXISTS liga_select ON liga.ligas;
DROP POLICY IF EXISTS liga_insert ON liga.ligas;
DROP POLICY IF EXISTS liga_update ON liga.ligas;
DROP POLICY IF EXISTS liga_delete ON liga.ligas;
DROP POLICY IF EXISTS miembros_select ON liga.miembros;
DROP POLICY IF EXISTS miembros_insert ON liga.miembros;
DROP POLICY IF EXISTS miembros_update ON liga.miembros;
DROP POLICY IF EXISTS miembros_delete ON liga.miembros;
DROP POLICY IF EXISTS movimientos_all ON liga.movimientos;
DROP POLICY IF EXISTS plantillas_all ON liga.plantillas;
DROP POLICY IF EXISTS clausulas_all ON liga.clausulas_historial;
DROP POLICY IF EXISTS alineaciones_all ON liga.liga_alineaciones;
DROP POLICY IF EXISTS market_all ON liga.market_entradas;

CREATE POLICY liga_all_autenticado ON liga.ligas
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY miembros_all_autenticado ON liga.miembros
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY movimientos_all_autenticado ON liga.movimientos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY plantillas_all_autenticado ON liga.plantillas
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY clausulas_all_autenticado ON liga.clausulas_historial
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY alineaciones_all_autenticado ON liga.liga_alineaciones
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY market_all_autenticado ON liga.market_entradas
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP FUNCTION IF EXISTS liga.accede_a_liga(bigint);
ALTER TABLE liga.ligas DROP COLUMN IF EXISTS creado_por;