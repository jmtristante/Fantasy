import argparse
import re
import sys
from datetime import datetime, timezone

from config import COMPETICION, SEASON_LABEL, SEASON_YEAR
from db import migrate, sync as sync_db
from scrapers import calendario, clasificacion, equipos as equipos_mod, mercado

ENTITIES = {"mercado", "clasificacion", "calendario", "equipos"}


def _argparse():
    parser = argparse.ArgumentParser(
        description="Scraper de futbolfantasy.com (LaLiga) con sincronización en Supabase/Postgres"
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("setup", help="Aplica las migraciones SQL de db/migrations a la base de datos")
    sub.add_parser("migrations", help="Estado de las migraciones (aplicadas/pendientes)")
    sub.add_parser("rollback", help="Reverte la última migración (sección -- =DOWN)")

    sync = sub.add_parser("sync", help="Extrae datos y los escribe en Supabase")
    sync.add_argument(
        "--entities",
        default="all",
        help="Entidades a sincronizar: all | mercado,clasificacion,calendario,equipos",
    )
    sync.add_argument("--teams", default="", help="Solo estos equipos (slugs separados por coma)")
    sync.add_argument("--sleep", type=float, default=None, help="Segundos entre peticiones HTTP")
    sync.add_argument("--refresh", action="store_true", help="Ignora la caché y descarga de nuevo")
    sync.add_argument("--dry-run", action="store_true", help="No escribe en la base de datos, solo muestra recuentos")
    return parser


def _selected(entities):
    if "all" in entities:
        return set(ENTITIES)
    return {e.strip() for e in entities.split(",") if e.strip()} & ENTITIES


def _slugify(nombre):
    slug = re.sub(r"[^a-z0-9]+", "-", (nombre or "").lower()).strip("-")
    return slug or "equipo"


def _minimal_jugadores(precios):
    jugadores = {}
    for p in precios:
        if p["jugador_id"] in jugadores:
            continue
        jugadores[p["jugador_id"]] = {
            "jugador_id": p["jugador_id"],
            "slug": "",
            "nombre": p.get("jugador_nombre") or "",
            "posicion": p.get("posicion"),
            "equipo_id": p.get("equipo_id"),
        }
    return list(jugadores.values())


def _precios_multi_juego(jugadores):
    precios = []
    hoy = datetime.now(timezone.utc)
    for j in jugadores:
        v = (j.get("valores") or {}).get("laliga-fantasy")
        if not v or v.get("valor") is None:
            continue
        precios.append(
            {
                "jugador_id": j["jugador_id"],
                "fecha": hoy,
                "juego": "laliga-fantasy",
                "valor": v["valor"],
                "valor_anterior": v["valor"] - v["diferencia"] if v.get("diferencia") is not None else None,
                "diferencia": v.get("diferencia"),
                "diferencia_pct": None,
                "tendencia": None,
                "aceleracion": None,
            }
        )
    return precios


def cmd_setup(args):
    from db.connect import get_conn

    migrate.apply_pending(get_conn())


def cmd_migrations(args):
    from db.connect import get_conn

    migrate.status(get_conn())


def cmd_rollback(args):
    from db.connect import get_conn

    migrate.rollback_last(get_conn())


def cmd_sync(conn, args):
    selected = _selected(args.entities)
    if not selected:
        raise SystemExit(f"Entidades desconocidas. Usa: {', '.join(sorted(ENTITIES))}")

    temporada = {
        "anio_inicio": SEASON_YEAR - 1,
        "anio_fin": SEASON_YEAR,
        "nombre": SEASON_LABEL,
    }
    if conn is not None:
        sync_db.sync_temporada(conn.cursor(), temporada)

    equipos = []
    precios = []
    if "clasificacion" in selected or "equipos" in selected:
        equipos, clasificacion_rows = clasificacion.scrape(refresh=args.refresh)
        if not equipos:
            raise SystemExit("No se encontraron equipos en la clasificación")
        print(f"Clasificación: {len(clasificacion_rows)} filas, {len(equipos)} equipos")
        if "clasificacion" in selected and conn is not None:
            cur = conn.cursor()
            sync_db.sync_equipos(cur, equipos, SEASON_LABEL)
            sync_db.sync_clasificacion(cur, clasificacion_rows)

    if "calendario" in selected:
        jornadas, partidos = calendario.scrape(refresh=args.refresh)
        print(f"Calendario: {len(jornadas)} jornadas, {len(partidos)} partidos")
        if conn is not None:
            cur = conn.cursor()
            sync_db.sync_jornadas(cur, jornadas)
            sync_db.sync_partidos(cur, partidos, SEASON_LABEL)

    if "mercado" in selected:
        precios = mercado.scrape(refresh=args.refresh)
        print(f"Mercado {COMPETICION}-fantasy: {len(precios)} precios")
        if conn is not None:
            cur = conn.cursor()
            mercado_equipos = {}
            for p in precios:
                if p.get("equipo_id") and p.get("equipo_nombre"):
                    mercado_equipos.setdefault(p["equipo_id"], p["equipo_nombre"])
            sync_db.sync_equipos_minimal(
                cur,
                [
                    {"equipo_id": eid, "nombre": nombre, "slug": _slugify(nombre)}
                    for eid, nombre in mercado_equipos.items()
                ],
                SEASON_LABEL,
            )
            sync_db.sync_jugadores(cur, _minimal_jugadores(precios))

    if "equipos" in selected:
        if not equipos:
            equipos, _ = clasificacion.scrape(refresh=args.refresh)
        if args.teams:
            filtrados = [e for e in equipos if e["slug"] in {t.strip() for t in args.teams.split(",")}]
            equipos = filtrados
        resultados = equipos_mod.scrape_all(equipos, refresh=args.refresh)
        total_jugadores = sum(len(r["jugadores"]) for r in resultados)
        total_precios = sum(len(_precios_multi_juego(r["jugadores"])) for r in resultados)
        alineaciones = []
        for r in resultados:
            if conn is not None:
                cur = conn.cursor()
                sync_db.sync_equipos(cur, [r["equipo"]], SEASON_LABEL)
                sync_db.sync_jugadores(cur, r["jugadores"])
                sync_db.sync_precios(cur, _precios_multi_juego(r["jugadores"]))
                alineaciones.extend(r["alineaciones"])
        print(f"Equipos: {len(resultados)} · Jugadores: {total_jugadores} · Precios multi-juego: {total_precios}")
        if conn is not None and alineaciones:
            sync_db.sync_alineaciones(conn.cursor(), alineaciones)
            print(f"Alineaciones: {len(alineaciones)}")

    # Los precios del mercado (oficial, con tendencia/aceleracion) se escriben al
    # final para no ser pisados por los del scraper de equipos.
    if conn is not None and precios:
        sync_db.sync_precios(conn.cursor(), precios)

    if conn is not None:
        conn.commit()
    print("Sincronización completada")


def main():
    parser = _argparse()
    args = parser.parse_args()

    if args.cmd == "setup":
        cmd_setup(args)
        return
    if args.cmd == "migrations":
        cmd_migrations(args)
        return
    if args.cmd == "rollback":
        cmd_rollback(args)
        return

    from db.connect import get_conn

    conn = get_conn() if not args.dry_run else None
    try:
        cmd_sync(conn, args)
    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    main()
