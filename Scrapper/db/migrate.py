"""Aplica las migraciones SQL de db/migrations directamente contra Supabase/Postgres.

Cada fichero .sql se ejecuta tal cual (sin traducir) dentro de una transaccion y se
registra en la tabla schema_migrations. La seccion "-- =DOWN" de un fichero permite
revertirla con `python main.py rollback`.
"""

from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"
DOWN_MARKER_RE = r"^--\s*=+\s*DOWN\b"


def _check_destructive(cur, sql: str) -> None:
    """Aborta si el SQL intenta borrar una tabla que contenga datos."""
    import re

    for m in re.finditer(r"DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([^\s;]+)", sql, re.IGNORECASE):
        target = m.group(1).strip().strip('"').strip("'")
        if "." not in target:
            target = "public." + target
        cur.execute("SELECT to_regclass(%s)", (target,))
        reg = cur.fetchone()[0]
        if reg is None:
            continue  # la tabla no existe, nada que proteger
        cur.execute("SELECT COUNT(*) FROM %s" % target)
        count = cur.fetchone()[0]
        if count > 0:
            raise SystemExit(
                f"[GUARDADO] Rechazado DROP TABLE de {target} porque contiene {count} filas. "
                f"Borra los datos de forma manual si estás seguro, o revisa la migración."
            )


def _split_up_down(text: str) -> tuple[str, str]:
    import re

    up, down = [], []
    current = up
    for line in text.splitlines():
        if re.match(DOWN_MARKER_RE, line.strip(), re.IGNORECASE):
            current = down
            continue
        current.append(line)
    return "\n".join(up), "\n".join(down)


def _ensure_migrations_table(cur) -> None:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            name       TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )


def _applied(cur) -> set[str]:
    cur.execute("SELECT name FROM schema_migrations")
    return {row[0] for row in cur.fetchall()}


def apply_pending(conn) -> None:
    with conn.cursor() as cur:
        _ensure_migrations_table(cur)
        applied = _applied(cur)
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            name = path.name
            if name in applied:
                continue
            up, _ = _split_up_down(path.read_text(encoding="utf-8"))
            _check_destructive(cur, up)
            cur.execute(up)
            cur.execute(
                "INSERT INTO schema_migrations (name) VALUES (%s)", (name,)
            )
            print(f"Aplicada: {name}")
        conn.commit()
        pendientes = len(list(MIGRATIONS_DIR.glob("*.sql"))) - len(_applied(cur))
    print(f"Esquema al dia. Pendientes: {pendientes}")


def rollback_last(conn) -> None:
    with conn.cursor() as cur:
        _ensure_migrations_table(cur)
        cur.execute(
            "SELECT name FROM schema_migrations ORDER BY applied_at DESC LIMIT 1"
        )
        row = cur.fetchone()
        if not row:
            print("No hay migraciones que revertir")
            return
        name = row[0]
        path = MIGRATIONS_DIR / name
        if not path.exists():
            raise SystemExit(f"Migracion {name} no encontrada en {MIGRATIONS_DIR}")
        _, down = _split_up_down(path.read_text(encoding="utf-8"))
        if not down.strip():
            raise SystemExit(f"La migracion {name} no tiene seccion -- =DOWN")
        _check_destructive(cur, down)
        cur.execute(down)
        cur.execute("DELETE FROM schema_migrations WHERE name = %s", (name,))
        conn.commit()
    print(f"Reversida: {name}")


def status(conn) -> None:
    with conn.cursor() as cur:
        _ensure_migrations_table(cur)
        applied = _applied(cur)
    for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        estado = "aplicada" if path.name in applied else "pendiente"
        print(f"  {estado:9s} {path.name}")
