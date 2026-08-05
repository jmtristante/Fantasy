-- 0003_liga_privada.sql
-- Liga privada de amigos (datos manuales, insertados desde la consola de Supabase).
-- Reglas:
--   * Al comprar un jugador del mercado, su clausula = precio de compra.
--   * El propietario puede subir la clausula invirtiendo dinero (la clausula
--     sube 2x lo invertido). El dinero invertido queda en movimientos.
--   * En el draft inicial la clausula se fija a mano (valor aumentado).
--   * El dinero de cada miembro se deriva de movimientos:
--     saldo = presupuesto_inicial + SUM(movimientos.importe).
-- La seccion "-- =DOWN" revierte el cambio (rollback).

CREATE TABLE IF NOT EXISTS miembros (
    id                  BIGSERIAL PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL UNIQUE,
    email               VARCHAR(200),
    foto_url            VARCHAR(300),
    presupuesto_inicial INTEGER NOT NULL DEFAULT 0,
    fecha_alta          DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS movimientos (
    id          BIGSERIAL PRIMARY KEY,
    fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
    miembro_id  BIGINT NOT NULL REFERENCES miembros(id) ON DELETE CASCADE,
    tipo        VARCHAR(30) NOT NULL CHECK (tipo IN
                ('compra_mercado', 'venta_mercado', 'clausula',
                 'subida_clausula', 'ajuste', 'entrada', 'salida')),
    jugador_id  INTEGER REFERENCES jugadores(jugador_id) ON DELETE SET NULL,
    importe     INTEGER NOT NULL,  -- positivo: dinero que entra, negativo: sale
    contraparte BIGINT REFERENCES miembros(id) ON DELETE SET NULL,
    nota        TEXT
);

CREATE INDEX IF NOT EXISTS ix_movimientos_miembro ON movimientos (miembro_id, fecha);
CREATE INDEX IF NOT EXISTS ix_movimientos_jugador ON movimientos (jugador_id);

CREATE TABLE IF NOT EXISTS plantillas (
    id         BIGSERIAL PRIMARY KEY,
    miembro_id BIGINT NOT NULL REFERENCES miembros(id) ON DELETE CASCADE,
    jugador_id INTEGER NOT NULL REFERENCES jugadores(jugador_id) ON DELETE CASCADE,
    desde      DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (jugador_id)  -- un jugador solo puede tener un dueno
);

CREATE INDEX IF NOT EXISTS ix_plantillas_miembro ON plantillas (miembro_id);

CREATE TABLE IF NOT EXISTS clausulas_historial (
    id           BIGSERIAL PRIMARY KEY,
    jugador_id   INTEGER NOT NULL REFERENCES jugadores(jugador_id) ON DELETE CASCADE,
    miembro_id   BIGINT REFERENCES miembros(id) ON DELETE SET NULL,
    valor        INTEGER NOT NULL,
    fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
    motivo       VARCHAR(30) NOT NULL CHECK (motivo IN
                ('draft_inicial', 'compra_mercado', 'clausula_activada',
                 'subida_clausula', 'ajuste')),
    movimiento_id BIGINT REFERENCES movimientos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_clausulas_jugador ON clausulas_historial (jugador_id, fecha);
CREATE INDEX IF NOT EXISTS ix_clausulas_miembro ON clausulas_historial (miembro_id);

CREATE TABLE IF NOT EXISTS liga_alineaciones (
    id         BIGSERIAL PRIMARY KEY,
    miembro_id BIGINT NOT NULL REFERENCES miembros(id) ON DELETE CASCADE,
    jornada    INTEGER NOT NULL,
    jugador_id INTEGER NOT NULL REFERENCES jugadores(jugador_id) ON DELETE CASCADE,
    posicion   VARCHAR(10) NOT NULL DEFAULT 'titular'
               CHECK (posicion IN ('titular', 'suplente')),
    UNIQUE (miembro_id, jornada, jugador_id)
);

CREATE INDEX IF NOT EXISTS ix_liga_alineaciones_miembro ON liga_alineaciones (miembro_id, jornada);

-- Ultimo precio de mercado por jugador (desde precios_diarios).
CREATE OR REPLACE VIEW v_precio_actual AS
SELECT DISTINCT ON (jugador_id)
       jugador_id, fecha, valor, valor_anterior,
       diferencia, diferencia_pct, tendencia, aceleracion
FROM precios_diarios
ORDER BY jugador_id, fecha DESC;

-- Ultima clausula por jugador (desde el historial).
CREATE OR REPLACE VIEW v_clausula_actual AS
SELECT DISTINCT ON (jugador_id)
       jugador_id, miembro_id, valor AS clausula, fecha, motivo
FROM clausulas_historial
ORDER BY jugador_id, fecha DESC, id DESC;

-- Saldo de cada miembro derivado de los movimientos.
CREATE OR REPLACE VIEW v_miembros_saldo AS
SELECT m.id, m.nombre, m.email, m.foto_url, m.presupuesto_inicial,
       COALESCE(mv.mov_total, 0)   AS movimientos_total,
       m.presupuesto_inicial
         + COALESCE(mv.mov_total, 0) AS saldo,
       COALESCE(pl.n_jugadores, 0) AS n_jugadores
FROM miembros m
LEFT JOIN (SELECT miembro_id, SUM(importe) AS mov_total
           FROM movimientos GROUP BY miembro_id) mv ON mv.miembro_id = m.id
LEFT JOIN (SELECT miembro_id, COUNT(*) AS n_jugadores
           FROM plantillas GROUP BY miembro_id) pl ON pl.miembro_id = m.id
ORDER BY saldo DESC, m.nombre;

-- Plantilla completa: dueno, jugador, clausula actual y valor de mercado.
CREATE OR REPLACE VIEW v_plantilla AS
SELECT p.miembro_id, m.nombre AS miembro,
       j.jugador_id, j.nombre AS jugador, j.posicion, e.nombre AS equipo,
       ca.clausula, ca.fecha AS clausula_desde,
       pa.valor AS valor_mercado,
       p.desde AS en_plantilla_desde
FROM plantillas p
JOIN miembros m ON m.id = p.miembro_id
JOIN jugadores j ON j.jugador_id = p.jugador_id
LEFT JOIN equipos e ON e.equipo_id = j.equipo_id
LEFT JOIN v_clausula_actual ca ON ca.jugador_id = p.jugador_id
LEFT JOIN v_precio_actual pa ON pa.jugador_id = p.jugador_id
ORDER BY m.nombre, j.nombre;

-- Jugadores sin dueno disponibles para comprar (con su ultimo precio).
CREATE OR REPLACE VIEW v_mercado_actual AS
SELECT j.jugador_id, j.nombre AS jugador, j.posicion, j.edad, e.nombre AS equipo,
       pa.valor AS valor_mercado, pa.diferencia, pa.diferencia_pct, pa.tendencia
FROM jugadores j
LEFT JOIN equipos e ON e.equipo_id = j.equipo_id
LEFT JOIN v_precio_actual pa ON pa.jugador_id = j.jugador_id
WHERE NOT EXISTS (SELECT 1 FROM plantillas p WHERE p.jugador_id = j.jugador_id)
ORDER BY pa.valor DESC NULLS LAST;

-- Jugadores con dueno disponibles para clausular (con su clausula actual).
CREATE OR REPLACE VIEW v_clausulables AS
SELECT p.jugador_id, j.nombre AS jugador, j.posicion, e.nombre AS equipo,
       p.miembro_id, m.nombre AS dueno,
       ca.clausula, ca.fecha AS clausula_desde,
       pa.valor AS valor_mercado
FROM plantillas p
JOIN miembros m ON m.id = p.miembro_id
JOIN jugadores j ON j.jugador_id = p.jugador_id
LEFT JOIN equipos e ON e.equipo_id = j.equipo_id
LEFT JOIN v_clausula_actual ca ON ca.jugador_id = p.jugador_id
LEFT JOIN v_precio_actual pa ON pa.jugador_id = p.jugador_id
ORDER BY ca.clausula DESC NULLS LAST;

-- Historial de movimientos con nombres.
CREATE OR REPLACE VIEW v_movimientos_detalle AS
SELECT mv.id, mv.fecha, mv.tipo,
       m.nombre AS miembro,
       cp.nombre AS contraparte,
       j.nombre AS jugador,
       mv.importe, mv.nota
FROM movimientos mv
JOIN miembros m ON m.id = mv.miembro_id
LEFT JOIN miembros cp ON cp.id = mv.contraparte
LEFT JOIN jugadores j ON j.jugador_id = mv.jugador_id
ORDER BY mv.fecha DESC, mv.id DESC;

-- Imagen diaria de la liga por miembro.
CREATE OR REPLACE VIEW v_resumen_liga AS
SELECT m.id, m.nombre,
       m.presupuesto_inicial + COALESCE(mv.mov_total, 0) AS saldo,
       COALESCE(pl.n_jugadores, 0)        AS n_jugadores,
       COALESCE(plv.suma_clausula, 0)     AS valor_clausula_plantilla,
       COALESCE(plv.suma_mercado, 0)      AS valor_mercado_plantilla,
       COALESCE(mv.gastado, 0)            AS gastado_total,
       COALESCE(mv.ganado, 0)             AS ganado_total
FROM miembros m
LEFT JOIN (SELECT miembro_id, SUM(importe) AS mov_total,
                  SUM(CASE WHEN importe < 0 THEN importe ELSE 0 END) AS gastado,
                  SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END) AS ganado
           FROM movimientos GROUP BY miembro_id) mv ON mv.miembro_id = m.id
LEFT JOIN (SELECT miembro_id, COUNT(*) AS n_jugadores
           FROM plantillas GROUP BY miembro_id) pl ON pl.miembro_id = m.id
LEFT JOIN (SELECT p.miembro_id,
                  SUM(ca.clausula) AS suma_clausula,
                  SUM(pa.valor)    AS suma_mercado
           FROM plantillas p
           LEFT JOIN v_clausula_actual ca ON ca.jugador_id = p.jugador_id
           LEFT JOIN v_precio_actual pa ON pa.jugador_id = p.jugador_id
           GROUP BY p.miembro_id) plv ON plv.miembro_id = m.id
ORDER BY saldo DESC, m.nombre;

-- =DOWN
DROP VIEW IF EXISTS v_resumen_liga;
DROP VIEW IF EXISTS v_movimientos_detalle;
DROP VIEW IF EXISTS v_clausulables;
DROP VIEW IF EXISTS v_mercado_actual;
DROP VIEW IF EXISTS v_plantilla;
DROP VIEW IF EXISTS v_miembros_saldo;
DROP VIEW IF EXISTS v_clausula_actual;
DROP VIEW IF EXISTS v_precio_actual;
DROP TABLE IF EXISTS liga_alineaciones;
DROP TABLE IF EXISTS clausulas_historial;
DROP TABLE IF EXISTS plantillas;
DROP TABLE IF EXISTS movimientos;
DROP TABLE IF EXISTS miembros;
