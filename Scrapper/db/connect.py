from psycopg import connect

from config import DATABASE_URL


def get_conn():
    if not DATABASE_URL:
        raise SystemExit(
            "Falta DATABASE_URL en el fichero .env. Copia la cadena de conexion "
            "de Supabase: Project Settings -> Database -> Connection string -> URI."
        )
    return connect(DATABASE_URL)
