"""Upserts SQL directos contra Supabase/Postgres (INSERT ... ON CONFLICT)."""

from datetime import datetime
from zoneinfo import ZoneInfo

from psycopg.types.json import Jsonb

STAT_COLS = [
    f"{ambito}_{campo}"
    for ambito in ("total", "casa", "fuera")
    for campo in ("puntos", "pj", "g", "e", "p", "gf", "gc", "dg")
]

MADRID = ZoneInfo("Europe/Madrid")


def _parse_dt(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _madrid_naive(value) -> datetime | None:
    """Convierte una fecha a hora local de Madrid sin zona horaria (naive).

    La columna precios_diarios.fecha es TIMESTAMP sin zona; la app muestra las
    fechas con new Date(s), que interpreta como hora local, así que guardamos
    la hora española para que coincida con lo que scrapeamos.
    """
    if isinstance(value, str):
        value = _parse_dt(value)
    if not isinstance(value, datetime):
        return None
    if value.tzinfo is not None:
        value = value.astimezone(MADRID)
    else:
        value = value.replace(tzinfo=MADRID)
    return value.replace(tzinfo=None)


def sync_temporada(cur, temporada):
    cur.execute(
        """
        INSERT INTO temporadas (anio_inicio, anio_fin, nombre)
        VALUES (%s, %s, %s)
        ON CONFLICT (anio_inicio) DO UPDATE SET
          anio_fin = EXCLUDED.anio_fin,
          nombre = EXCLUDED.nombre
        """,
        (temporada["anio_inicio"], temporada["anio_fin"], temporada["nombre"]),
    )


def sync_equipos(cur, equipos, temporada_label):
    for equipo in equipos:
        cur.execute(
            """
            INSERT INTO equipos (equipo_id, nombre, slug, competicion, escudo_url, temporada)
            VALUES (%s, %s, %s, 'laliga', %s, %s)
            ON CONFLICT (equipo_id) DO UPDATE SET
              nombre = EXCLUDED.nombre,
              slug = EXCLUDED.slug,
              competicion = EXCLUDED.competicion,
              escudo_url = EXCLUDED.escudo_url,
              temporada = EXCLUDED.temporada
            """,
            (
                equipo["equipo_id"],
                equipo["nombre"],
                equipo["slug"],
                equipo.get("escudo_url") or "",
                temporada_label,
            ),
        )


def sync_equipos_minimal(cur, equipos, temporada_label):
    for equipo in equipos:
        cur.execute(
            """
            INSERT INTO equipos (equipo_id, nombre, slug, competicion, escudo_url, temporada)
            VALUES (%s, %s, %s, 'laliga', '', %s)
            ON CONFLICT (equipo_id) DO UPDATE SET
              temporada = EXCLUDED.temporada
            """,
            (equipo["equipo_id"], equipo["nombre"], equipo["slug"], temporada_label),
        )


def sync_jugadores(cur, jugadores):
    for jugador in jugadores:
        cur.execute(
            """
            INSERT INTO jugadores (
                jugador_id, nombre, slug, posicion, posiciones_juego, edad, nacionalidad,
                pie, altura, foto_url, jerarquia, lesion, estado, probabilidad, equipo_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (jugador_id) DO UPDATE SET
              nombre = COALESCE(NULLIF(EXCLUDED.nombre, ''), jugadores.nombre),
              slug = COALESCE(NULLIF(EXCLUDED.slug, ''), jugadores.slug),
              posicion = COALESCE(NULLIF(EXCLUDED.posicion, ''), jugadores.posicion),
              posiciones_juego = COALESCE(EXCLUDED.posiciones_juego, jugadores.posiciones_juego),
              edad = COALESCE(EXCLUDED.edad, jugadores.edad),
              nacionalidad = COALESCE(NULLIF(EXCLUDED.nacionalidad, ''), jugadores.nacionalidad),
              pie = COALESCE(NULLIF(EXCLUDED.pie, ''), jugadores.pie),
              altura = COALESCE(EXCLUDED.altura, jugadores.altura),
              foto_url = COALESCE(NULLIF(EXCLUDED.foto_url, ''), jugadores.foto_url),
              jerarquia = COALESCE(NULLIF(EXCLUDED.jerarquia, ''), jugadores.jerarquia),
              lesion = COALESCE(NULLIF(EXCLUDED.lesion, ''), jugadores.lesion),
              estado = COALESCE(NULLIF(EXCLUDED.estado, ''), jugadores.estado),
              probabilidad = COALESCE(EXCLUDED.probabilidad, jugadores.probabilidad),
              equipo_id = COALESCE(EXCLUDED.equipo_id, jugadores.equipo_id)
            """,
            (
                jugador["jugador_id"],
                jugador.get("nombre") or jugador.get("slug") or "",
                jugador.get("slug") or "",
                jugador.get("posicion"),
                Jsonb(jugador["posiciones_juego"]) if jugador.get("posiciones_juego") else None,
                jugador.get("edad"),
                jugador.get("nacionalidad"),
                jugador.get("pie"),
                jugador.get("altura"),
                jugador.get("foto_url") or "",
                jugador.get("jerarquia"),
                jugador.get("lesion"),
                jugador.get("estado"),
                jugador.get("probabilidad"),
                jugador.get("equipo_id"),
            ),
        )


def sync_jornadas(cur, jornadas):
    for jornada in jornadas:
        cur.execute(
            """
            INSERT INTO jornadas (temporada, numero, anio_inicio)
            VALUES (%s, %s, %s)
            ON CONFLICT (temporada, numero) DO UPDATE SET
              anio_inicio = EXCLUDED.anio_inicio
            """,
            (jornada["temporada"], jornada["numero"], jornada["anio"] - 1),
        )


def sync_partidos(cur, partidos, temporada_label):
    for partido in partidos:
        fecha = _parse_dt(partido.get("fecha"))
        cur.execute(
            """
            INSERT INTO partidos (
                partido_id, jornada_id, fecha, canal, resultado_local,
                resultado_visitante, local_id, visitante_id
            )
            VALUES (
                %s,
                (SELECT id FROM jornadas WHERE temporada = %s AND numero = %s),
                %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (partido_id) DO UPDATE SET
              jornada_id = EXCLUDED.jornada_id,
              fecha = EXCLUDED.fecha,
              canal = EXCLUDED.canal,
              resultado_local = EXCLUDED.resultado_local,
              resultado_visitante = EXCLUDED.resultado_visitante,
              local_id = EXCLUDED.local_id,
              visitante_id = EXCLUDED.visitante_id
            """,
            (
                partido["partido_id"],
                temporada_label,
                partido["jornada"],
                fecha,
                partido.get("canal"),
                partido.get("resultado_local"),
                partido.get("resultado_visitante"),
                partido.get("local_id"),
                partido.get("visitante_id"),
            ),
        )


def sync_precios(cur, precios):
    for precio in precios:
        fecha = _madrid_naive(precio.get("fecha"))
        cur.execute(
            """
            INSERT INTO precios_diarios (
                jugador_id, fecha, valor, valor_anterior, diferencia,
                diferencia_pct, tendencia, aceleracion, aceleracion_estado
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (jugador_id, fecha) DO UPDATE SET
              valor = EXCLUDED.valor,
              valor_anterior = EXCLUDED.valor_anterior,
              diferencia = EXCLUDED.diferencia,
              diferencia_pct = EXCLUDED.diferencia_pct,
              tendencia = EXCLUDED.tendencia,
              aceleracion = EXCLUDED.aceleracion,
              aceleracion_estado = EXCLUDED.aceleracion_estado
            """,
            (
                precio["jugador_id"],
                fecha,
                precio["valor"],
                precio.get("valor_anterior"),
                precio.get("diferencia"),
                precio.get("diferencia_pct"),
                precio.get("tendencia"),
                precio.get("aceleracion"),
                precio.get("aceleracion_estado"),
            ),
        )


def sync_clasificacion(cur, filas):
    columnas = ", ".join(STAT_COLS)
    huecos = ", ".join(["%s"] * len(STAT_COLS))
    for fila in filas:
        cur.execute(
            f"""
            INSERT INTO clasificacion (temporada, jornada, posicion, zona, equipo_id, {columnas})
            VALUES (%s, %s, %s, %s, %s, {huecos})
            ON CONFLICT (temporada, jornada, equipo_id) DO UPDATE SET
              posicion = EXCLUDED.posicion,
              zona = EXCLUDED.zona,
              {", ".join(f"{c} = EXCLUDED.{c}" for c in STAT_COLS)}
            """,
            (
                fila["temporada"],
                fila["jornada"],
                fila["posicion"],
                fila.get("zona") or "",
                fila["equipo_id"],
                *(fila.get(c) for c in STAT_COLS),
            ),
        )


def sync_alineaciones(cur, alineaciones):
    for alineacion in alineaciones:
        cur.execute(
            """
            INSERT INTO alineaciones (partido_id, jugador_id, jornada, once, probabilidad)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (partido_id, jugador_id) DO UPDATE SET
              jornada = EXCLUDED.jornada,
              once = EXCLUDED.once,
              probabilidad = EXCLUDED.probabilidad
            """,
            (
                alineacion["partido_id"],
                alineacion["jugador_id"],
                alineacion.get("jornada"),
                alineacion["once"],
                alineacion.get("probabilidad"),
            ),
        )
