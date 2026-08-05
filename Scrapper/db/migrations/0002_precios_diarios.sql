-- 0002_precios_diarios.sql
-- Precio diario oficial (laliga-fantasy): una fila por jugador y dia.
-- Sustituye a la tabla precios (multi-juego con fecha con microsegundos).
-- La seccion final de este fichero revierte el cambio (rollback).

CREATE TABLE IF NOT EXISTS precios_diarios (
    fecha          DATE NOT NULL,
    valor          INTEGER NOT NULL,
    valor_anterior INTEGER,
    diferencia     INTEGER,
    diferencia_pct DOUBLE PRECISION,
    tendencia      INTEGER,
    aceleracion    INTEGER,
    jugador_id     INTEGER REFERENCES jugadores(jugador_id) ON DELETE SET NULL,
    PRIMARY KEY (jugador_id, fecha)
);

CREATE INDEX IF NOT EXISTS ix_precios_diarios_fecha ON precios_diarios (fecha);

DROP TABLE IF EXISTS precios;
DROP INDEX IF EXISTS ix_precios_fecha;

-- =DOWN
CREATE TABLE IF NOT EXISTS precios (
    fecha          TIMESTAMPTZ NOT NULL,
    juego          VARCHAR(40) NOT NULL,
    valor          INTEGER NOT NULL,
    valor_anterior INTEGER,
    diferencia     INTEGER,
    diferencia_pct DOUBLE PRECISION,
    tendencia      INTEGER,
    aceleracion    INTEGER,
    jugador_id     INTEGER REFERENCES jugadores(jugador_id) ON DELETE SET NULL,
    PRIMARY KEY (jugador_id, fecha, juego)
);

CREATE INDEX IF NOT EXISTS ix_precios_fecha ON precios (fecha);
DROP TABLE IF EXISTS precios_diarios;
DROP INDEX IF EXISTS ix_precios_diarios_fecha;
