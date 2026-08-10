-- 0018_aceleracion_estado.sql
-- Indicador de aceleracion tal como lo muestra futbolfantasy.com: estado
-- renderizado por la web (tooltip del icono de la columna "Acel.").
-- Se almacena el texto crudo scrapeado y se expone en v_precio_actual,
-- v_plantilla y v_mercado_actual para que las tarjetas lo pinten igual que
-- la pagina oficial. Las vistas que dependen de v_precio_actual se recrean.

-- =UP
DROP VIEW IF EXISTS liga.v_miembros_saldo;
DROP VIEW IF EXISTS liga.v_clausulables;
DROP VIEW IF EXISTS liga.v_resumen_liga;
DROP VIEW IF EXISTS liga.v_plantilla;
DROP VIEW IF EXISTS liga.v_mercado_actual;
DROP VIEW IF EXISTS liga.v_clausula_actual;
DROP VIEW IF EXISTS public.v_precio_actual;

ALTER TABLE precios_diarios
    ADD COLUMN IF NOT EXISTS aceleracion_estado VARCHAR(64);

CREATE OR REPLACE VIEW public.v_precio_actual AS
SELECT DISTINCT ON (jugador_id)
       jugador_id, fecha, valor, valor_anterior,
       diferencia, diferencia_pct, tendencia, aceleracion,
       aceleracion_estado
FROM public.precios_diarios
ORDER BY jugador_id, fecha DESC;

CREATE VIEW liga.v_clausula_actual AS
SELECT DISTINCT ON (ch.liga_id, ch.jugador_id)
       ch.liga_id,
       ch.jugador_id,
       ch.miembro_id,
       GREATEST(ch.valor, pa.valor) AS clausula,
       ch.fecha,
       ch.motivo
FROM liga.clausulas_historial ch
LEFT JOIN public.v_precio_actual pa ON pa.jugador_id = ch.jugador_id
ORDER BY ch.liga_id, ch.jugador_id, ch.fecha DESC, ch.id DESC;

ALTER VIEW liga.v_clausula_actual SET (security_invoker = true);
GRANT SELECT ON liga.v_clausula_actual TO authenticated;

CREATE VIEW liga.v_plantilla AS
SELECT p.liga_id, lg.nombre AS liga, p.miembro_id, m.nombre AS miembro,
       j.jugador_id, j.nombre AS jugador, j.posicion, e.nombre AS equipo,
       ca.clausula, ca.fecha AS clausula_desde,
       pa.valor AS valor_mercado, pa.tendencia, pa.aceleracion_estado,
       p.desde AS en_plantilla_desde,
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

CREATE VIEW liga.v_mercado_actual AS
SELECT lg.id AS liga_id, lg.nombre AS liga,
       j.jugador_id, j.nombre AS jugador, j.posicion, j.edad, e.nombre AS equipo,
       pa.valor AS valor_mercado, pa.diferencia, pa.diferencia_pct, pa.tendencia,
       pa.aceleracion_estado
FROM liga.ligas lg
CROSS JOIN public.jugadores j
LEFT JOIN public.equipos e ON e.equipo_id = j.equipo_id
LEFT JOIN public.v_precio_actual pa ON pa.jugador_id = j.jugador_id
WHERE NOT EXISTS (SELECT 1 FROM liga.plantillas p
                  WHERE p.jugador_id = j.jugador_id AND p.liga_id = lg.id)
ORDER BY lg.id, pa.valor DESC NULLS LAST;

CREATE VIEW liga.v_clausulables AS
SELECT p.liga_id, lg.nombre AS liga,
       p.jugador_id, j.nombre AS jugador, j.posicion, e.nombre AS equipo,
       p.miembro_id, m.nombre AS dueno,
       ca.clausula, ca.fecha AS clausula_desde,
       pa.valor AS valor_mercado
FROM liga.plantillas p
JOIN liga.ligas lg ON lg.id = p.liga_id
JOIN liga.miembros m ON m.id = p.miembro_id
JOIN public.jugadores j ON j.jugador_id = p.jugador_id
LEFT JOIN public.equipos e ON e.equipo_id = j.equipo_id
LEFT JOIN liga.v_clausula_actual ca ON ca.liga_id = p.liga_id AND ca.jugador_id = p.jugador_id
LEFT JOIN public.v_precio_actual pa ON pa.jugador_id = p.jugador_id
ORDER BY p.liga_id, ca.clausula DESC NULLS LAST;

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

GRANT SELECT ON liga.v_mercado_actual, liga.v_clausulables,
    liga.v_resumen_liga, liga.v_plantilla TO authenticated;
