"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { CampoFutbol, type JugadorCampo } from "@/components/campo-futbol";

export type MiembroAlineaciones = {
  id: number;
  nombre: string;
};

export type JugadorPlantilla = {
  jugador_id: number;
  nombre: string;
  posicion: string | null;
  equipo: string | null;
  foto: string | null;
  escudo: string | null;
  clausula: number | null;
};

export type AlineacionGuardada = {
  miembro_id: number;
  jugador_id: number;
  jornada: number;
};

const PLANTA = 11;
const ROL_ORDEN = ["Delantero", "Mediocampista", "Defensa", "Portero"];
// Orden de mostrar en listas/grids: de portero a delantero.
const ROL_LISTA = ["Portero", "Defensa", "Mediocampista", "Delantero"];

export function AlineacionesManager({
  ligaId,
  esAdmin,
  miembros,
  jornadas,
  jornadasPasadas = new Set<number>(),
  plantillas,
  alineaciones,
}: {
  ligaId: number;
  esAdmin: boolean;
  miembros: MiembroAlineaciones[];
  jornadas: number[];
  jornadasPasadas?: Set<number>;
  plantillas: Record<number, JugadorPlantilla[]>;
  alineaciones: AlineacionGuardada[];
}) {
  const [jornada, setJornada] = useState<number>(jornadas[0] ?? 1);
  const [miembroId, setMiembroId] = useState<number | null>(miembros[0]?.id ?? null);

  const seleccionGuardada = (m: number | null, j: number) =>
    new Set(
      alineaciones
        .filter((a) => a.miembro_id === m && a.jornada === j)
        .map((a) => a.jugador_id),
    );

  const tieneGuardado = (m: number | null, j: number) =>
    alineaciones.some((a) => a.miembro_id === m && a.jornada === j);

  const [seleccion, setSeleccion] = useState<Set<number>>(() =>
    seleccionGuardada(miembros[0]?.id ?? null, jornadas[0] ?? 1),
  );
  const [guardando, setGuardando] = useState(false);

  const miembro = useMemo(() => miembros.find((m) => m.id === miembroId) ?? null, [miembros, miembroId]);
  const plantillaMiembro = useMemo(
    () =>
      (miembroId != null ? plantillas[miembroId] ?? [] : []).slice().sort((a, b) => {
        const ra = ROL_LISTA.indexOf(a.posicion ?? "");
        const rb = ROL_LISTA.indexOf(b.posicion ?? "");
        return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
      }),
    [plantillas, miembroId],
  );

  const disponibles = useMemo(() => plantillaMiembro.filter((p) => !seleccion.has(p.jugador_id)), [plantillaMiembro, seleccion]);

  const titulares: JugadorCampo[] = useMemo(
    () =>
      plantillaMiembro
        .filter((p) => seleccion.has(p.jugador_id))
        .map((p) => ({
          jugador_id: p.jugador_id,
          nombre: p.nombre,
          posicion: p.posicion,
          foto: p.foto,
          escudo: p.escudo,
        })),
    [plantillaMiembro, seleccion],
  );

  function toggleJugador(jugador_id: number) {
    if (!esAdmin) return;
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(jugador_id)) next.delete(jugador_id);
      else next.add(jugador_id);
      return next;
    });
  }

  async function guardar() {
    if (miembroId == null) return;
    if (seleccion.size !== PLANTA) {
      toast.error(`La alineación debe tener exactamente ${PLANTA} jugadores.`);
      return;
    }
    setGuardando(true);
    const supabase = createBrowserClient();
    const { error: del } = await supabase
      .schema("liga")
      .from("liga_alineaciones")
      .delete()
      .eq("liga_id", ligaId)
      .eq("miembro_id", miembroId)
      .eq("jornada", jornada);
    if (!del) {
      const rows = Array.from(seleccion).map((jugador_id) => ({
        liga_id: ligaId,
        miembro_id: miembroId,
        jornada,
        jugador_id,
      }));
      const { error: ins } = await supabase
        .schema("liga")
        .from("liga_alineaciones")
        .insert(rows);
      if (!ins) {
        toast.success(`Alineación de ${miembro?.nombre ?? "miembro"} guardada.`);
      } else {
        toast.error(`No se pudo guardar: ${ins.message}`);
      }
    } else {
      toast.error(`No se pudo limpiar la alineación anterior: ${del.message}`);
    }
    setGuardando(false);
  }

  // Orden de jugadores elegidos: primero por rol para el campo
  const ordenados = useMemo(() => {
    return plantillaMiembro
      .filter((p) => seleccion.has(p.jugador_id))
      .slice()
      .sort((a, b) => {
        const ra = ROL_ORDEN.indexOf(a.posicion ?? "");
        const rb = ROL_ORDEN.indexOf(b.posicion ?? "");
        return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
      });
  }, [plantillaMiembro, seleccion]);

  if (miembros.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sin miembros</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay amigos en la liga. Añádelos desde la gestión de liga.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Selectores */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Jornada</span>
          <div className="flex flex-wrap gap-1.5">
            {jornadas.map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => {
                  setJornada(j);
                  setSeleccion(seleccionGuardada(miembroId, j));
                }}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-sm transition-colors hover:bg-muted",
                  j === jornada && "ring-2 ring-primary/50",
                  jornadasPasadas.has(j)
                    ? "border-emerald-400 text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10"
                    : "text-muted-foreground",
                )}
              >
                {j}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Amigo</span>
          <div className="flex flex-wrap gap-1.5">
            {miembros.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMiembroId(m.id);
                  setSeleccion(seleccionGuardada(m.id, jornada));
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors hover:bg-muted",
                  m.id === miembroId && "ring-2 ring-primary/50",
                  tieneGuardado(m.id, jornada)
                    ? "border-emerald-400 text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10"
                    : "text-muted-foreground",
                )}
              >
                {m.nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
        {esAdmin && (
        <Button
          size="sm"
          onClick={guardar}
          disabled={guardando}
        >
          {guardando && <Loader2 className="animate-spin" />}
          Guardar alineación
        </Button>
        )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Campo de fútbol */}
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-base">Once alineado</CardTitle>
          </CardHeader>
          <CardContent>
            <CampoFutbol titulares={ordenados} rendirse />
          </CardContent>
        </Card>

        {/* Selección de jugadores de la plantilla */}
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-base">
              Plantilla de {miembro?.nombre ?? ""} ({seleccion.size}/{PLANTA})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <div className="flex flex-wrap content-start gap-2 h-full overflow-y-auto pr-1">
              {plantillaMiembro.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Este amigo no tiene jugadores en plantilla.
                </p>
              )}
              {plantillaMiembro.map((p) => {
                const activo = seleccion.has(p.jugador_id);
                return (
                  <button
                    key={p.jugador_id}
                    type="button"
                    onClick={() => toggleJugador(p.jugador_id)}
                    className={`relative w-32 shrink-0 cursor-pointer flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition hover:shadow-md ${
                      activo ? "border-primary ring-2 ring-primary/40" : "border-border"
                    }`}
                  >
                    <div className="relative h-24 overflow-hidden bg-muted">
                      {p.foto ? (
                        <img src={p.foto} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                          {p.nombre.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {p.escudo && (
                        <img
                          src={p.escudo}
                          alt=""
                          className="absolute left-0.5 top-0.5 size-5 rounded object-contain bg-white/90 p-0.5 ring-1 ring-border"
                        />
                      )}
                      {activo && (
                        <span className="absolute right-0.5 top-0.5 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                          ON
                        </span>
                      )}
                    </div>
                    <div className="p-1.5">
                      <p className="truncate text-[11px] font-semibold leading-tight">{p.nombre}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{p.posicion ?? "—"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}