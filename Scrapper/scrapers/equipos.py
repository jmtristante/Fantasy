import time

from config import BASE_URL, COMPETICION, REQUEST_SLEEP, SEASON_YEAR
from scrapers.http import fetch_cached, to_int, to_pct, to_soup

JUEGOS = [
    "laliga-fantasy",
    "comunio",
    "biwenger",
    "biwenger-fantasy",
    "futmondo",
    "futmondo-social",
    "fantasy-marca",
    "mister",
]

JERARQUIAS = {"60": "Dios", "50": "Clave", "40": "Importante", "30": "Rotacion"}

LESIONES = {"2": "lesionado", "1": "duda", "-1": "ok"}


def _jugador_id_from_class(classes):
    for cls in classes:
        if cls.startswith("jugador_"):
            return to_int(cls.split("_")[1])
    return None


def _data_positions(div):
    posiciones = {}
    for key, value in div.attrs.items():
        if key.lower().startswith("data-posicion") and value:
            posiciones[key[len("data-"):]] = value
    return posiciones or None


def _parse_jugador_lista(div):
    attrs = div.attrs
    jugador_id = _jugador_id_from_class(div.get("class", []))
    if not jugador_id:
        return None
    nombre_el = div.select_one("span.nombre")
    foto_img = div.select_one("div.datos-imagen img")
    foto_url = ""
    if foto_img:
        foto_url = foto_img.get("data-src") or foto_img.get("src") or ""
    return {
        "jugador_id": jugador_id,
        "slug": attrs.get("data-nombre", ""),
        "nombre": nombre_el.get_text(strip=True) if nombre_el else None,
        "posicion": attrs.get("data-posicion"),
        "probabilidad": to_pct(attrs.get("data-probabilidad")),
        "edad": to_int(attrs.get("data-edad")),
        "nacionalidad": attrs.get("data-nacionalidad"),
        "pie": attrs.get("data-pie"),
        "altura": to_int(attrs.get("data-altura")),
        "foto_url": ("https:" + foto_url if foto_url.startswith("//") else foto_url),
        "jerarquia": JERARQUIAS.get(attrs.get("data-jerarquia") or ""),
        "lesion": LESIONES.get(attrs.get("data-lesion") or ""),
        "estado": attrs.get("data-estado"),
        "valores": {
            juego: {
                "valor": to_int(attrs.get(f"data-valor-{juego}")),
                "diferencia": to_int(attrs.get(f"data-valor-diff-{juego}")),
            }
            for juego in JUEGOS
        },
    }


def _parse_alineaciones(soup, partido_id, jornada):
    if not partido_id:
        return []
    resultados = []
    for selector, once in (
        (f".jugadores-titulares-{partido_id}", "titular"),
        (f".jugadores-suplentes-{partido_id}", "suplente"),
    ):
        contenedor = soup.select_one(selector)
        if not contenedor:
            continue
        for div in contenedor.select("div[class*='camiseta-wrapper']"):
            jugador_id = _jugador_id_from_class(div.get("class", []))
            if not jugador_id:
                continue
            camiseta = div.select_one("a.camiseta")
            probabilidad = to_pct(camiseta.get("data-probabilidad")) if camiseta else None
            resultados.append(
                {
                    "anio": SEASON_YEAR,
                    "jornada": jornada,
                    "partido_id": partido_id,
                    "jugador_id": jugador_id,
                    "once": once,
                    "probabilidad": probabilidad,
                }
            )
    return resultados


def scrape_team(slug, refresh=False):
    url = f"{BASE_URL}/{COMPETICION}/equipos/{slug}"
    html = fetch_cached(
        url,
        f"equipo_{slug}_{SEASON_YEAR}.html",
        refresh=refresh,
        delay=False,
    )
    soup = to_soup(html)

    wrapper = soup.select_one("section.mod.alineacion_wrapper[data-equipo]")
    if not wrapper:
        return None, [], []
    equipo_id = to_int(wrapper.get("data-equipo"))
    partido_prox = to_int(wrapper.get("data-prox"))

    nombre_el = soup.select_one("header.headerequipo span.nombre")
    nombre = nombre_el.get_text(strip=True) if nombre_el else slug

    escudo_el = soup.select_one("header.headerequipo img.escudo")
    escudo_url = ""
    if escudo_el:
        escudo_url = escudo_el.get("data-src") or escudo_el.get("src") or ""

    posiciones_por_jugador = {}
    for div in soup.select("div[class*='camiseta-wrapper']"):
        jugador_id = _jugador_id_from_class(div.get("class", []))
        posiciones = _data_positions(div)
        if jugador_id and posiciones:
            posiciones_por_jugador[jugador_id] = posiciones

    opcion = soup.select_one("select.past-alineaciones option")
    jornada = to_int(opcion.get("data-jornada")) if opcion else None

    jugadores = []
    for div in soup.select("div.jugador.tipo_lista"):
        jugador = _parse_jugador_lista(div)
        if not jugador:
            continue
        jugador["equipo_id"] = equipo_id
        posiciones = posiciones_por_jugador.get(jugador["jugador_id"])
        jugador["posiciones_juego"] = posiciones
        if not jugador["posicion"] and posiciones and posiciones.get("posicion"):
            jugador["posicion"] = posiciones["posicion"]
        jugadores.append(jugador)

    alineaciones = _parse_alineaciones(soup, partido_prox, jornada)

    equipo = {
        "equipo_id": equipo_id,
        "nombre": nombre,
        "slug": slug,
        "escudo_url": ("https:" + escudo_url if escudo_url.startswith("//") else escudo_url),
    }
    return equipo, jugadores, alineaciones


def scrape_all(equipos, refresh=False):
    resultados = []
    for i, equipo in enumerate(equipos):
        info, jugadores, alineaciones = scrape_team(equipo["slug"], refresh=refresh)
        if info:
            resultados.append({"equipo": info, "jugadores": jugadores, "alineaciones": alineaciones})
        if i < len(equipos) - 1 and REQUEST_SLEEP:
            time.sleep(REQUEST_SLEEP)
    return resultados