GRANT SELECT ON liga.v_clausula_actual TO authenticated;
GRANT SELECT ON liga.v_miembros_saldo TO authenticated, anon;

ALTER VIEW liga.v_plantilla SET (security_invoker = true);
ALTER VIEW liga.v_clausulables SET (security_invoker = true);
ALTER VIEW liga.v_resumen_liga SET (security_invoker = true);
ALTER VIEW liga.v_mercado_actual SET (security_invoker = true);

-- =DOWN
DROP VIEW IF EXISTS liga.v_miembros_saldo;
DROP VIEW IF EXISTS liga.v_clausulables;
DROP VIEW IF EXISTS liga.v_resumen_liga;
DROP VIEW IF EXISTS liga.v_plantilla;
DROP VIEW IF EXISTS liga.v_mercado_actual;
DROP VIEW IF EXISTS liga.v_clausula_actual;
DROP VIEW IF EXISTS public.v_precio_actual;

ALTER TABLE precios_diarios
    DROP COLUMN IF EXISTS aceleracion_estado;

CREATE OR REPLACE VIEW public.v_precio_actual AS
SELECT DISTINCT ON (jugador_id)
       jugador_id, fecha, valor, valor_anterior,
       diferencia, diferencia_pct, tendencia, aceleracion
FROM public.precios_diarios
ORDER BY jugador_id, fecha DESC;

CREATE VIEW liga.v_clausula_actual AS
SELECT DISTINCT ON (ch.liga_id, ch.jugador_id)
       ch.liga_id,
       ch.jugador_id,
       ch.miembro_id,
       GREATEST(ch.valor, pa.valor) AS clausula,
       ch.fecha,
       ch.motivo
FROM liga.clausulas_historial ch
LEFT JOIN public.v_precio_actual pa ON pa.jugador_id = ch.jugador_id
ORDER BY ch.liga_id, ch.jugador_id, ch.fecha DESC, ch.id DESC;

ALTER VIEW liga.v_clausula_actual SET (security_invoker = true);
GRANT SELECT ON liga.v_clausula_actual TO authenticated;

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

CREATE VIEW liga.v_mercado_actual AS
SELECT lg.id AS liga_id, lg.nombre AS liga,
       j.jugador_id, j.nombre AS jugador, j.posicion, j.edad, e.nombre AS equipo,
       pa.valor AS valor_mercado, pa.diferencia, pa.diferencia_pct, pa.tendencia
FROM liga.ligas lg
CROSS JOIN public.jugadores j
LEFT JOIN public.equipos e ON e.equipo_id = j.equipo_id
LEFT JOIN public.v_precio_actual pa ON pa.jugador_id = j.jugador_id
WHERE NOT EXISTS (SELECT 1 FROM liga.plantillas p
                  WHERE p.jugador_id = j.jugador_id AND p.liga_id = lg.id)
ORDER BY lg.id, pa.valor DESC NULLS LAST;

CREATE VIEW liga.v_clausulables AS
SELECT p.liga_id, lg.nombre AS liga,
       p.jugador_id, j.nombre AS jugador, j.posicion, e.nombre AS equipo,
       p.miembro_id, m.nombre AS dueno,
       ca.clausula, ca.fecha AS clausula_desde,
       pa.valor AS valor_mercado
FROM liga.plantillas p
JOIN liga.ligas lg ON lg.id = p.liga_id
JOIN liga.miembros m ON m.id = p.miembro_id
JOIN public.jugadores j ON j.jugador_id = p.jugador_id
LEFT JOIN public.equipos e ON e.equipo_id = j.equipo_id
LEFT JOIN liga.v_clausula_actual ca ON ca.liga_id = p.liga_id AND ca.jugador_id = p.jugador_id
LEFT JOIN public.v_precio_actual pa ON pa.jugador_id = p.jugador_id
ORDER BY p.liga_id, ca.clausula DESC NULLS LAST;

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

GRANT SELECT ON liga.v_mercado_actual, liga.v_clausulables,
    liga.v_resumen_liga, liga.v_plantilla TO authenticated;
GRANT SELECT ON liga.v_clausula_actual TO authenticated;
GRANT SELECT ON liga.v_miembros_saldo TO authenticated, anon;

ALTER VIEW liga.v_plantilla SET (security_invoker = true);
ALTER VIEW liga.v_clausulables SET (security_invoker = true);
ALTER VIEW liga.v_resumen_liga SET (security_invoker = true);
ALTER VIEW liga.v_mercado_actual SET (security_invoker = true);