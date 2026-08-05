import re

from config import BASE_URL, COMPETICION, SEASON_LABEL, SEASON_YEAR
from scrapers.http import equipo_id_from_img, fetch_cached, to_int, to_soup

ZONAS = {"champions", "uefa", "conference", "descenso"}

CLASIFICACION_URL = f"{BASE_URL}/{COMPETICION}/clasificacion/{SEASON_YEAR}"


def _nombre_from_a(a):
    strong = a.select_one("strong")
    return strong.get_text(" ", strip=True) if strong else a.get_text(" ", strip=True)


def _parse_stats(tr):
    tds = tr.find_all("td")
    if len(tds) < 8:
        return None

    def value(index):
        return to_int(tds[index].get_text(strip=True))

    return {
        "puntos": value(0),
        "pj": value(1),
        "g": value(2),
        "e": value(3),
        "p": value(4),
        "gf": value(5),
        "gc": value(6),
        "dg": value(7),
    }


def _rows(soup, selector):
    return soup.select(f"{selector} tbody tr.team") or soup.select(f"{selector} tr.team")


def scrape(refresh=False):
    html = fetch_cached(
        CLASIFICACION_URL,
        f"clasificacion_{COMPETICION}_{SEASON_YEAR}.html",
        refresh=refresh,
    )
    soup = to_soup(html)

    nombres = _rows(soup, "div.clasi-nombre table")
    totales = _rows(soup, "div.clasi.total table")
    casas = _rows(soup, "div.clasi.en-casa table")
    fueras = _rows(soup, "div.clasi.fuera table")
    if not nombres:
        return [], []

    equipos = []
    clasificacion = []
    for i, tr in enumerate(nombres):
        a = tr.select_one("td.nombre a")
        if not a:
            continue
        img = tr.select_one("td.nombre img")
        equipo_id = equipo_id_from_img(img)
        if not equipo_id:
            continue
        slug = a["href"].rstrip("/").rsplit("/", 1)[-1]
        nombre = _nombre_from_a(a)
        escudo_url = img.get("data-src") or img.get("src") or ""
        posicion = to_int(tr.select_one("td.nombre span.posicion").get_text(strip=True))
        clases = set(tr.get("class", []))
        zona = next((z for z in ZONAS if z in clases), "")

        equipos.append(
            {
                "equipo_id": equipo_id,
                "nombre": nombre,
                "slug": slug,
                "escudo_url": ("https:" + escudo_url if escudo_url.startswith("//") else escudo_url),
            }
        )

        total = _parse_stats(totales[i]) if i < len(totales) else None
        casa = _parse_stats(casas[i]) if i < len(casas) else None
        fuera = _parse_stats(fueras[i]) if i < len(fueras) else None

        row = {
            "anio": SEASON_YEAR,
            "temporada": SEASON_LABEL,
            "jornada": 0,
            "equipo_id": equipo_id,
            "posicion": posicion,
            "zona": zona,
        }
        if total:
            row.update({f"total_{k}": v for k, v in total.items()})
        if casa:
            row.update({f"casa_{k}": v for k, v in casa.items()})
        if fuera:
            row.update({f"fuera_{k}": v for k, v in fuera.items()})
        clasificacion.append(row)

    return equipos, clasificacion
