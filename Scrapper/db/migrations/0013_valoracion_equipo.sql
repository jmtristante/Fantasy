-- 0013_valoracion_equipo.sql
-- Amplia liga.v_miembros_saldo con dos columnas por miembro:
--   * valor_mercado_plantilla: suma del precio de mercado actual de sus jugadores.
--   * total_neto: saldo (dinero) + valor_mercado_plantilla.

-- =UP
CREATE OR REPLACE VIEW liga.v_miembros_saldo AS
SELECT m.liga_id, lg.nombre AS liga, m.id AS miembro_id, m.nombre,
       m.email, m.foto_url, m.presupuesto_inicial,
       COALESCE(mv.mov_total, 0)   AS movimientos_total,
       m.presupuesto_inicial + COALESCE(mv.mov_total, 0) AS saldo,
       COALESCE(pl.n_jugadores, 0) AS n_jugadores,
       COALESCE(pv.valor_mercado, 0) AS valor_mercado_plantilla,
       m.presupuesto_inicial + COALESCE(mv.mov_total, 0)
         + COALESCE(pv.valor_mercado, 0) AS total_neto
FROM liga.miembros m
JOIN liga.ligas lg ON lg.id = m.liga_id
LEFT JOIN (SELECT miembro_id, SUM(importe) AS mov_total
           FROM liga.movimientos GROUP BY miembro_id) mv ON mv.miembro_id = m.id
LEFT JOIN (SELECT miembro_id, COUNT(*) AS n_jugadores
           FROM liga.plantillas GROUP BY miembro_id) pl ON pl.miembro_id = m.id
LEFT JOIN (SELECT p.miembro_id, SUM(pa.valor) AS valor_mercado
           FROM liga.plantillas p
           LEFT JOIN public.v_precio_actual pa ON pa.jugador_id = p.jugador_id
           GROUP BY p.miembro_id) pv ON pv.miembro_id = m.id
ORDER BY m.liga_id, total_neto DESC, m.nombre;

GRANT SELECT ON liga.v_miembros_saldo TO authenticated, anon;

-- =DOWN
CREATE OR REPLACE VIEW liga.v_miembros_saldo AS
SELECT m.liga_id, lg.nombre AS liga, m.id AS miembro_id, m.nombre,
       m.email, m.foto_url, m.presupuesto_inicial,
       COALESCE(mv.mov_total, 0)   AS movimientos_total,
       m.presupuesto_inicial + COALESCE(mv.mov_total, 0) AS saldo,
       COALESCE(pl.n_jugadores, 0) AS n_jugadores
FROM liga.miembros m
JOIN liga.ligas lg ON lg.id = m.liga_id
LEFT JOIN (SELECT miembro_id, SUM(importe) AS mov_total
           FROM liga.movimientos GROUP BY miembro_id) mv ON mv.miembro_id = m.id
LEFT JOIN (SELECT miembro_id, COUNT(*) AS n_jugadores
           FROM liga.plantillas GROUP BY miembro_id) pl ON pl.miembro_id = m.id
ORDER BY m.liga_id, saldo DESC, m.nombre;

GRANT SELECT ON liga.v_miembros_saldo TO authenticated, anon;