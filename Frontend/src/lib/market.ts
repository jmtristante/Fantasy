// Utilidades del mercado diario. Sin dependencias server (seguro en cliente).

export function parseResetHora(hora: string | null | undefined): {
  h: number;
  m: number;
} | null {
  if (!hora) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hora.trim());
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

function localDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/**
 * Fecha del ciclo de mercado activo para una liga.
 * El mercado se reinicia cada dia a `resetHora`. El ciclo activo es:
 *   - si now >= resetHora  -> hoy (ciclo nuevo, vacio)
 *   - si now <  resetHora  -> ayer (el ciclo que empezo ayer a esa hora)
 * Sin resetHora configurada, el ciclo activo es hoy (reinicio a medianoche).
 */
export function getActiveMarketDate(
  resetHora: string | null | undefined,
): string {
  const now = new Date();
  const reset = parseResetHora(resetHora);
  if (!reset) return localDate(now);

  const resetToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    reset.h,
    reset.m,
    0,
    0,
  );
  return now >= resetToday ? localDate(now) : localDate(addDays(now, -1));
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function formatResetHora(hora: string | null | undefined): string {
  if (!hora) return "—";
  return hora.slice(0, 5);
}