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

  // Miembros, jornadas, partidos, alineaciones y plantilla de la liga (independientes).
  const [
    { data: miembros },
    { data: jornadasRaw },
    { data: partidos },
    { data: alineacionesRaw },
    { data: plantillaRaw },
    { data: clasificacionRaw },
    { data: maxJornadaRow },
  ] = await Promise.all([
    supabase
      .schema("liga")
      .from("miembros")
      .select("id, nombre")
      .eq("liga_id", ligaId)
      .order("nombre"),
    supabase.from("jornadas").select("numero").order("numero"),
    supabase
      .from("partidos")
      .select(
        "jornada:jornadas(numero), resultado_local, resultado_visitante, local:equipos!local_id(equipo_id, nombre, escudo_url), visitante:equipos!visitante_id(equipo_id, nombre, escudo_url)",
      ),
    supabase
      .schema("liga")
      .from("liga_alineaciones")
      .select("miembro_id, jugador_id, jornada")
      .eq("liga_id", ligaId),
    supabase
      .schema("liga")
      .from("v_plantilla")
      .select("miembro_id, jugador_id, jugador, posicion, equipo, clausula")
      .eq("liga_id", ligaId),
    supabase
      .from("clasificacion")
      .select("equipo_id, posicion, jornada")
      .order("posicion"),
    supabase
      .from("clasificacion")
      .select("jornada")
      .order("jornada", { ascending: false })
      .limit(1),
  ]);

  const maxJornadaClas = maxJornadaRow?.[0]?.jornada ?? null;
  const posicionPorEquipo = new Map<number, number>();
  for (const c of clasificacionRaw ?? []) {
    if (maxJornadaClas != null && (c as { jornada?: number }).jornada !== maxJornadaClas) continue;
    posicionPorEquipo.set(c.equipo_id as number, c.posicion as number);
  }

  const listaMiembros: MiembroAlineaciones[] = (miembros ?? []).map((m) => ({
    id: m.id as number,
    nombre: m.nombre as string,
  }));

  const jornadas = Array.from(new Set((jornadasRaw ?? []).map((j) => j.numero as number))).sort(
    (a, b) => a - b,
  );

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

  const alineaciones = (alineacionesRaw ?? []).map((a) => ({
    miembro_id: a.miembro_id as number,
    jugador_id: a.jugador_id as number,
    jornada: a.jornada as number,
  }));

  const ids = (plantillaRaw ?? []).map((p) => p.jugador_id as number);
  const jugInfo: Record<number, { foto: string | null; escudo: string | null; equipo_id: number | null; probabilidad: number | null }> = {};
  if (ids.length > 0) {
    const { data: jug } = await supabase
      .from("jugadores")
      .select("jugador_id, foto_url, probabilidad, equipo_id, equipos(escudo_url)")
      .in("jugador_id", ids);
    const escudoPorId = new Map<number, string | undefined>();
    for (const j of jug ?? []) {
      const e = j.equipos as { escudo_url: string } | { escudo_url: string }[] | null;
      const esc = Array.isArray(e) ? e[0] : e;
      escudoPorId.set(j.jugador_id as number, (esc?.escudo_url as string | undefined));
    }
    for (const j of jug ?? []) {
      jugInfo[j.jugador_id as number] = {
        foto: (j.foto_url as string) || null,
        escudo: escudoPorId.get(j.jugador_id as number) ?? null,
        equipo_id: (j.equipo_id as number | null) ?? null,
        probabilidad: (j.probabilidad as number | null) ?? null,
      };
    }
  }

  // Mapa jugador_id -> rival (equipo) por jornada.
  const rivalesPorJornada: Record<number, Record<number, { nombre: string; escudo: string | null; porEncima: boolean | null } | null>> = {};
  for (const p of partidos ?? []) {
    const num =
      (Array.isArray(p.jornada) ? p.jornada[0] : p.jornada)?.numero ?? null;
    if (num == null) continue;
    const local = Array.isArray(p.local) ? p.local[0] : p.local;
    const visitante = Array.isArray(p.visitante) ? p.visitante[0] : p.visitante;
    if (!local || !visitante) continue;
    const posLocal = posicionPorEquipo.get(local.equipo_id as number);
    const posVisit = posicionPorEquipo.get(visitante.equipo_id as number);
    for (const [jid, info] of Object.entries(jugInfo)) {
      if (info.equipo_id == null) continue;
      let rival: { nombre: string; escudo: string | null; porEncima: boolean | null } | null = null;
      if (info.equipo_id === (local.equipo_id as number) && posLocal != null && posVisit != null) {
        rival = { nombre: visitante.nombre as string, escudo: (visitante.escudo_url as string | null) ?? null, porEncima: posVisit < posLocal };
      } else if (info.equipo_id === (visitante.equipo_id as number) && posLocal != null && posVisit != null) {
        rival = { nombre: local.nombre as string, escudo: (local.escudo_url as string | null) ?? null, porEncima: posLocal < posVisit };
      }
      if (rival == null) continue;
      if (!rivalesPorJornada[num]) rivalesPorJornada[num] = {};
      rivalesPorJornada[num][Number(jid)] = rival;
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
      foto: jugInfo[p.jugador_id as number]?.foto ?? null,
      escudo: jugInfo[p.jugador_id as number]?.escudo ?? null,
      clausula: (p.clausula as number | null) ?? null,
      probabilidad: jugInfo[p.jugador_id as number]?.probabilidad ?? null,
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
        rivalesPorJornada={rivalesPorJornada}
      />
    </div>
  );
}