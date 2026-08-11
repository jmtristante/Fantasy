// Utilidades del mercado diario. Sin dependencias server (seguro en cliente).

// Zona horaria real de la liga. El mercado se reinicia en hora local espanola,
// por lo que el ciclo activo debe calcularse en esta zona (no en la del
// servidor: en Vercel el servidor corre en UTC).
export const MERCADO_TZ = "Europe/Madrid";

export function parseResetHora(hora: string | null | undefined): {
  h: number;
  m: number;
} | null {
  if (!hora) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hora.trim());
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

type ZonedParts = {
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
};

function zonedParts(d: Date, tz: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map = new Map<string, number>();
  for (const p of fmt.formatToParts(d)) {
    if (p.type === "literal") continue;
    map.set(p.type, Number(p.value));
  }
  return {
    y: map.get("year") ?? 0,
    m: map.get("month") ?? 0,
    d: map.get("day") ?? 0,
    h: map.get("hour") ?? 0,
    min: map.get("minute") ?? 0,
  };
}

// Instante real (epoch) en el que en `tz` son las (y, m, d) a las h:min.
function zonedDate(y: number, m: number, d: number, h: number, min: number, tz: string): Date {
  const candidate = new Date(Date.UTC(y, m - 1, d, h, min, 0, 0));
  const p = zonedParts(candidate, tz);
  const asUtc = new Date(Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, 0, 0)).getTime();
  const offset = asUtc - candidate.getTime();
  return new Date(candidate.getTime() - offset);
}

function localDate(d: Date, tz: string): string {
  const p = zonedParts(d, tz);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/**
 * Fecha del ciclo de mercado activo para una liga.
 * El mercado se reinicia cada dia a `resetHora` (hora local espanola). El ciclo
 * activo es:
 *   - si now >= resetHora  -> hoy (ciclo nuevo, vacio)
 *   - si now <  resetHora  -> ayer (el ciclo que empezo ayer a esa hora)
 * Sin resetHora configurada, el ciclo activo es hoy (reinicio a medianoche).
 * Se calcula en la zona horaria de la liga, independientemente de la del
 * servidor.
 */
export function getActiveMarketDate(
  resetHora: string | null | undefined,
  tz: string = MERCADO_TZ,
): string {
  const now = new Date();
  const reset = parseResetHora(resetHora);
  if (!reset) return localDate(now, tz);

  const nowParts = zonedParts(now, tz);
  const resetToday = zonedDate(
    nowParts.y,
    nowParts.m,
    nowParts.d,
    reset.h,
    reset.m,
    tz,
  );
  const active =
    now >= resetToday ? now : new Date(resetToday.getTime() - 86400000);
  return localDate(active, tz);
}

export function formatResetHora(hora: string | null | undefined): string {
  if (!hora) return "—";
  return hora.slice(0, 5);
}
