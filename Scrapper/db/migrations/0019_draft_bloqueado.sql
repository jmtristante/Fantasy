-- 0019_draft_bloqueado.sql
-- Los jugadores asignados en el draft inicial no generan un movimiento, por lo
-- que v_bloqueo_actual no les aplicaba bloqueo de clausula. A partir de ahora se
-- tratan como si se hubieran comprado el dia en que se abrio la liga
-- (liga.ligas.creado): quedan bloqueados 14 dias desde esa fecha.

-- =UP
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
    UNION ALL
    SELECT ch.liga_id, ch.jugador_id,
           lg.creado + INTERVAL '14 days' AS bloqueado_hasta
    FROM liga.clausulas_historial ch
    JOIN liga.ligas lg ON lg.id = ch.liga_id
    WHERE ch.motivo = 'draft_inicial'
) t
WHERE jugador_id IS NOT NULL
GROUP BY liga_id, jugador_id;

ALTER VIEW liga.v_bloqueo_actual SET (security_invoker = true);
GRANT SELECT ON liga.v_bloqueo_actual TO authenticated, anon;

-- =DOWN
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

GRANT SELECT ON liga.v_bloqueo_actual TO authenticated, anon;