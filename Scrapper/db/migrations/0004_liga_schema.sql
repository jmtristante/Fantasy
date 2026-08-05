-- 0004_liga_schema.sql
-- Separa los datos privados de la liga en su propio esquema "liga" (los datos
-- publicos scrapeados se mantienen en "public": jugadores, precios_diarios...).
-- Ademas, todas las tablas privadas llevan una columna "liga_id" para poder
-- manejar varias ligas independientes (amigos, familia, etc.).

-- ============================================================ UP
CREATE SCHEMA IF NOT EXISTS liga;

CREATE TABLE IF NOT EXISTS liga.ligas (
    id              BIGSERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    competicion     VARCHAR(30) NOT NULL DEFAULT 'laliga',
    temporada       VARCHAR(20),
    presupuesto     INTEGER NOT NULL DEFAULT 0,
    descripcion     TEXT,
    creado          DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS liga.miembros (
    id                  BIGSERIAL PRIMARY KEY,
    liga_id             BIGINT NOT NULL REFERENCES liga.ligas(id) ON DELETE CASCADE,
    nombre              VARCHAR(100) NOT NULL,
    email               VARCHAR(200),
    foto_url            VARCHAR(300),
    presupuesto_inicial INTEGER NOT NULL DEFAULT 0,
    fecha_alta          DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (liga_id, nombre)
);

CREATE TABLE IF NOT EXISTS liga.movimientos (
    id          BIGSERIAL PRIMARY KEY,
    liga_id     BIGINT NOT NULL REFERENCES liga.ligas(id) ON DELETE CASCADE,
    fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
    miembro_id  BIGINT NOT NULL REFERENCES liga.miembros(id) ON DELETE CASCADE,
    tipo        VARCHAR(30) NOT NULL CHECK (tipo IN
                ('compra_mercado', 'venta_mercado', 'clausula',
                 'subida_clausula', 'ajuste', 'entrada', 'salida')),
    jugador_id  INTEGER REFERENCES public.jugadores(jugador_id) ON DELETE SET NULL,
    importe     INTEGER NOT NULL,  -- positivo: entra, negativo: sale
    contraparte BIGINT REFERENCES liga.miembros(id) ON DELETE SET NULL,
    nota        TEXT
);

CREATE INDEX IF NOT EXISTS ix_movimientos_miembro ON liga.movimientos (liga_id, miembro_id, fecha);
CREATE INDEX IF NOT EXISTS ix_movimientos_jugador  ON liga.movimientos (liga_id, jugador_id);

CREATE TABLE IF NOT EXISTS liga.plantillas (
    id         BIGSERIAL PRIMARY KEY,
    liga_id    BIGINT NOT NULL REFERENCES liga.ligas(id) ON DELETE CASCADE,
    miembro_id BIGINT NOT NULL REFERENCES liga.miembros(id) ON DELETE CASCADE,
    jugador_id INTEGER NOT NULL REFERENCES public.jugadores(jugador_id) ON DELETE CASCADE,
    desde      DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (liga_id, jugador_id)  -- un jugador solo con un dueno por liga
);

CREATE INDEX IF NOT EXISTS ix_plantillas_miembro ON liga.plantillas (liga_id, miembro_id);

CREATE TABLE IF NOT EXISTS liga.clausulas_historial (
    id           BIGSERIAL PRIMARY KEY,
    liga_id      BIGINT NOT NULL REFERENCES liga.ligas(id) ON DELETE CASCADE,
    jugador_id   INTEGER NOT NULL REFERENCES public.jugadores(jugador_id) ON DELETE CASCADE,
    miembro_id   BIGINT REFERENCES liga.miembros(id) ON DELETE SET NULL,
    valor        INTEGER NOT NULL,
    fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
    motivo       VARCHAR(30) NOT NULL CHECK (motivo IN
                ('draft_inicial', 'compra_mercado', 'clausula_activada',
                 'subida_clausula', 'ajuste')),
    movimiento_id BIGINT REFERENCES liga.movimientos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_clausulas_jugador ON liga.clausulas_historial (liga_id, jugador_id, fecha);
CREATE INDEX IF NOT EXISTS ix_clausulas_miembro ON liga.clausulas_historial (liga_id, miembro_id);

CREATE TABLE IF NOT EXISTS liga.liga_alineaciones (
    id         BIGSERIAL PRIMARY KEY,
    liga_id    BIGINT NOT NULL REFERENCES liga.ligas(id) ON DELETE CASCADE,
    miembro_id BIGINT NOT NULL REFERENCES liga.miembros(id) ON DELETE CASCADE,
    jornada    INTEGER NOT NULL,
    jugador_id INTEGER NOT NULL REFERENCES public.jugadores(jugador_id) ON DELETE CASCADE,
    posicion   VARCHAR(10) NOT NULL DEFAULT 'titular'
               CHECK (posicion IN ('titular', 'suplente')),
    UNIQUE (liga_id, miembro_id, jornada, jugador_id)
);

CREATE INDEX IF NOT EXISTS ix_liga_alineaciones_miembro ON liga.liga_alineaciones (liga_id, miembro_id, jornada);

-- Ultimo precio de mercado por jugador (dato publico de precios_diarios).
CREATE OR REPLACE VIEW public.v_precio_actual AS
SELECT DISTINCT ON (jugador_id)
       jugador_id, fecha, valor, valor_anterior,
       diferencia, diferencia_pct, tendencia, aceleracion
FROM public.precios_diarios
ORDER BY jugador_id, fecha DESC;

-- Ultima clausula por jugador y liga (desde el historial).
CREATE OR REPLACE VIEW liga.v_clausula_actual AS
SELECT DISTINCT ON (liga_id, jugador_id)
       liga_id, jugador_id, miembro_id, valor AS clausula, fecha, motivo
FROM liga.clausulas_historial
ORDER BY liga_id, jugador_id, fecha DESC, id DESC;

-- Saldo de cada miembro derivado de los movimientos (por liga).
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

-- Plantilla completa: dueno, jugador, clausula actual y valor de mercado (por liga).
CREATE OR REPLACE VIEW liga.v_plantilla AS
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

-- Jugadores libres disponibles para comprar (por liga), con su ultimo precio.
CREATE OR REPLACE VIEW liga.v_mercado_actual AS
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

-- Jugadores con dueno por liga, disponibles para clausular.
CREATE OR REPLACE VIEW liga.v_clausulables AS
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

-- Historial de movimientos con nombres (por liga).
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

-- Imagen diaria de cada liga/miembro.
CREATE OR REPLACE VIEW liga.v_resumen_liga AS
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

-- Tablas antiguas (creadas en public por 0003) se eliminan; ya no hay datos.
DROP VIEW IF EXISTS public.v_resumen_liga;
DROP VIEW IF EXISTS public.v_movimientos_detalle;
DROP VIEW IF EXISTS public.v_clausulables;
DROP VIEW IF EXISTS public.v_mercado_actual;
DROP VIEW IF EXISTS public.v_plantilla;
DROP VIEW IF EXISTS public.v_miembros_saldo;
DROP VIEW IF EXISTS public.v_clausula_actual;
DROP TABLE IF EXISTS public.liga_alineaciones;
DROP TABLE IF EXISTS public.clausulas_historial;
DROP TABLE IF EXISTS public.plantillas;
DROP TABLE IF EXISTS public.movimientos;
DROP TABLE IF EXISTS public.miembros;

-- =DOWN
DROP SCHEMA IF EXISTS liga CASCADE;
DROP VIEW IF EXISTS public.v_precio_actual;

CREATE TABLE IF NOT EXISTS public.miembros (
    id BIGSERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(200), foto_url VARCHAR(300),
    presupuesto_inicial INTEGER NOT NULL DEFAULT 0,
    fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE TABLE IF NOT EXISTS public.movimientos (
    id BIGSERIAL PRIMARY KEY, fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    miembro_id BIGINT NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('compra_mercado','venta_mercado','clausula','subida_clausula','ajuste','entrada','salida')),
    jugador_id INTEGER, importe INTEGER NOT NULL,
    contraparte BIGINT REFERENCES public.miembros(id) ON DELETE SET NULL, nota TEXT
);
CREATE TABLE IF NOT EXISTS public.plantillas (
    id BIGSERIAL PRIMARY KEY, miembro_id BIGINT NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
    jugador_id INTEGER NOT NULL, desde DATE NOT NULL DEFAULT CURRENT_DATE, UNIQUE (jugador_id)
);
CREATE TABLE IF NOT EXISTS public.clausulas_historial (
    id BIGSERIAL PRIMARY KEY, jugador_id INTEGER NOT NULL, miembro_id BIGINT REFERENCES public.miembros(id) ON DELETE SET NULL,
    valor INTEGER NOT NULL, fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    motivo VARCHAR(30) NOT NULL CHECK (motivo IN ('draft_inicial','compra_mercado','clausula_activada','subida_clausula','ajuste')),
    movimiento_id BIGINT
);
CREATE TABLE IF NOT EXISTS public.liga_alineaciones (
    id BIGSERIAL PRIMARY KEY, miembro_id BIGINT NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
    jornada INTEGER NOT NULL, jugador_id INTEGER NOT NULL,
    posicion VARCHAR(10) NOT NULL DEFAULT 'titular' CHECK (posicion IN ('titular','suplente')),
    UNIQUE (miembro_id, jornada, jugador_id)
);
CREATE OR REPLACE VIEW public.v_clausula_actual AS
SELECT DISTINCT ON (jugador_id) jugador_id, miembro_id, valor AS clausula, fecha, motivo
FROM public.clausulas_historial ORDER BY jugador_id, fecha DESC, id DESC;
CREATE OR REPLACE VIEW public.v_miembros_saldo AS
SELECT m.id, m.nombre, m.presupuesto_inicial, 0 AS movimientos_total,
       m.presupuesto_inicial AS saldo, 0 AS n_jugadores
FROM public.miembros m ORDER BY saldo DESC;
CREATE OR REPLACE VIEW public.v_plantilla AS
SELECT p.miembro_id, j.jugador_id, j.nombre AS jugador, ca.clausula FROM public.plantillas p
LEFT JOIN public.clausulas_historial ca ON ca.jugador_id = p.jugador_id
LEFT JOIN public.jugadores j ON j.jugador_id = p.jugador_id;
CREATE OR REPLACE VIEW public.v_movimientos_detalle AS
SELECT mv.id, mv.fecha, mv.tipo FROM public.movimientos mv ORDER BY mv.fecha DESC;
CREATE OR REPLACE VIEW public.v_resumen_liga AS
SELECT m.id, m.presupuesto_inicial AS saldo FROM public.miembros m;