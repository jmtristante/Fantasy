import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getSelectedLigaId, isAdmin } from "@/lib/liga";
import { MovimientosManager } from "@/components/movimientos-manager";

export const dynamic = "force-dynamic";

export default async function MovimientosPage() {
  const supabase = await createClient();
  const ligaId = await getSelectedLigaId();
  const esAdmin = ligaId != null ? await isAdmin(ligaId) : false;

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
    .select("id, nombre, foto_url")
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
    .select(
      "id, fecha, tipo, miembro_id, miembro, miembro_foto, contraparte_id, contraparte, contraparte_foto, jugador_id, jugador, jugador_foto, jugador_escudo, importe, nota",
    )
    .eq("liga_id", ligaId);

  return (
    <MovimientosManager
      ligaId={ligaId}
      ligaNombre={liga?.nombre ?? "tu liga"}
      esAdmin={esAdmin}
      miembros={(miembros ?? []).map((m) => ({
        id: m.id as number,
        nombre: m.nombre as string,
        foto: (m.foto_url as string | null) ?? null,
      }))}
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
        miembro_id: (h.miembro_id as number) ?? null,
        miembro: (h.miembro as string) ?? "",
        miembro_foto: (h.miembro_foto as string | null) ?? null,
        contraparte_id: (h.contraparte_id as number | null) ?? null,
        contraparte: (h.contraparte as string | null) ?? null,
        contraparte_foto: (h.contraparte_foto as string | null) ?? null,
        jugador_id: (h.jugador_id as number | null) ?? null,
        jugador: (h.jugador as string | null) ?? null,
        jugador_foto: (h.jugador_foto as string | null) ?? null,
        jugador_escudo: (h.jugador_escudo as string | null) ?? null,
        importe: (h.importe as number) ?? 0,
        nota: (h.nota as string | null) ?? null,
      }))}
    />
  );
}