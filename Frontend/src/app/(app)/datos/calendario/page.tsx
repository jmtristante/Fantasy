import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ j?: string }>;
}) {
  const supabase = await createClient();

  const [{ data: jornadas }, { data: partidosEstado }] = await Promise.all([
    supabase.from("jornadas").select("id, numero").order("numero"),
    supabase.from("partidos").select("jornada_id, resultado_local, resultado_visitante"),
  ]);

  const params = await searchParams;
  const numero = Number(params.j);

  // Proxima jornada a jugar: la primera con al menos un partido sin resultado.
  const jugadosPorJornada = new Map<number, number>();
  for (const p of partidosEstado ?? []) {
    const jid = p.jornada_id as number;
    const esJugado =
      p.resultado_local != null && p.resultado_visitante != null;
    jugadosPorJornada.set(jid, (jugadosPorJornada.get(jid) ?? 0) + (esJugado ? 1 : 0));
  }
  const totalPorJornada = new Map<number, number>();
  for (const p of partidosEstado ?? []) {
    const jid = p.jornada_id as number;
    totalPorJornada.set(jid, (totalPorJornada.get(jid) ?? 0) + 1);
  }
  const proxima =
    jornadas?.find(
      (j) =>
        (jugadosPorJornada.get(j.id as number) ?? 0) <
        (totalPorJornada.get(j.id as number) ?? 0),
    ) ?? jornadas?.at(-1);

  const actual =
    jornadas?.find((j) => j.numero === numero) ?? proxima;

  const { data: partidos } = await supabase
    .from("partidos")
    .select(
      "partido_id, fecha, canal, resultado_local, resultado_visitante, local:equipos!local_id(nombre, escudo_url), visitante:equipos!visitante_id(nombre, escudo_url)",
    )
    .eq("jornada_id", actual?.id)
    .order("fecha");

  type Equipo = { nombre: string; escudo_url: string | null } | null;
  type Partido = {
    partido_id: number;
    fecha: string | null;
    canal: string | null;
    resultado_local: number | null;
    resultado_visitante: number | null;
    local: Equipo;
    visitante: Equipo;
  };
  const lista: Partido[] = (partidos as Partido[] | null) ?? [];

  const jugado = (p: Partido) =>
    p.resultado_local != null && p.resultado_visitante != null;

  const Escudo = ({ equipo, nombre }: { equipo: Equipo; nombre: string }) =>
    equipo?.escudo_url ? (
      <img
        src={equipo.escudo_url}
        alt={equipo.nombre}
        className="size-12 shrink-0 rounded-md object-contain bg-white p-0.5 ring-1 ring-border"
      />
    ) : (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-semibold text-muted-foreground">
        {nombre.slice(0, 2).toUpperCase()}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendario</h1>
        <p className="text-muted-foreground">
          Partidos de LaLiga con resultados, jornada {actual?.numero ?? "—"}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(jornadas ?? []).map((j) => (
          <Link
            key={j.id}
            href={`/datos/calendario?j=${j.numero}`}
            className={cn(
              "rounded-md border px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted",
              j.numero === actual?.numero && "bg-primary text-primary-foreground",
            )}
          >
            {j.numero}
          </Link>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay partidos disponibles para esta jornada.
        </p>
      ) : (
<div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {lista.map((p) => (
            <div
              key={p.partido_id}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDate(p.fecha)}</span>
                {p.canal && <span>{p.canal}</span>}
              </div>

              <div className="flex items-center gap-2">
                <Escudo equipo={p.local} nombre="LOC" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {p.local?.nombre ?? "—"}
                  </p>
                </div>
                <span className="text-lg font-bold tabular-nums">
                  {p.resultado_local ?? "–"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Escudo equipo={p.visitante} nombre="VIS" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {p.visitante?.nombre ?? "—"}
                  </p>
                </div>
                <span className="text-lg font-bold tabular-nums">
                  {p.resultado_visitante ?? "–"}
                </span>
              </div>

              <div className="flex items-center justify-center rounded-md border border-dashed py-1 text-[11px] text-muted-foreground">
                {jugado(p) ? "Finalizado" : "Próximo partido"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}