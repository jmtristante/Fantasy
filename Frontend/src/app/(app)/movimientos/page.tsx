import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getSelectedLigaId } from "@/lib/liga";
import { MovimientosManager } from "@/components/movimientos-manager";

export const dynamic = "force-dynamic";

export default async function MovimientosPage() {
  const supabase = await createClient();
  const ligaId = await getSelectedLigaId();

  if (ligaId == null) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
          <p className="text-muted-foreground">
            Registra operaciones de mercado, blindajes y pagos de jornada.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sin liga seleccionada</CardTitle>
            <CardDescription>
              Selecciona o crea una liga en el menú lateral (arriba) para
              gestionar sus movimientos.
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
    .select("nombre")
    .eq("id", ligaId)
    .single();

  const { data: miembros } = await supabase
    .schema("liga")
    .from("miembros")
    .select("id, nombre")
    .eq("liga_id", ligaId)
    .order("nombre");

  const { data: libres } = await supabase
    .schema("liga")
    .from("v_mercado_actual")
    .select("jugador_id, jugador, valor_mercado")
    .eq("liga_id", ligaId);

  const { data: plantilla } = await supabase
    .schema("liga")
    .from("v_plantilla")
    .select("miembro_id, miembro, jugador_id, jugador, clausula, valor_mercado")
    .eq("liga_id", ligaId);

  const { data: historialRaw } = await supabase
    .schema("liga")
    .from("v_movimientos_detalle")
    .select("id, fecha, tipo, miembro, contraparte, jugador, importe, nota")
    .eq("liga_id", ligaId);

  return (
    <MovimientosManager
      ligaId={ligaId}
      ligaNombre={liga?.nombre ?? "tu liga"}
      miembros={(miembros ?? []).map((m) => ({ id: m.id as number, nombre: m.nombre as string }))}
      libres={(libres ?? []).map((l) => ({
        jugador_id: l.jugador_id as number,
        nombre: l.jugador as string,
        precio: (l.valor_mercado as number | null) ?? null,
      }))}
      plantilla={(plantilla ?? []).map((p) => ({
        miembro_id: p.miembro_id as number,
        miembro: p.miembro as string,
        jugador_id: p.jugador_id as number,
        nombre: p.jugador as string,
        clausula: (p.clausula as number | null) ?? null,
        valor_mercado: (p.valor_mercado as number | null) ?? null,
      }))}
      historial={(historialRaw ?? []).map((h) => ({
        id: h.id as number,
        fecha: (h.fecha as string) ?? "",
        tipo: h.tipo as string,
        miembro: (h.miembro as string) ?? "",
        contraparte: (h.contraparte as string | null) ?? null,
        jugador: (h.jugador as string | null) ?? null,
        importe: (h.importe as number) ?? 0,
        nota: (h.nota as string | null) ?? null,
      }))}
    />
  );
}