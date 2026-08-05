import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

BASE_URL = os.getenv("FF_BASE_URL", "https://www.futbolfantasy.com")
COMPETICION = os.getenv("FF_COMPETICION", "laliga")
SEASON_YEAR = int(os.getenv("FF_SEASON_YEAR", "2027"))
SEASON_LABEL = f"{SEASON_YEAR - 1}/{str(SEASON_YEAR)[2:]}"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept-Language": "es-ES,es;q=0.9",
}

CACHE_DIR = os.getenv("FF_CACHE_DIR", os.path.join(os.path.dirname(__file__), "cache"))
REQUEST_SLEEP = float(os.getenv("FF_REQUEST_SLEEP", "0.4"))

# Supabase / Postgres. DATABASE_URL = cadena de conexion de Supabase
# (Project Settings -> Database -> Connection string -> URI). Ej:
# postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
DATABASE_URL = os.getenv("DATABASE_URL", "")
