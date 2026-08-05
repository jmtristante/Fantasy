-- 0010_bloqueo_blindaje.sql
-- Reglas de bloqueo de un jugador, derivadas del historial de movimientos:
--   * 2 semanas tras una compra de mercado (compra_mercado) o activacion de clausula
--   * 24 horas tras un blindaje (movimiento tipo 'blindaje')
-- El jugador esta bloqueado mientras la fecha limite de bloqueo sea futura.
-- La clausula por defecto ya es el ultimo registro de clausulas_historial
-- (precio de compra o valor subido por subida_clausula).

-- =UP
ALTER TABLE liga.movimientos
    DROP CONSTRAINT IF EXISTS movimientos_tipo_check;

ALTER TABLE liga.movimientos
    ADD CONSTRAINT movimientos_tipo_check
    CHECK (tipo IN
      ('compra_mercado', 'venta_mercado', 'clausula',
       'subida_clausula', 'blindaje', 'ajuste',
       'entrada', 'salida', 'pago_jornada'));

-- Fecha limite de bloqueo por jugador y liga.
CREATE OR REPLACE VIEW liga.v_bloqueo_actual AS
SELECT liga_id, jugador_id, MAX(bloqueado_hasta) AS bloqueado_hasta
FROM (
    SELECT mv.liga_id, mv.jugador_id,
           mv.fecha + INTERVAL '14 days' AS bloqueado_hasta
    FROM liga.movimientos mv
    WHERE mv.tipo IN ('compra_mercado', 'clausula')
    UNION ALL
    SELECT mv.liga_id, mv.jugador_id,
           mv.fecha + INTERVAL '24 hours' AS bloqueado_hasta
    FROM liga.movimientos mv
    WHERE mv.tipo = 'blindaje'
) t
WHERE jugador_id IS NOT NULL
GROUP BY liga_id, jugador_id;

DROP VIEW IF EXISTS liga.v_plantilla;
CREATE VIEW liga.v_plantilla AS
SELECT p.liga_id, lg.nombre AS liga, p.miembro_id, m.nombre AS miembro,
       j.jugador_id, j.nombre AS jugador, j.posicion, e.nombre AS equipo,
       ca.clausula, ca.fecha AS clausula_desde,
       pa.valor AS valor_mercado, pa.tendencia, p.desde AS en_plantilla_desde,
       bl.bloqueado_hasta,
       (bl.bloqueado_hasta IS NOT NULL AND bl.bloqueado_hasta > now()) AS bloqueado
FROM liga.plantillas p
JOIN liga.ligas lg ON lg.id = p.liga_id
JOIN liga.miembros m ON m.id = p.miembro_id
JOIN public.jugadores j ON j.jugador_id = p.jugador_id
LEFT JOIN public.equipos e ON e.equipo_id = j.equipo_id
LEFT JOIN liga.v_clausula_actual ca ON ca.liga_id = p.liga_id AND ca.jugador_id = p.jugador_id
LEFT JOIN public.v_precio_actual pa ON pa.jugador_id = p.jugador_id
LEFT JOIN liga.v_bloqueo_actual bl ON bl.liga_id = p.liga_id AND bl.jugador_id = p.jugador_id
ORDER BY p.liga_id, m.nombre, j.nombre;

GRANT SELECT ON liga.v_bloqueo_actual TO authenticated, anon;
GRANT SELECT ON liga.v_plantilla TO authenticated, anon;

-- =DOWN
ALTER TABLE liga.movimientos
    DROP CONSTRAINT IF EXISTS movimientos_tipo_check;

ALTER TABLE liga.movimientos
    ADD CONSTRAINT movimientos_tipo_check
    CHECK (tipo IN
      ('compra_mercado', 'venta_mercado', 'clausula',
       'subida_clausula', 'ajuste',
       'entrada', 'salida', 'pago_jornada'));

DROP VIEW IF EXISTS liga.v_bloqueo_actual;

DROP VIEW IF EXISTS liga.v_plantilla;
CREATE VIEW liga.v_plantilla AS
SELECT p.liga_id, lg.nombre AS liga, p.miembro_id, m.nombre AS miembro,
       j.jugador_id, j.nombre AS jugador, j.posicion, e.nombre AS equipo,
       ca.clausula, ca.fecha AS clausula_desde,
       pa.valor AS valor_mercado, p.desde AS en_plantilla_desde
FROM liga.plantillas p
JOIN liga.ligas lg ON lg.id = p.liga_id
JOIN liga.miembros m ON m.id = p.miembro_id
JOIN public.jugadores j ON j.jugador_id = p.jugador_id
LEFT JOIN public.equipos e ON e.equipo_id = j.equipo_id
LEFT JOIN liga.v_clausula_actual ca ON ca.liga_id = p.liga_id AND ca.jugador_id = p.jugador_id
LEFT JOIN public.v_precio_actual pa ON pa.jugador_id = p.jugador_id
ORDER BY p.liga_id, m.nombre, j.nombre;

GRANT SELECT ON liga.v_plantilla TO authenticated, anon;
