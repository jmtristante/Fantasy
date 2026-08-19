-- 0025_mapeo_jugadores.sql
-- Mapeo estable LaLiga Fantasy (player_master_id) -> futbolfantasy (jugador_id).
-- A diferencia del resto de tablas de public (solo lectura para anon, escritas
-- por el scraper con el rol postgres), esta la rellena la app LaLigaApp desde el
-- navegador (rol anon) haciendo backfill de los jugadores que falten. Por eso se
-- expone en escritura para anon. Los datos son publicos y benignos (ids de jugador).

-- =UP
CREATE TABLE IF NOT EXISTS public.mapeo_jugadores (
    player_master_id BIGINT PRIMARY KEY,
    jugador_id       BIGINT REFERENCES public.jugadores(jugador_id) ON DELETE SET NULL,
    nombre_laliga    TEXT,
    nombre_scraping  TEXT,
    equipo           TEXT,
    metodo           TEXT NOT NULL DEFAULT 'auto',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_mapeo_jugador ON public.mapeo_jugadores (jugador_id);

ALTER TABLE public.mapeo_jugadores ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mapeo_jugadores TO anon, authenticated;

CREATE POLICY mapeo_all_anon ON public.mapeo_jugadores
    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY mapeo_all_auth ON public.mapeo_jugadores
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =DOWN
DROP POLICY IF EXISTS mapeo_all_auth ON public.mapeo_jugadores;
DROP POLICY IF EXISTS mapeo_all_anon ON public.mapeo_jugadores;
ALTER TABLE public.mapeo_jugadores DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mapeo_jugadores FROM anon, authenticated;
DROP TABLE IF EXISTS public.mapeo_jugadores;
