import Link from "next/link";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getSelectedLigaId } from "@/lib/liga";
import { formatValor } from "@/lib/format";
import { CreateMiembroForm } from "@/components/create-miembro-form";
import { DeleteMiembroButton } from "@/components/delete-miembro-button";

export const dynamic = "force-dynamic";

type MiembroRow = {
  miembro_id: number;
  nombre: string;
  email: string | null;
  saldo: number | null;
  n_jugadores: number | null;
};

export default async function MiembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ crear?: string }>;
}) {
  const supabase = await createClient();
  const ligaId = await getSelectedLigaId();
  const params = await searchParams;
  const mostrarForm = params.crear === "1";

  if (ligaId == null) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Miembros</h1>
          <p className="text-muted-foreground">
            Amigos que juegan en tu liga.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sin liga seleccionada</CardTitle>
            <CardDescription>
              Selecciona o crea una liga en el menú lateral (arriba) para
              gestionar sus miembros.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ligas?crear=1" className={buttonVariants({ size: "sm" })}>
              Crear liga
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: liga } = await supabase
    .schema("liga")
    .from("ligas")
    .select("id, nombre, presupuesto")
    .eq("id", ligaId)
    .single();

  const { data: miembros, error } = await supabase
    .schema("liga")
    .from("v_miembros_saldo")
    .select("miembro_id, nombre, email, saldo, n_jugadores")
    .eq("liga_id", ligaId)
    .order("saldo", { ascending: false });

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Miembros</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No se pudo cargar los miembros</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const filas: MiembroRow[] = (miembros ?? []).map((m) => ({
    miembro_id: m.miembro_id as number,
    nombre: m.nombre as string,
    email: (m.email as string | null) ?? null,
    saldo: (m.saldo as number | null) ?? null,
    n_jugadores: (m.n_jugadores as number | null) ?? null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Miembros</h1>
        <p className="text-muted-foreground">
          Amigos registrados en <span className="font-medium text-foreground">{liga?.nombre}</span>.
          Presupuesto inicial de la liga:{" "}
          <span className="font-medium text-foreground">{formatValor(liga?.presupuesto ?? 0)}</span>.
        </p>
      </div>

      {mostrarForm && <CreateMiembroForm ligaId={ligaId} presupuestoInicial={liga?.presupuesto ?? 0} />}

      <div className="flex flex-wrap gap-2">
        <Link href="/miembros?crear=1" className={buttonVariants({ size: "sm" })}>
          + Añadir miembro
        </Link>
        {mostrarForm && (
          <Link href="/miembros" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Cancelar
          </Link>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Jugadores</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((m) => (
              <TableRow key={m.miembro_id}>
                <TableCell className="font-medium">{m.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{m.email ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatValor(m.saldo)}
                </TableCell>
                <TableCell className="text-right">
                  {m.n_jugadores ? (
                    <Badge variant="secondary">{m.n_jugadores}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <DeleteMiembroButton
                    id={m.miembro_id}
                    nombre={m.nombre}
                    nJugadores={m.n_jugadores ?? undefined}
                  />
                </TableCell>
              </TableRow>
            ))}
            {filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Todavía no hay miembros. Añade a tus amigos.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}