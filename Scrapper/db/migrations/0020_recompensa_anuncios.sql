-- 0020_recompensa_anuncios.sql
-- La web recompensa con 100.000 monedas al dia por ver un anuncio. Aunque no
-- genera movimientos, ese dinero se acumula en el saldo real de cada amigo, por
-- lo que el saldo calculado lo suma asumiendo que todos cobraron todas las
-- recompensas desde la creacion de la liga (liga.ligas.creado).
--
--   recompensa = dias transcurridos desde la creacion * 100000
--
-- Se aplica a liga.v_miembros_saldo (saldo, total_neto) y a v_resumen_liga
-- (saldo). No se crean filas en movimientos para no ensuciar el historial.

-- =UP
DROP VIEW IF EXISTS liga.v_miembros_saldo;
DROP VIEW IF EXISTS liga.v_resumen_liga;

CREATE VIEW liga.v_resumen_liga AS
SELECT m.liga_id, lg.nombre AS liga, m.id AS miembro_id, m.nombre,
       m.presupuesto_inicial + COALESCE(mv.mov_total, 0)
         + (CURRENT_DATE - lg.creado) * 100000 AS saldo,
       COALESCE(pl.n_jugadores, 0)    AS n_jugadores,
       COALESCE(plv.suma_clausula, 0) AS valor_clausula_plantilla,
       COALESCE(plv.suma_mercado, 0)  AS valor_mercado_plantilla,
       COALESCE(mv.gastado, 0)        AS gastado_total,
       COALESCE(mv.ganado, 0)         AS ganado_total
FROM liga.miembros m
JOIN liga.ligas lg ON lg.id = m.liga_id
LEFT JOIN (SELECT miembro_id, SUM(importe) AS mov_total,
                  SUM(CASE WHEN importe < 0 THEN importe ELSE 0 END) AS gastado,
                  SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END) AS ganado
           FROM liga.movimientos GROUP BY miembro_id) mv ON mv.miembro_id = m.id
LEFT JOIN (SELECT miembro_id, COUNT(*) AS n_jugadores
           FROM liga.plantillas GROUP BY miembro_id) pl ON pl.miembro_id = m.id
LEFT JOIN (SELECT p.miembro_id, SUM(ca.clausula) AS suma_clausula,
                  SUM(pa.valor)    AS suma_mercado
           FROM liga.plantillas p
           LEFT JOIN liga.v_clausula_actual ca ON ca.liga_id = p.liga_id AND ca.jugador_id = p.jugador_id
           LEFT JOIN public.v_precio_actual pa ON pa.jugador_id = p.jugador_id
           GROUP BY p.miembro_id) plv ON plv.miembro_id = m.id
ORDER BY m.liga_id, saldo DESC, m.nombre;

CREATE VIEW liga.v_miembros_saldo AS
SELECT m.liga_id, lg.nombre AS liga, m.id AS miembro_id, m.nombre,
       m.email, m.foto_url, m.presupuesto_inicial,
       COALESCE(mv.mov_total, 0) AS movimientos_total,
       (CURRENT_DATE - lg.creado) * 100000 AS recompensas_anuncios,
       m.presupuesto_inicial + COALESCE(mv.mov_total, 0)
         + (CURRENT_DATE - lg.creado) * 100000 AS saldo,
       COALESCE(pl.n_jugadores, 0) AS n_jugadores,
       COALESCE(pv.valor_mercado, 0) AS valor_mercado_plantilla,
       m.presupuesto_inicial + COALESCE(mv.mov_total, 0)
         + (CURRENT_DATE - lg.creado) * 100000
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

GRANT SELECT ON liga.v_resumen_liga TO authenticated;
GRANT SELECT ON liga.v_miembros_saldo TO authenticated, anon;
ALTER VIEW liga.v_resumen_liga SET (security_invoker = true);

-- =DOWN
DROP VIEW IF EXISTS liga.v_miembros_saldo;
DROP VIEW IF EXISTS liga.v_resumen_liga;

CREATE VIEW liga.v_resumen_liga AS
SELECT m.liga_id, lg.nombre AS liga, m.id AS miembro_id, m.nombre,
       m.presupuesto_inicial + COALESCE(mv.mov_total, 0) AS saldo,
       COALESCE(pl.n_jugadores, 0)    AS n_jugadores,
       COALESCE(plv.suma_clausula, 0) AS valor_clausula_plantilla,
       COALESCE(plv.suma_mercado, 0)  AS valor_mercado_plantilla,
       COALESCE(mv.gastado, 0)        AS gastado_total,
       COALESCE(mv.ganado, 0)         AS ganado_total
FROM liga.miembros m
JOIN liga.ligas lg ON lg.id = m.liga_id
LEFT JOIN (SELECT miembro_id, SUM(importe) AS mov_total,
                  SUM(CASE WHEN importe < 0 THEN importe ELSE 0 END) AS gastado,
                  SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END) AS ganado
           FROM liga.movimientos GROUP BY miembro_id) mv ON mv.miembro_id = m.id
LEFT JOIN (SELECT miembro_id, COUNT(*) AS n_jugadores
           FROM liga.plantillas GROUP BY miembro_id) pl ON pl.miembro_id = m.id
LEFT JOIN (SELECT p.miembro_id, SUM(ca.clausula) AS suma_clausula,
                  SUM(pa.valor)    AS suma_mercado
           FROM liga.plantillas p
           LEFT JOIN liga.v_clausula_actual ca ON ca.liga_id = p.liga_id AND ca.jugador_id = p.jugador_id
           LEFT JOIN public.v_precio_actual pa ON pa.jugador_id = p.jugador_id
           GROUP BY p.miembro_id) plv ON plv.miembro_id = m.id
ORDER BY m.liga_id, saldo DESC, m.nombre;

CREATE VIEW liga.v_miembros_saldo AS
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

GRANT SELECT ON liga.v_resumen_liga TO authenticated;
GRANT SELECT ON liga.v_miembros_saldo TO authenticated, anon;
ALTER VIEW liga.v_resumen_liga SET (security_invoker = true);