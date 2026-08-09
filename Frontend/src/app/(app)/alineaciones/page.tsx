import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getSelectedLigaId, isAdmin } from "@/lib/liga";
import {
  AlineacionesManager,
  type MiembroAlineaciones,
  type JugadorPlantilla,
} from "@/components/alineaciones-manager";

export const dynamic = "force-dynamic";

export default async function AlineacionesPage() {
  const supabase = await createClient();
  const ligaId = await getSelectedLigaId();
  const esAdmin = ligaId != null ? await isAdmin(ligaId) : false;

  if (ligaId == null) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alineaciones</h1>
          <p className="text-muted-foreground">
            Once elegido de cada miembro por jornada, sobre el campo.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sin liga seleccionada</CardTitle>
            <CardDescription>
              Selecciona o crea una liga en el menú lateral (arriba) para
              gestionar las alineaciones.
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

  // Miembros de la liga
  const { data: miembros } = await supabase
    .schema("liga")
    .from("miembros")
    .select("id, nombre")
    .eq("liga_id", ligaId)
    .order("nombre");
  const listaMiembros: MiembroAlineaciones[] = (miembros ?? []).map((m) => ({
    id: m.id as number,
    nombre: m.nombre as string,
  }));

  // Jornadas disponibles (números, ascendentes)
  const { data: jornadasRaw } = await supabase
    .from("jornadas")
    .select("numero")
    .order("numero");
  const jornadas = Array.from(new Set((jornadasRaw ?? []).map((j) => j.numero as number))).sort(
    (a, b) => a - b,
  );

  // Jornadas ya jugadas: aquellas en las que todos sus partidos tienen resultado
  const { data: partidos } = await supabase
    .from("partidos")
    .select("jornada:jornadas(numero), resultado_local, resultado_visitante");
  const partidosPorJornada = new Map<number, { total: number; conResultado: number }>();
  for (const p of partidos ?? []) {
    const num =
      (Array.isArray(p.jornada) ? p.jornada[0] : p.jornada)?.numero ?? null;
    if (num == null) continue;
    const acc = partidosPorJornada.get(num) ?? { total: 0, conResultado: 0 };
    acc.total++;
    if (p.resultado_local != null && p.resultado_visitante != null) acc.conResultado++;
    partidosPorJornada.set(num, acc);
  }
  const jornadasPasadas = new Set<number>(
    Array.from(partidosPorJornada.entries())
      .filter(([, { total, conResultado }]) => total > 0 && conResultado === total)
      .map(([num]) => num),
  );

  // Alineaciones ya guardadas de la liga
  const { data: alineacionesRaw } = await supabase
    .schema("liga")
    .from("liga_alineaciones")
    .select("miembro_id, jugador_id, jornada")
    .eq("liga_id", ligaId);
  const alineaciones = (alineacionesRaw ?? []).map((a) => ({
    miembro_id: a.miembro_id as number,
    jugador_id: a.jugador_id as number,
    jornada: a.jornada as number,
  }));

  // Plantilla de cada miembro
  const { data: plantillaRaw } = await supabase
    .schema("liga")
    .from("v_plantilla")
    .select("miembro_id, jugador_id, jugador, posicion, equipo, clausula")
    .eq("liga_id", ligaId);

  const ids = (plantillaRaw ?? []).map((p) => p.jugador_id as number);
  const fotos: Record<number, { foto: string | null; escudo: string | null }> = {};
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
    for (const j of jug ?? []) {
      fotos[j.jugador_id as number] = {
        foto: (j.foto_url as string) || null,
        escudo: escudoPorId.get(j.jugador_id as number) ?? null,
      };
    }
  }

  const plantillas: Record<number, JugadorPlantilla[]> = {};
  for (const p of plantillaRaw ?? []) {
    const miembroId = p.miembro_id as number;
    if (!plantillas[miembroId]) plantillas[miembroId] = [];
    plantillas[miembroId].push({
      jugador_id: p.jugador_id as number,
      nombre: p.jugador as string,
      posicion: (p.posicion as string | null) ?? null,
      equipo: (p.equipo as string | null) ?? null,
      foto: fotos[p.jugador_id as number]?.foto ?? null,
      escudo: fotos[p.jugador_id as number]?.escudo ?? null,
      clausula: (p.clausula as number | null) ?? null,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alineaciones</h1>
        <p className="text-muted-foreground">
          Once de cada jugador por jornada, mostrado sobre el campo.
        </p>
      </div>

      <AlineacionesManager
        ligaId={ligaId}
        esAdmin={esAdmin}
        miembros={listaMiembros}
        jornadas={jornadas}
        jornadasPasadas={jornadasPasadas}
        plantillas={plantillas}
        alineaciones={alineaciones}
      />
    </div>
  );
}