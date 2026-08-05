from datetime import datetime, timezone

from config import BASE_URL, COMPETICION, SEASON_YEAR
from scrapers.http import fetch_cached, to_float, to_int, to_soup

INTERVALOS = [1, 2, 3, 7, 14, 30]
JUEGO = "laliga-fantasy"

MARKET_URL = f"{BASE_URL}/analytics/{COMPETICION}-fantasy/mercado"


def scrape(teams=None, refresh=False):
    html = fetch_cached(MARKET_URL, f"mercado_{COMPETICION}_{SEASON_YEAR}.html", refresh=refresh)
    soup = to_soup(html)
    hoy = datetime.now(timezone.utc)

    precios = []
    for tr in soup.select("tr.elemento_jugador"):
        attrs = tr.attrs
        jugador_id = to_int(attrs.get("data-id"))
        if not jugador_id:
            continue
        valor = to_int(attrs.get("data-valor"))
        if valor is None:
            continue
        equipo_span = tr.select_one(".player-equipo span")
        equipo_nombre = equipo_span.get_text(strip=True) if equipo_span else None
        precios.append(
            {
                "jugador_id": jugador_id,
                "jugador_nombre": attrs.get("data-nombre", ""),
                "equipo_id": to_int(attrs.get("data-equipo")),
                "equipo_nombre": equipo_nombre,
                "posicion": attrs.get("data-posicion", ""),
                "fecha": hoy,
                "juego": JUEGO,
                "valor": valor,
                "valor_anterior": to_int(attrs.get("data-valor1")),
                "diferencia": to_int(attrs.get("data-diferencia1")),
                "diferencia_pct": to_float(attrs.get("data-diferencia-pct1")),
                "tendencia": to_int(attrs.get("data-tendencia")),
                "aceleracion": to_int(attrs.get("data-aceleracion")),
            }
        )
    return precios
