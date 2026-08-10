import { createClient } from "@/lib/supabase/server";
import { JugadoresGrid } from "@/components/jugadores-grid";
import type { CardJugador } from "@/components/jugador-card";

export const dynamic = "force-dynamic";

export default async function JugadoresPage() {
  const supabase = await createClient();

  const [{ data: jugadores }, { data: precios }] = await Promise.all([
    supabase
      .from("jugadores")
      .select(
        "jugador_id, nombre, posicion, edad, foto_url, estado, jerarquia, probabilidad, lesion, equipos(nombre, escudo_url)",
      )
      .order("nombre"),
    supabase
      .from("v_precio_actual")
      .select("jugador_id, valor, diferencia_pct, tendencia, aceleracion_estado"),
  ]);

  const precioPorJugador = new Map(
    (precios ?? []).map((p) => [
      p.jugador_id,
      {
        valor: p.valor as number | null,
        tendencia: p.tendencia as number | null,
        aceleracion_estado: (p.aceleracion_estado as string | null) ?? null,
      },
    ]),
  );

  const filas: CardJugador[] = (jugadores ?? []).map((j) => {
    const p = precioPorJugador.get(j.jugador_id as number);
    const embebido = j.equipos as
      | { nombre: string; escudo_url: string }[]
      | { nombre: string; escudo_url: string }
      | null;
    const equipo = Array.isArray(embebido)
      ? (embebido[0]?.nombre ?? null)
      : (embebido?.nombre ?? null);
    const escudo = Array.isArray(embebido)
      ? (embebido[0]?.escudo_url ?? null)
      : (embebido?.escudo_url ?? null);
    return {
      id: j.jugador_id as number,
      jugador_id: j.jugador_id as number,
      nombre: j.nombre as string,
      posicion: (j.posicion as string | null) ?? null,
      equipo,
      escudo,
      foto: (j.foto_url as string) || null,
      valor: p?.valor ?? null,
      tendencia: p?.tendencia ?? null,
      aceleracion_estado: p?.aceleracion_estado ?? null,
      estado: (j.estado as string | null) ?? null,
      jerarquia: (j.jerarquia as string | null) ?? null,
      probabilidad: (j.probabilidad as number | null) ?? null,
      lesion: (j.lesion as string | null) ?? null,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Jugadores</h1>
        <p className="text-muted-foreground">
          Todos los jugadores de LaLiga con su último valor de mercado.
        </p>
      </div>
      <JugadoresGrid filas={filas} />
    </div>
  );
}
