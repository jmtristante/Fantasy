import datetime
import re

from config import BASE_URL, COMPETICION, SEASON_LABEL, SEASON_YEAR
from scrapers.http import equipo_id_from_img, fetch_cached, to_int, to_soup

CALENDARIO_URL = f"{BASE_URL}/{COMPETICION}/calendario"

NUM_JORNADAS = 38


def _parse_fecha(texto):
    if not texto:
        return None
    match = re.search(r"(\d{2})/(\d{2})(?:\s+(\d{1,2}):(\d{2}))?", texto)
    if not match:
        return None
    day, month = int(match.group(1)), int(match.group(2))
    hour = int(match.group(3) or 0)
    minute = int(match.group(4) or 0)
    year = SEASON_YEAR - 1 if month >= 8 else SEASON_YEAR
    return datetime.datetime(year, month, day, hour, minute)


def _to_iso(dt):
    if not dt:
        return None
    return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def _parse_partido(a, jornada):
    href = a.get("href", "")
    match = re.search(r"/partidos/(\d+)-", href)
    if not match:
        return None
    local_img = a.select_one("div.equipo.local img")
    visit_img = a.select_one("div.equipo.visitante img")
    fecha_el = a.select_one("div.info div.date")
    fecha_texto = fecha_el.get_text(" ", strip=True) if fecha_el else ""
    fecha_dt = _parse_fecha(fecha_texto)
    return {
        "partido_id": int(match.group(1)),
        "jornada": jornada,
        "fecha": _to_iso(fecha_dt),
        "fecha_texto": fecha_texto,
        "local_id": equipo_id_from_img(local_img),
        "local_nombre": local_img.get("alt") if local_img else None,
        "visitante_id": equipo_id_from_img(visit_img),
        "visitante_nombre": visit_img.get("alt") if visit_img else None,
        "canal": None,
        "resultado_local": None,
        "resultado_visitante": None,
    }


def _merge_canales(soup, partidos):
    por_id = {p["partido_id"]: p for p in partidos}
    for a in soup.select("section.mod.proxjornada .jornada a.partido"):
        match = re.search(r"/partidos/(\d+)-", a.get("href", ""))
        if not match:
            continue
        canal_img = a.select_one("div.canales img.canal")
        if not canal_img:
            continue
        partido = por_id.get(int(match.group(1)))
        if partido and not partido["canal"]:
            partido["canal"] = canal_img.get("alt")
        score = a.select_one("div.score")
        if score and partido:
            partido["resultado_local"] = to_int(score.select_one(".score-local").get_text(strip=True))
            partido["resultado_visitante"] = to_int(score.select_one(".score-visitante").get_text(strip=True))


def scrape(refresh=False):
    html = fetch_cached(
        CALENDARIO_URL,
        f"calendario_{COMPETICION}_{SEASON_YEAR}.html",
        refresh=refresh,
    )
    soup = to_soup(html)
    section = soup.select_one("section.mod.lista.partidos")

    partidos = []
    jornada_actual = None
    if section:
        for el in section.children:
            if not getattr(el, "name", None):
                continue
            if el.name == "h3":
                match = re.search(r"Jornada\s+(\d+)", el.get_text())
                jornada_actual = int(match.group(1)) if match else None
            elif el.name == "div" and jornada_actual:
                a = el.select_one("a.partido")
                if a is not None:
                    partido = _parse_partido(a, jornada_actual)
                    if partido:
                        partidos.append(partido)

    _merge_canales(soup, partidos)

    jornadas = [
        {
            "anio": SEASON_YEAR,
            "numero": n,
            "temporada": SEASON_LABEL,
        }
        for n in range(1, NUM_JORNADAS + 1)
    ]
    return jornadas, partidos
