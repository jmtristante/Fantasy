import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getSelectedLigaId } from "@/lib/liga";
import { RentabilidadManager, type FilaJugador, type ResumenMiembro } from "@/components/rentabilidad-manager";

export const dynamic = "force-dynamic";

export default async function RentabilidadPage() {
  const supabase = await createClient();
  const ligaId = await getSelectedLigaId();

  if (ligaId == null) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rentabilidad</h1>
          <p className="text-muted-foreground">
            Cuánto rinde cada jugador frente a lo invertido en fichaje y subidas de cláusula.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sin liga seleccionada</CardTitle>
            <CardDescription>
              Selecciona o crea una liga en el menú lateral (arriba) para ver la
              rentabilidad de cada amigo.
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

  const { data: miembros } = await supabase
    .schema("liga")
    .from("miembros")
    .select("id, nombre, foto_url")
    .eq("liga_id", ligaId)
    .order("nombre");

  const { data: movimientos } = await supabase
    .schema("liga")
    .from("movimientos")
    .select("tipo, importe, miembro_id, jugador_id")
    .eq("liga_id", ligaId)
    .not("jugador_id", "is", null);

  const { data: drafts } = await supabase
    .schema("liga")
    .from("clausulas_historial")
    .select("miembro_id, jugador_id, valor")
    .eq("liga_id", ligaId)
    .eq("motivo", "draft_inicial");

  const { data: plantillas } = await supabase
    .schema("liga")
    .from("plantillas")
    .select("miembro_id, jugador_id")
    .eq("liga_id", ligaId);

  const { data: precios } = await supabase
    .from("v_precio_actual")
    .select("jugador_id, valor, tendencia, aceleracion_estado");

  const valorPorJugador = new Map(
    (precios ?? []).map((p) => [p.jugador_id as number, p.valor as number | null]),
  );
  const tendenciaPorJugador = new Map(
    (precios ?? []).map((p) => [p.jugador_id as number, p.tendencia as number | null]),
  );
  const acelEstadoPorJugador = new Map(
    (precios ?? []).map((p) => [p.jugador_id as number, (p.aceleracion_estado as string | null) ?? null]),
  );

  type Stub = {
    invertido: number;
    devuelto: number;
    fichaje: number;
    subidas: number;
    ventas: number;
  };
  const porKey = new Map<string, Stub>();
  const keyDe = (m: number, j: number) => `${m}:${j}`;
  const stub = (m: number, j: number): Stub => {
    const k = keyDe(m, j);
    let s = porKey.get(k);
    if (!s) {
      s = { invertido: 0, devuelto: 0, fichaje: 0, subidas: 0, ventas: 0 };
      porKey.set(k, s);
    }
    return s;
  };

  // Fichaje e invertido por compras/subidas de clausula.
  //  - compra_mercado (y clausula pagada) -> fichaje: precio por el que se compró.
  //  - subida_clausula -> subidas: dinero invertido para subir la cláusula.
  for (const mv of movimientos ?? []) {
    if (mv.miembro_id == null || mv.jugador_id == null) continue;
    const s = stub(mv.miembro_id as number, mv.jugador_id as number);
    if (mv.importe < 0) {
      const gasto = -(mv.importe as number);
      s.invertido += gasto;
      if (mv.tipo === "subida_clausula") {
        s.subidas += gasto;
      } else {
        s.fichaje += gasto;
      }
    } else {
      const ingreso = mv.importe as number;
      s.devuelto += ingreso;
      s.ventas += ingreso;
    }
  }

  // Fichaje de los jugadores asignados en la plantilla inicial (valor del primer
  // día). No generan movimiento, solo clausulas_historial con motivo draft_inicial.
  for (const d of drafts ?? []) {
    if (d.miembro_id == null || d.jugador_id == null) continue;
    const s = stub(d.miembro_id as number, d.jugador_id as number);
    s.invertido += d.valor as number;
    s.fichaje += d.valor as number;
  }

  // Valor actual: si el jugador sigue en plantilla del miembro.
  const owners = new Map<string, { jugador_id: number; miembro_id: number }>();
  for (const p of plantillas ?? []) {
    if (p.miembro_id == null || p.jugador_id == null) continue;
    const m = p.miembro_id as number;
    const j = p.jugador_id as number;
    owners.set(`${m}:${j}`, { jugador_id: j, miembro_id: m });
  }
  for (const o of owners.values()) {
    const s = stub(o.miembro_id, o.jugador_id);
    const valor = valorPorJugador.get(o.jugador_id) ?? null;
    if (valor != null) s.devuelto += valor;
  }

  const ids = new Set<number>();
  for (const s of porKey.keys()) ids.add(Number(s.split(":")[1]));

  let jugadorInfo = new Map<number, { nombre: string; equipo: string | null; foto: string | null; escudo: string | null }>();
  if (ids.size > 0) {
    const { data: jugadores } = await supabase
      .from("jugadores")
      .select("jugador_id, nombre, foto_url, equipos(nombre, escudo_url)")
      .in("jugador_id", [...ids]);
    jugadorInfo = new Map(
      (jugadores ?? []).map((j) => {
        const eq = j.equipos as
          | { nombre: string; escudo_url: string | null }
          | { nombre: string; escudo_url: string | null }[]
          | null;
        const e = Array.isArray(eq) ? eq[0] : eq;
        return [
          j.jugador_id as number,
          {
            nombre: j.nombre as string,
            equipo: e?.nombre ?? null,
            foto: (j.foto_url as string | null) ?? null,
            escudo: e?.escudo_url ?? null,
          },
        ];
      }),
    );
  }

  const filasPorMiembro = new Map<number, FilaJugador[]>();
  for (const [k, s] of porKey.entries()) {
    const [miembroIdRaw, jugadorIdRaw] = k.split(":");
    const miembroId = Number(miembroIdRaw);
    const jugadorId = Number(jugadorIdRaw);
    const info = jugadorInfo.get(jugadorId);
    const enPlantilla = owners.has(k);
    const fila: FilaJugador = {
      jugador_id: jugadorId,
      nombre: info?.nombre ?? "Jugador",
      equipo: info?.equipo ?? null,
      foto: info?.foto ?? null,
      escudo: info?.escudo ?? null,
      fichaje: s.fichaje,
      subidas: s.subidas,
      ventas: s.ventas,
      valor_actual: enPlantilla ? valorPorJugador.get(jugadorId) ?? null : null,
      tendencia: tendenciaPorJugador.get(jugadorId) ?? null,
      aceleracion_estado: acelEstadoPorJugador.get(jugadorId) ?? null,
      en_plantilla: enPlantilla,
      invertido: s.invertido,
      devuelto: s.devuelto,
      rentabilidad: s.devuelto - s.invertido,
    };
    const lista = filasPorMiembro.get(miembroId) ?? [];
    lista.push(fila);
    filasPorMiembro.set(miembroId, lista);
  }

  const resumen = (miembros ?? []).map((m) => {
    const filas = filasPorMiembro.get(m.id as number) ?? [];
    const totales = filas.reduce(
      (acc, f) => ({ invertido: acc.invertido + f.invertido, devuelto: acc.devuelto + f.devuelto }),
      { invertido: 0, devuelto: 0 },
    );
    return {
      id: m.id as number,
      nombre: m.nombre as string,
      foto: (m.foto_url as string | null) ?? null,
      filas,
      invertido: totales.invertido,
      devuelto: totales.devuelto,
      rentabilidad: totales.devuelto - totales.invertido,
    } satisfies ResumenMiembro;
  });

  return <RentabilidadManager resumen={resumen} />;
}