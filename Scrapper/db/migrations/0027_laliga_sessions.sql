-- 0027_laliga_sessions.sql
-- Guardar sesiones de LaLiga Fantasy de cada usuario.
-- Cada usuario de Supabase puede tener una sesion de LaLiga associada.

-- =UP
CREATE TABLE IF NOT EXISTS public.laliga_sessions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    id_token TEXT,
    refresh_token TEXT,
    expires_on BIGINT,
    laliga_user_id TEXT,
    laliga_username TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: cada usuario solo puede leer/escribir su propia sesion
ALTER TABLE public.laliga_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY laliga_sessions_own ON public.laliga_sessions
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Anon no puede ver sesiones privadas
REVOKE ALL ON public.laliga_sessions FROM anon;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_laliga_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER laliga_sessions_updated_at
    BEFORE UPDATE ON public.laliga_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_laliga_sessions_updated_at();

-- =DOWN
DROP TRIGGER IF EXISTS laliga_sessions_updated_at ON public.laliga_sessions;
DROP FUNCTION IF EXISTS update_laliga_sessions_updated_at();
DROP POLICY IF EXISTS laliga_sessions_own ON public.laliga_sessions;
DROP TABLE IF EXISTS public.laliga_sessions;
