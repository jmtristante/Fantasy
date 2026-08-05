-- 0001_initial.sql
-- Esquema relacional de FutbolFantasy para Supabase/Postgres.
-- La seccion "-- =DOWN" se usa para rollback (python main.py rollback).

CREATE TABLE IF NOT EXISTS temporadas (
    anio_inicio INTEGER PRIMARY KEY,
    anio_fin    INTEGER NOT NULL,
    nombre      VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS equipos (
    equipo_id   INTEGER PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL,
    competicion VARCHAR(30) NOT NULL DEFAULT 'laliga',
    escudo_url  VARCHAR(300),
    temporada   VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS jugadores (
    jugador_id       INTEGER PRIMARY KEY,
    nombre           VARCHAR(150) NOT NULL,
    slug             VARCHAR(150),
    posicion         VARCHAR(50),
    posiciones_juego JSONB,
    edad             INTEGER,
    nacionalidad     VARCHAR(10),
    pie              VARCHAR(30),
    altura           INTEGER,
    foto_url         VARCHAR(300),
    jerarquia        VARCHAR(50),
    lesion           VARCHAR(30),
    estado           VARCHAR(30),
    probabilidad     INTEGER,
    equipo_id        INTEGER REFERENCES equipos(equipo_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_jugadores_equipo ON jugadores (equipo_id);

CREATE TABLE IF NOT EXISTS jornadas (
    id          BIGSERIAL PRIMARY KEY,
    temporada   VARCHAR(20) NOT NULL,
    numero      INTEGER NOT NULL,
    anio_inicio INTEGER REFERENCES temporadas(anio_inicio) ON DELETE SET NULL,
    UNIQUE (temporada, numero)
);

CREATE TABLE IF NOT EXISTS partidos (
    partido_id        INTEGER PRIMARY KEY,
    jornada_id        BIGINT REFERENCES jornadas(id) ON DELETE SET NULL,
    fecha             TIMESTAMPTZ,
    canal             VARCHAR(100),
    resultado_local   INTEGER,
    resultado_visitante INTEGER,
    local_id          INTEGER REFERENCES equipos(equipo_id) ON DELETE SET NULL,
    visitante_id      INTEGER REFERENCES equipos(equipo_id) ON DELETE SET NULL
);

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

CREATE TABLE IF NOT EXISTS clasificacion (
    temporada    VARCHAR(20) NOT NULL,
    jornada      INTEGER NOT NULL,
    posicion     INTEGER NOT NULL,
    zona         VARCHAR(30),
    total_puntos INTEGER, total_pj INTEGER, total_g INTEGER, total_e INTEGER,
    total_p INTEGER, total_gf INTEGER, total_gc INTEGER, total_dg INTEGER,
    casa_puntos INTEGER, casa_pj INTEGER, casa_g INTEGER, casa_e INTEGER,
    casa_p INTEGER, casa_gf INTEGER, casa_gc INTEGER, casa_dg INTEGER,
    fuera_puntos INTEGER, fuera_pj INTEGER, fuera_g INTEGER, fuera_e INTEGER,
    fuera_p INTEGER, fuera_gf INTEGER, fuera_gc INTEGER, fuera_dg INTEGER,
    equipo_id    INTEGER REFERENCES equipos(equipo_id) ON DELETE SET NULL,
    PRIMARY KEY (temporada, jornada, equipo_id)
);

CREATE TABLE IF NOT EXISTS alineaciones (
    jornada       INTEGER,
    once          VARCHAR(20) NOT NULL,
    probabilidad  INTEGER,
    partido_id    INTEGER REFERENCES partidos(partido_id) ON DELETE SET NULL,
    jugador_id    INTEGER REFERENCES jugadores(jugador_id) ON DELETE SET NULL,
    PRIMARY KEY (partido_id, jugador_id)
);

-- =DOWN
DROP TABLE IF EXISTS alineaciones;
DROP TABLE IF EXISTS clasificacion;
DROP TABLE IF EXISTS precios;
DROP TABLE IF EXISTS partidos;
DROP TABLE IF EXISTS jornadas;
DROP TABLE IF EXISTS jugadores;
DROP TABLE IF EXISTS equipos;
DROP TABLE IF EXISTS temporadas;
