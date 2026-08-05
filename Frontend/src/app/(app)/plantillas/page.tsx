import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getSelectedLigaId } from "@/lib/liga";
import { PlantillasManager } from "@/components/plantillas-manager";

export const dynamic = "force-dynamic";

export default async function PlantillasPage() {
  const supabase = await createClient();
  const ligaId = await getSelectedLigaId();

  if (ligaId == null) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plantillas</h1>
          <p className="text-muted-foreground">
            Plantillas iniciales de cada miembro, que luego cambian con compras
            y ventas.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sin liga seleccionada</CardTitle>
            <CardDescription>
              Selecciona o crea una liga en el menú lateral (arriba) para
              gestionar las plantillas.
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
    .select("nombre, plantilla_cerrada")
    .eq("id", ligaId)
    .single();

  const { data: miembros } = await supabase
    .schema("liga")
    .from("miembros")
    .select("id, nombre")
    .eq("liga_id", ligaId)
    .order("nombre");

  const { data: plantillaRaw } = await supabase
    .schema("liga")
    .from("v_plantilla")
    .select(
      "miembro_id, miembro, jugador_id, jugador, posicion, equipo, clausula, tendencia, bloqueado, bloqueado_hasta",
    )
    .eq("liga_id", ligaId);

  const ids = (plantillaRaw ?? []).map((p) => p.jugador_id as number);
  let fotos: Record<number, { foto: string | null; escudo: string | null }> = {};
  if (ids.length > 0) {
    const { data: jug } = await supabase
      .from("jugadores")
      .select("jugador_id, foto_url, equipos(escudo_url)")
      .in("jugador_id", ids);
    const escudoPorId = new Map<number, string | undefined>();
    for (const j of jug ?? []) {
      const e = j.equipos as { escudo_url: string } | { escudo_url: string }[] | null;
      const esc = Array.isArray(e) ? e[0] : e;
      escudoPorId.set(j.jugador_id as number, (esc?.escudo_url as string | undefined));
    }
    fotos = (jug ?? []).reduce<Record<number, { foto: string | null; escudo: string | null }>>(
      (acc, j) => {
        acc[j.jugador_id as number] = {
          foto: (j.foto_url as string) || null,
          escudo: escudoPorId.get(j.jugador_id as number) ?? null,
        };
        return acc;
      },
      {},
    );
  }

  const iniciales = (plantillaRaw ?? []).map((p) => {
    const f = fotos[p.jugador_id as number];
    return {
      miembro_id: p.miembro_id as number,
      miembro: p.miembro as string,
      jugador_id: p.jugador_id as number,
      nombre: p.jugador as string,
      posicion: (p.posicion as string | null) ?? null,
      equipo: (p.equipo as string | null) ?? null,
      foto: f?.foto ?? null,
      escudo: f?.escudo ?? null,
      clausula: (p.clausula as number | null) ?? null,
      tendencia: (p.tendencia as number | null) ?? null,
      bloqueado: Boolean(p.bloqueado),
      bloqueadoHasta: (p.bloqueado_hasta as string | null) ?? null,
    };
  });

  return (
    <PlantillasManager
      ligaId={ligaId}
      ligaNombre={liga?.nombre ?? "tu liga"}
      plantillaCerrada={Boolean(liga?.plantilla_cerrada)}
      miembros={(miembros ?? []).map((m) => ({ id: m.id as number, nombre: m.nombre as string }))}
      iniciales={iniciales}
    />
  );
}