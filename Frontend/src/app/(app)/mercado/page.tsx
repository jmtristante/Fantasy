import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getSelectedLigaId, isAdmin } from "@/lib/liga";
import { getActiveMarketDate } from "@/lib/market";
import { MercadoManager } from "@/components/mercado-manager";

export const dynamic = "force-dynamic";

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function MercadoPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const supabase = await createClient();
  const ligaId = await getSelectedLigaId();
  const esAdmin = ligaId != null ? await isAdmin(ligaId) : false;

  if (ligaId == null) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mercado</h1>
          <p className="text-muted-foreground">
            Jugadores que tú añadas al mercado de tu liga, con reinicio diario.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sin liga seleccionada</CardTitle>
            <CardDescription>
              Selecciona o crea una liga en el menú lateral (arriba) para ver
              su mercado.
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

  const { data: liga, error: ligaError } = await supabase
    .schema("liga")
    .from("ligas")
    .select("id, nombre, mercado_reset_hora")
    .eq("id", ligaId)
    .single();

  const resetHora = (liga?.mercado_reset_hora as string | null) ?? null;
  const activeDate = getActiveMarketDate(resetHora);

  const params = await searchParams;
  const rawFecha = params.fecha ?? activeDate;
  const selectedFecha = FECHA_RE.test(rawFecha) ? rawFecha : activeDate;

  const [{ data: fechasHist }, { data: entradas, error: entradasError }] =
    await Promise.all([
      supabase
        .schema("liga")
        .from("v_market_historial")
        .select("fecha")
        .eq("liga_id", ligaId),
      supabase
        .schema("liga")
        .from("market_entradas")
        .select("id, jugador_id")
        .eq("liga_id", ligaId)
        .eq("fecha", selectedFecha)
        .order("creado"),
    ]);

  const fechas = Array.from(
    new Set([...(fechasHist ?? []).map((h) => h.fecha as string), selectedFecha, activeDate]),
  ).sort((a, b) => a.localeCompare(b));

  const ids = (entradas ?? []).map((e) => e.jugador_id as number);

  let jugadores: {
    jugador_id: number;
    nombre: string;
    posicion: string | null;
    foto_url: string;
    estado?: string | null;
    jerarquia?: string | null;
    probabilidad?: number | null;
    lesion?: string | null;
    equipos: { nombre: string; escudo_url: string } | { nombre: string; escudo_url: string }[] | null;
  }[] = [];
  let precios: {
    jugador_id: number;
    valor: number | null;
    tendencia: number | null;
    aceleracion_estado: string | null;
  }[] = [];
  if (ids.length > 0) {
    const [jugQuery, { data: preciosData }] = await Promise.all([
      supabase
        .from("jugadores")
        .select(
          "jugador_id, nombre, posicion, foto_url, estado, jerarquia, probabilidad, lesion, equipos(nombre, escudo_url)",
        )
        .in("jugador_id", ids),
      supabase
        .from("v_precio_actual")
        .select("jugador_id, valor, tendencia, aceleracion_estado")
        .in("jugador_id", ids),
    ]);
    jugadores = (jugQuery.data ?? []) as typeof jugadores;
    precios = (preciosData ?? []) as typeof precios;
  }
  const infoJugador = new Map<
    number,
    {
      nombre: string;
      posicion: string | null;
      foto: string | null;
      equipo: string | null;
      escudo: string | null;
      estado?: string | null;
      jerarquia?: string | null;
      probabilidad?: number | null;
      lesion?: string | null;
    }
  >();
  for (const j of jugadores) {
    const e = j.equipos;
    const eq = Array.isArray(e) ? e[0] : e;
    infoJugador.set(j.jugador_id, {
      nombre: j.nombre,
      posicion: j.posicion,
      foto: j.foto_url || null,
      equipo: eq?.nombre ?? null,
      escudo: (eq?.escudo_url as string | undefined) ?? null,
      estado: j.estado ?? null,
      jerarquia: j.jerarquia ?? null,
      probabilidad: j.probabilidad ?? null,
      lesion: j.lesion ?? null,
    });
  }
  const precioPorJugador = new Map(precios.map((p) => [p.jugador_id, p]));

  const iniciales = (entradas ?? []).map((e) => {
    const j = infoJugador.get(e.jugador_id as number);
    const p = precioPorJugador.get(e.jugador_id as number);
    return {
      id: e.id as number,
      jugador_id: e.jugador_id as number,
      nombre: j?.nombre ?? "—",
      posicion: j?.posicion ?? null,
      equipo: j?.equipo ?? null,
      foto: j?.foto ?? null,
      escudo: j?.escudo ?? null,
      valor: p?.valor ?? null,
      tendencia: p?.tendencia ?? null,
      aceleracion_estado: p?.aceleracion_estado ?? null,
      estado: j?.estado ?? null,
      jerarquia: j?.jerarquia ?? null,
      probabilidad: j?.probabilidad ?? null,
      lesion: j?.lesion ?? null,
    };
  });

  return (
    <MercadoManager
      ligaId={ligaId}
      ligaNombre={liga?.nombre ?? "tu liga"}
      resetHora={resetHora}
      activeDate={activeDate}
      selectedFecha={selectedFecha}
      fechas={fechas}
      isEditable={esAdmin && selectedFecha === activeDate}
      iniciales={iniciales}
      debug={{
        ligaError: ligaError?.message ?? null,
        entradasError: entradasError?.message ?? null,
        nEntradas: (entradas ?? []).length,
      }}
    />
  );
}