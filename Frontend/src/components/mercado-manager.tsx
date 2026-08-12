"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JugadorCard, type CardJugador } from "@/components/jugador-card";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatResetHora } from "@/lib/market";

const LIMITE_FILA = 12;

export function MercadoManager({
  ligaId,
  ligaNombre,
  resetHora,
  activeDate,
  selectedFecha,
  isEditable,
  iniciales,
  debug,
}: {
  ligaId: number;
  ligaNombre: string;
  resetHora: string | null;
  activeDate: string;
  selectedFecha: string;
  isEditable: boolean;
  iniciales: CardJugador[];
  debug?: { ligaError: string | null; entradasError: string | null; nEntradas: number };
}) {
  const router = useRouter();
  const [lista, setLista] = useState<CardJugador[]>(iniciales);
  const [catalogo, setCatalogo] = useState<CardJugador[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [limite, setLimite] = useState(LIMITE_FILA);
  const [removiendo, setRemoviendo] = useState<number | null>(null);
  const idTemp = useRef(0);

  const [prevIniciales, setPrevIniciales] = useState(iniciales);
  if (iniciales !== prevIniciales) {
    setPrevIniciales(iniciales);
    setLimite(LIMITE_FILA);
    setLista(iniciales);
  }

  useEffect(() => {
    let activo = true;
    (async () => {
      const supabase = createBrowserClient();
      const [jugadores, precios] = await Promise.all([
        supabase
          .from("jugadores")
          .select(
            "jugador_id, nombre, posicion, foto_url, nacionalidad, estado, jerarquia, probabilidad, lesion, equipos(nombre, escudo_url)",
          )
          .order("nombre"),
        supabase.from("v_precio_actual").select("jugador_id, valor, tendencia, aceleracion_estado"),
      ]);
      if (!activo) return;
      const precioPorJugador = new Map(
        (precios.data ?? []).map((p) => [
          p.jugador_id as number,
          {
            valor: p.valor as number | null,
            tendencia: p.tendencia as number | null,
            aceleracion_estado: (p.aceleracion_estado as string | null) ?? null,
          },
        ]),
      );
      const catalog: CardJugador[] = (jugadores.data ?? []).map((j) => {
        const eq = j.equipos as
          | { nombre: string; escudo_url: string }
          | { nombre: string; escudo_url: string }[]
          | null;
        const e = Array.isArray(eq) ? eq[0] : eq;
        const p = precioPorJugador.get(j.jugador_id as number);
        return {
          id: 0,
          jugador_id: j.jugador_id as number,
          nombre: j.nombre as string,
          posicion: (j.posicion as string | null) ?? null,
          equipo: e?.nombre ?? null,
          nacionalidad: (j.nacionalidad as string | null) ?? null,
          foto: (j.foto_url as string) || null,
          escudo: (e?.escudo_url as string | undefined) ?? null,
          valor: p?.valor ?? null,
          tendencia: p?.tendencia ?? null,
          aceleracion_estado: p?.aceleracion_estado ?? null,
          estado: (j.estado as string | null) ?? null,
          jerarquia: (j.jerarquia as string | null) ?? null,
          probabilidad: (j.probabilidad as number | null) ?? null,
          lesion: (j.lesion as string | null) ?? null,
        };
      });
      setCatalogo(catalog);
    })();
    return () => {
      activo = false;
    };
  }, []);

  const idsEnMercado = useMemo(
    () => new Set(lista.map((e) => e.jugador_id)),
    [lista],
  );

  const disponibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base = (catalogo ?? [])
      .filter((c) => !idsEnMercado.has(c.jugador_id))
      .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));
    if (!q) return base;
    return base.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.equipo?.toLowerCase().includes(q) ?? false) ||
        (c.posicion?.toLowerCase().includes(q) ?? false),
    );
  }, [catalogo, idsEnMercado, busqueda]);

  async function anadir(c: CardJugador) {
    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .schema("liga")
      .from("market_entradas")
      .insert({
        liga_id: ligaId,
        fecha: activeDate,
        jugador_id: c.jugador_id,
        creado_por: user?.email ?? null,
      })
      .select("id");
    if (error) {
      toast.error(`No se pudo añadir a ${c.nombre}`);
      return;
    }
    const nuevoId = (data?.[0]?.id as number | undefined) ?? (idTemp.current -= 1);
    setLista((prev) => [
      ...prev,
      { ...c, id: nuevoId },
    ]);
    toast.success(`${c.nombre} añadido al mercado`);
    router.refresh();
  }

  async function quitar(id: number, nombre: string) {
    setRemoviendo(id);
    setLista((prev) => prev.filter((e) => e.id !== id));
    const supabase = createBrowserClient();
    const { error } = await supabase.schema("liga").from("market_entradas").delete().eq("id", id);
    setRemoviendo(null);
    if (error) {
      toast.error(`No se pudo quitar a ${nombre}`);
      router.refresh();
      return;
    }
    toast.success(`${nombre} quitado del mercado`);
    router.refresh();
  }

  const verMas = () => setLimite((n) => n + LIMITE_FILA);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mercado</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
            <span className="font-medium text-foreground">{ligaNombre}</span>
            <span>Reinicio: {formatResetHora(resetHora)}</span>
            <span>Ciclo actual: {activeDate}</span>
          </p>
        </div>
        <Badge variant="outline">
          {lista.length} {lista.length === 1 ? "jugador" : "jugadores"}
        </Badge>
      </div>

      {debug &&
        (debug.ligaError || debug.entradasError || debug.nEntradas !== iniciales.length ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            <p className="font-medium">Diagnóstico</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>activeDate: {activeDate}</li>
              <li>selectedFecha: {selectedFecha}</li>
              <li>resetHora: {resetHora ?? "—"}</li>
              <li>nEntradas (server): {debug.nEntradas}</li>
              <li>ligaError: {debug.ligaError ?? "ninguno"}</li>
              <li>entradasError: {debug.entradasError ?? "ninguno"}</li>
            </ul>
          </div>
        ) : null)}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              Mercado
            </CardTitle>
            <CardDescription>
              Elige un día para ver su mercado. El día actual está marcado.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={selectedFecha}
              onChange={(e) => {
                if (!e.target.value) return;
                setBusqueda("");
                router.push(`/mercado?fecha=${e.target.value}`);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            />
          </div>

          {lista.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isEditable
                ? `El mercado de hoy (${selectedFecha}) está vacío. Añade jugadores más abajo.`
                : `No hay jugadores en el mercado de ${selectedFecha}.`}
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {lista.map((e) => (
                <JugadorCard
                  key={e.id}
                  jugador={e}
                  deshabilitado={removiendo === e.id}
                  onRemove={
                    isEditable
                      ? () => quitar(e.id, e.nombre)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isEditable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-4" />
              Añadir jugadores
            </CardTitle>
            <CardDescription>
              Busca y añade al mercado de hoy. Fila con los que más valen; usa
              &quot;ver más&quot; o el buscador para el resto.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="relative max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, equipo o posición..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8"
              />
            </div>
            {busqueda.trim().length < 3 ? (
              <p className="text-sm text-muted-foreground">
                Escribe al menos 3 letras para ver resultados.
              </p>
            ) : disponibles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {catalogo === null
                  ? "Cargando jugadores..."
                  : "No hay jugadores que coincidan (o ya están todos en el mercado)."}
              </p>
            ) : (
              <>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {disponibles.slice(0, limite).map((c) => (
                    <JugadorCard key={c.jugador_id} jugador={c} onAdd={() => anadir(c)} />
                  ))}
                </div>
                {disponibles.length > limite && (
                  <div>
                    <Button variant="outline" size="sm" onClick={verMas}>
                      Ver más ({disponibles.length - limite} restantes)
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}