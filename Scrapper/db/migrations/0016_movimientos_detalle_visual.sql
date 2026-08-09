-- 0016_movimientos_detalle_visual.sql
-- Amplia liga.v_movimientos_detalle con los ids necesarios para editar cada
-- movimiento y con las fotos para mostrarlo de forma visual:
--   * miembro_id / contraparte_id / jugador_id (ids crudos)
--   * miembro_foto / contraparte_foto (foto_url del miembro)
--   * jugador_foto (foto del jugador) y judicial escudo (equipo)
-- Se re-aplica security_invoker porque CREATE OR REPLACE VIEW puede perderlo.

-- =UP
DROP VIEW IF EXISTS liga.v_movimientos_detalle;

CREATE VIEW liga.v_movimientos_detalle AS
SELECT mv.id, mv.liga_id, lg.nombre AS liga, mv.fecha, mv.tipo,
       mv.miembro_id,
       m.nombre AS miembro, m.foto_url AS miembro_foto,
       mv.contraparte AS contraparte_id,
       cp.nombre AS contraparte, cp.foto_url AS contraparte_foto,
       mv.jugador_id,
       j.nombre AS jugador, j.foto_url AS jugador_foto,
       e.escudo_url AS jugador_escudo,
       mv.importe, mv.nota
FROM liga.movimientos mv
JOIN liga.ligas lg ON lg.id = mv.liga_id
JOIN liga.miembros m ON m.id = mv.miembro_id
LEFT JOIN liga.miembros cp ON cp.id = mv.contraparte
LEFT JOIN public.jugadores j ON j.jugador_id = mv.jugador_id
LEFT JOIN public.equipos e ON e.equipo_id = j.equipo_id
ORDER BY mv.liga_id, mv.fecha DESC, mv.id DESC;

ALTER VIEW liga.v_movimientos_detalle SET (security_invoker = true);
GRANT SELECT ON liga.v_movimientos_detalle TO authenticated, anon;

-- =DOWN
CREATE OR REPLACE VIEW liga.v_movimientos_detalle AS
SELECT mv.id, mv.liga_id, lg.nombre AS liga, mv.fecha, mv.tipo,
       m.nombre AS miembro, cp.nombre AS contraparte,
       j.nombre AS jugador, mv.importe, mv.nota
FROM liga.movimientos mv
JOIN liga.ligas lg ON lg.id = mv.liga_id
JOIN liga.miembros m ON m.id = mv.miembro_id
LEFT JOIN liga.miembros cp ON cp.id = mv.contraparte
LEFT JOIN public.jugadores j ON j.jugador_id = mv.jugador_id
ORDER BY mv.liga_id, mv.fecha DESC, mv.id DESC;

ALTER VIEW liga.v_movimientos_detalle SET (security_invoker = true);
GRANT SELECT ON liga.v_movimientos_detalle TO authenticated, anon;