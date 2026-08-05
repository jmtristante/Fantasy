-- 0006_mercado_diario.sql
-- Mercado manual por liga con reinicio diario a una hora configurable.
--   * liga.ligas.mercado_reset_hora: hora (TIME) a la que se reinicia el
--     mercado cada dia. Cuando pasa esa hora, el mercado del dia activo
--     avanza y queda vacio hasta que el admin anade jugadores de nuevo.
--   * liga.market_entradas: jugadores que hay en el mercado de una liga para
--     una fecha (un "ciclo" de mercado). Lo rellena el usuario desde la web.
--   * liga.v_market_historial: historial de mercados pasados con detalle.

-- ============ UP
ALTER TABLE liga.ligas ADD COLUMN IF NOT EXISTS mercado_reset_hora TIME;

CREATE TABLE IF NOT EXISTS liga.market_entradas (
    id         BIGSERIAL PRIMARY KEY,
    liga_id    BIGINT NOT NULL REFERENCES liga.ligas(id) ON DELETE CASCADE,
    fecha      DATE NOT NULL,
    jugador_id INTEGER NOT NULL REFERENCES public.jugadores(jugador_id) ON DELETE CASCADE,
    creado     TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por VARCHAR(300),
    UNIQUE (liga_id, fecha, jugador_id)
);

CREATE INDEX IF NOT EXISTS ix_market_entradas ON liga.market_entradas (liga_id, fecha);

GRANT SELECT, INSERT, DELETE ON liga.market_entradas TO authenticated;
GRANT USAGE ON SEQUENCE liga.market_entradas_id_seq TO authenticated;

ALTER TABLE liga.market_entradas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS market_all_autenticado ON liga.market_entradas;
CREATE POLICY market_all_autenticado ON liga.market_entradas
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Historial de mercados (todos los dias, con detalle de jugadores).
CREATE OR REPLACE VIEW liga.v_market_historial AS
SELECT me.id, me.liga_id, lg.nombre AS liga, me.fecha, me.jugador_id,
       j.nombre AS jugador, j.posicion, e.nombre AS equipo,
       me.creado, me.creado_por
FROM liga.market_entradas me
JOIN liga.ligas lg ON lg.id = me.liga_id
JOIN public.jugadores j ON j.jugador_id = me.jugador_id
LEFT JOIN public.equipos e ON e.equipo_id = j.equipo_id
ORDER BY me.liga_id, me.fecha DESC, me.creado;

GRANT SELECT ON liga.v_market_historial TO authenticated;

-- ============ DOWN
DROP VIEW IF EXISTS liga.v_market_historial;
DROP POLICY IF EXISTS market_all_autenticado ON liga.market_entradas;
DROP TABLE IF EXISTS liga.market_entradas;
ALTER TABLE liga.ligas DROP COLUMN IF EXISTS mercado_reset_hora;
