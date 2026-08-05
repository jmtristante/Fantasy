import Link from "next/link";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  const { data: jornadas } = await supabase
    .from("jornadas")
    .select("id, numero")
    .order("numero");

  const params = await searchParams;
  const numero = Number(params.j);
  const actual =
    jornadas?.find((j) => j.numero === numero) ?? jornadas?.at(-1);

  const { data: partidos } = await supabase
    .from("partidos")
    .select(
      "partido_id, fecha, canal, resultado_local, resultado_visitante, local:equipos!local_id(nombre), visitante:equipos!visitante_id(nombre)",
    )
    .eq("jornada_id", actual?.id)
    .order("fecha");

  type Partido = {
    partido_id: number;
    fecha: string | null;
    canal: string | null;
    resultado_local: number | null;
    resultado_visitante: number | null;
    local: { nombre: string } | null;
    visitante: { nombre: string } | null;
  };

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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Local</TableHead>
              <TableHead className="w-16 text-center">Resultado</TableHead>
              <TableHead>Visitante</TableHead>
              <TableHead className="text-right">Canal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(partidos as Partido[] | null)?.map((p) => (
              <TableRow key={p.partido_id}>
                <TableCell>{formatDate(p.fecha)}</TableCell>
                <TableCell>{p.local?.nombre ?? "—"}</TableCell>
                <TableCell className="text-center font-bold tabular-nums">
                  {p.resultado_local != null && p.resultado_visitante != null
                    ? `${p.resultado_local} - ${p.resultado_visitante}`
                    : "vs"}
                </TableCell>
                <TableCell>{p.visitante?.nombre ?? "—"}</TableCell>
                <TableCell className="text-right text-muted-foreground">{p.canal ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
