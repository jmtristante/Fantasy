"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JugadorCard, type CardJugador } from "@/components/jugador-card";
import { createBrowserClient } from "@/lib/supabase/client";

type EntradaPlantilla = {
  miembro_id: number;
  miembro: string;
  jugador_id: number;
  nombre: string;
  posicion: string | null;
  equipo: string | null;
  foto: string | null;
  escudo: string | null;
  valor: number | null;
  clausula: number | null;
  tendencia: number | null;
  aceleracion_estado?: string | null;
  bloqueado: boolean;
  bloqueadoHasta: string | null;
  estado?: string | null;
  jerarquia?: string | null;
  probabilidad?: number | null;
  lesion?: string | null;
};

export function PlantillasManager({
  ligaId,
  ligaNombre,
  esAdmin,
  miembros,
  iniciales,
}: {
  ligaId: number;
  ligaNombre: string;
  esAdmin: boolean;
  miembros: { id: number; nombre: string }[];
  iniciales: EntradaPlantilla[];
}) {
  const router = useRouter();
  const [plantilla, setPlantilla] = useState<EntradaPlantilla[]>(iniciales);
  const [catalogo, setCatalogo] = useState<CardJugador[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [clausulas, setClausulas] = useState<Record<number, string>>({});
  const [asignando, setAsignando] = useState<number | null>(null);
  const [quitando, setQuitando] = useState<number | null>(null);

  const [prevIniciales, setPrevIniciales] = useState(iniciales);
  if (iniciales !== prevIniciales) {
    setPrevIniciales(iniciales);
    setPlantilla(iniciales);
  }

  const [seleccionado, setSeleccionado] = useState<number | null>(miembros[0]?.id ?? null);

  useEffect(() => {
    let activo = true;
    (async () => {
      const supabase = createBrowserClient();
      const [jugadores, precios] = await Promise.all([
        supabase
          .from("jugadores")
          .select(
            "jugador_id, nombre, posicion, foto_url, estado, jerarquia, probabilidad, lesion, equipos(nombre, escudo_url)",
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

  const enPlantilla = useMemo(() => new Set(plantilla.map((e) => e.jugador_id)), [plantilla]);

  const disponibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base = (catalogo ?? [])
      .filter((c) => !enPlantilla.has(c.jugador_id))
      .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));
    if (q.length < 3) return [];
    return base.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.equipo?.toLowerCase().includes(q) ?? false) ||
        (c.posicion?.toLowerCase().includes(q) ?? false),
    );
  }, [catalogo, enPlantilla, busqueda]);

  const squadMiembro = useMemo(
    () => plantilla.filter((e) => e.miembro_id === seleccionado),
    [plantilla, seleccionado],
  );

  async function asignar(c: CardJugador) {
    if (seleccionado == null) return;
    const miembro = miembros.find((m) => m.id === seleccionado);
    const clausula = Number(clausulas[c.jugador_id] ?? c.valor ?? 0);
    setAsignando(c.jugador_id);
    const supabase = createBrowserClient();
    const { error: errorP } = await supabase.schema("liga").from("plantillas").insert({
      liga_id: ligaId,
      miembro_id: seleccionado,
      jugador_id: c.jugador_id,
    });
    if (errorP) {
      setAsignando(null);
      toast.error(`No se pudo asignar a ${c.nombre}: ${errorP.message}`);
      return;
    }
    const { error: errorC } = await supabase.schema("liga").from("clausulas_historial").insert({
      liga_id: ligaId,
      jugador_id: c.jugador_id,
      miembro_id: seleccionado,
      valor: clausula,
      motivo: "draft_inicial",
    });
    setAsignando(null);
    if (errorC) {
      toast.error(`Asignado, pero no se pudo registrar la cláusula de ${c.nombre}`);
    } else {
      toast.success(`${c.nombre} asignado a ${miembro?.nombre ?? "la plantilla"}`);
    }
    setPlantilla((prev) => [
      ...prev,
      {
        miembro_id: seleccionado,
        miembro: miembro?.nombre ?? "",
        jugador_id: c.jugador_id,
        nombre: c.nombre,
        posicion: c.posicion,
        equipo: c.equipo,
        foto: c.foto,
        escudo: c.escudo,
        valor: c.valor,
        clausula: clausula,
        tendencia: c.tendencia,
        aceleracion_estado: c.aceleracion_estado,
        bloqueado: false,
        bloqueadoHasta: null,
        estado: c.estado,
        jerarquia: c.jerarquia,
        probabilidad: c.probabilidad,
        lesion: c.lesion,
      },
    ]);
    router.refresh();
  }

  async function quitar(e: EntradaPlantilla) {
    setQuitando(e.jugador_id);
    setPlantilla((prev) => prev.filter((p) => p.jugador_id !== e.jugador_id));
    const supabase = createBrowserClient();
    const { error: errorP } = await supabase
      .schema("liga")
      .from("plantillas")
      .delete()
      .eq("liga_id", ligaId)
      .eq("jugador_id", e.jugador_id);
    const { error: errorC } = await supabase
      .schema("liga")
      .from("clausulas_historial")
      .delete()
      .eq("liga_id", ligaId)
      .eq("jugador_id", e.jugador_id)
      .eq("motivo", "draft_inicial");
    setQuitando(null);
    if (errorP || errorC) {
      toast.error(`No se pudo quitar a ${e.nombre}`);
      router.refresh();
      return;
    }
    toast.success(`${e.nombre} quitado de la plantilla`);
    router.refresh();
  }

  if (miembros.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plantillas</h1>
          <p className="text-muted-foreground">{ligaNombre}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sin miembros</CardTitle>
            <CardDescription>
              Añade a los participantes de la liga antes de asignarles su
              plantilla inicial.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/miembros" className={buttonVariants({ size: "sm" })}>
              Añadir miembros
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plantillas</h1>
        <p className="text-muted-foreground">
          Plantilla inicial de cada miembro de <span className="font-medium text-foreground">{ligaNombre}</span>.
          {esAdmin && " Tú asignas los jugadores y su cláusula al ficharlos."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {miembros.map((m) => {
          const n = plantilla.filter((e) => e.miembro_id === m.id).length;
          return (
            <Button
              key={m.id}
              size="sm"
              variant={seleccionado === m.id ? "default" : "outline"}
              onClick={() => setSeleccionado(m.id)}
            >
              {m.nombre}
              <span className="ml-1.5 text-xs opacity-80">({n})</span>
            </Button>
          );
        })}
        {esAdmin && <div className="ml-auto" />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {miembros.find((m) => m.id === seleccionado)?.nombre ?? "Miembro"}
            <Badge variant="secondary">{squadMiembro.length}</Badge>
          </CardTitle>
          <CardDescription>
            Plantilla inicial.{" "}
            {esAdmin
              ? "Puedes quitar jugadores mientras sea la inicial."
              : "Solo lectura."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {squadMiembro.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {esAdmin
                ? "Todavía no tiene jugadores. Asígnalos desde abajo."
                : "Este miembro no tiene jugadores."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {squadMiembro.map((e) => (
                <JugadorCard
                  key={e.jugador_id}
                  jugador={{
                    id: e.jugador_id,
                    jugador_id: e.jugador_id,
                    nombre: e.nombre,
                    posicion: e.posicion,
                    equipo: e.equipo,
                    foto: e.foto,
                    escudo: e.escudo,
                    valor: e.valor,
                    clausula: e.clausula,
                    tendencia: e.tendencia,
                    aceleracion_estado: e.aceleracion_estado,
                    estado: e.estado,
                    jerarquia: e.jerarquia,
                    probabilidad: e.probabilidad,
                    lesion: e.lesion,
                  }}
                  bloqueado={e.bloqueado}
                  bloqueadoHasta={e.bloqueadoHasta}
                  deshabilitado={quitando === e.jugador_id}
                  onRemove={esAdmin ? () => quitar(e) : undefined}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {esAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Añadir jugadores a la plantilla</CardTitle>
            <CardDescription>
              Busca (mínimo 3 letras) y asigna a{" "}
              {miembros.find((m) => m.id === seleccionado)?.nombre ?? "este miembro"}. Indica la
              cláusula bajo cada jugador.
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
                  : "No hay jugadores que coincidan (o ya están todos asignados)."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {disponibles.map((c) => (
                  <div key={c.jugador_id} className="flex w-32 flex-col gap-1.5">
                    <JugadorCard
                      jugador={c}
                      deshabilitado={asignando === c.jugador_id}
                      onAdd={() => asignar(c)}
                    />
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      placeholder="Cláusula"
                      aria-label={`Cláusula para ${c.nombre}`}
                      value={clausulas[c.jugador_id] ?? c.valor ?? ""}
                      onChange={(ev) =>
                        setClausulas((prev) => ({ ...prev, [c.jugador_id]: ev.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}