-- 0009_movimientos_fecha_hora.sql
-- Los movimientos ahora guardan fecha y hora (TIMESTAMP), en lugar de solo
-- fecha (DATE). La app rellena el valor por defecto con la hora actual de
-- España (Europe/Madrid).

-- =UP
DROP VIEW IF EXISTS liga.v_movimientos_detalle;

ALTER TABLE liga.movimientos
    ALTER COLUMN fecha TYPE TIMESTAMP
    USING fecha::TIMESTAMP;

ALTER TABLE liga.movimientos
    ALTER COLUMN fecha SET DEFAULT now();

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

-- =DOWN
DROP VIEW IF EXISTS liga.v_movimientos_detalle;

ALTER TABLE liga.movimientos
    ALTER COLUMN fecha TYPE DATE
    USING fecha::DATE;

ALTER TABLE liga.movimientos
    ALTER COLUMN fecha SET DEFAULT CURRENT_DATE;

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