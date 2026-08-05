import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClasificacionPage() {
  const supabase = await createClient();

  const { data: maxRow } = await supabase
    .from("clasificacion")
    .select("jornada")
    .order("jornada", { ascending: false })
    .limit(1);
  const jornada = maxRow?.[0]?.jornada ?? 0;

  const { data: filas } = await supabase
    .from("clasificacion")
    .select(
      "posicion, zona, total_puntos, total_pj, total_g, total_e, total_p, total_gf, total_gc, total_dg, temporada, equipos(nombre)",
    )
    .eq("jornada", jornada)
    .order("posicion");

  type Fila = {
    posicion: number;
    zona: string | null;
    total_puntos: number | null;
    total_pj: number | null;
    total_g: number | null;
    total_e: number | null;
    total_p: number | null;
    total_gf: number | null;
    total_gc: number | null;
    total_dg: number | null;
    temporada: string | null;
    equipos: { nombre: string } | { nombre: string }[] | null;
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clasificación</h1>
        <p className="text-muted-foreground">
          Tabla general de LaLiga, jornada {jornada}
          {filas?.[0]?.temporada ? ` · ${filas[0].temporada}` : ""}.
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Pos</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead className="text-center">PJ</TableHead>
              <TableHead className="text-center">G</TableHead>
              <TableHead className="text-center">E</TableHead>
              <TableHead className="text-center">P</TableHead>
              <TableHead className="text-center">GF</TableHead>
              <TableHead className="text-center">GC</TableHead>
              <TableHead className="text-center">DG</TableHead>
              <TableHead className="text-right">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(filas as Fila[] | null)?.map((f) => {
              const nombre =
                Array.isArray(f.equipos) && f.equipos.length > 0
                  ? f.equipos[0]?.nombre
                  : (f.equipos as { nombre: string } | null)?.nombre ?? "—";
              return (
                <TableRow key={f.posicion}>
                  <TableCell className="font-medium">{f.posicion}</TableCell>
                  <TableCell>{nombre}</TableCell>
                  <TableCell className="text-center">{f.total_pj ?? "—"}</TableCell>
                  <TableCell className="text-center">{f.total_g ?? "—"}</TableCell>
                  <TableCell className="text-center">{f.total_e ?? "—"}</TableCell>
                  <TableCell className="text-center">{f.total_p ?? "—"}</TableCell>
                  <TableCell className="text-center">{f.total_gf ?? "—"}</TableCell>
                  <TableCell className="text-center">{f.total_gc ?? "—"}</TableCell>
                  <TableCell className="text-center">{f.total_dg ?? "—"}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {f.total_puntos ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
