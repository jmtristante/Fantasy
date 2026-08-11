"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { createBrowserClient } from "@/lib/supabase/client";
import { formatValor } from "@/lib/format";
import { LIGA_COOKIE } from "@/lib/liga-consts";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TitularidadBadge, type CardJugador } from "@/components/jugador-card";

type DetalleJugador = {
  nombre: string;
  slug: string | null;
  posicion: string | null;
  posiciones_juego: Record<string, string> | null;
  edad: number | null;
  nacionalidad: string | null;
  pie: string | null;
  altura: number | null;
  foto_url: string | null;
  jerarquia: string | null;
  lesion: string | null;
  estado: string | null;
  probabilidad: number | null;
  equipo: { nombre: string; escudo_url: string } | null;
  precio: {
    valor: number | null;
    valor_anterior: number | null;
    diferencia: number | null;
    diferencia_pct: number | null;
    tendencia: number | null;
    aceleracion: number | null;
    fecha: string | null;
  } | null;
  historial: { fecha: string; valor: number }[];
};

const ESTADOS_LEGIBLES: Record<string, string> = {
  "0": "Sin confirmar",
  "1": "Titular",
  "2": "Suplente",
  "3": "Sancionado",
  "4": "Lesionado",
  "5": "Duda",
};

type EventoTimeline = {
  fecha: string;
  tipo: "compra" | "venta" | "clausula" | "mercado" | "ajuste";
  titulo: string;
  detalle: string;
  importe: number | null;
};

const TIPO_MOVIMIENTO: Record<string, { etiqueta: string; tipo: EventoTimeline["tipo"] }> = {
  compra_mercado: { etiqueta: "Comprado", tipo: "compra" },
  venta_mercado: { etiqueta: "Vendido", tipo: "venta" },
  clausula: { etiqueta: "Cláusula activada", tipo: "clausula" },
  subida_clausula: { etiqueta: "Subida de cláusula", tipo: "clausula" },
  blindaje: { etiqueta: "Blindaje", tipo: "clausula" },
  ajuste: { etiqueta: "Ajuste", tipo: "ajuste" },
  pago_jornada: { etiqueta: "Pago de jornada", tipo: "ajuste" },
  entrada: { etiqueta: "Entrada al dinero", tipo: "ajuste" },
  salida: { etiqueta: "Salida de dinero", tipo: "ajuste" },
};

function leerLigaActiva(): number | null {
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${LIGA_COOKIE}=`));
  if (!match) return null;
  const id = Number(match.split("=")[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function formatFechaCorta(fecha: string): string {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return fecha;
  return d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}

function formatFechaDia(fecha: string): string {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString("es-ES", { dateStyle: "short" });
}

function diaDe(fecha: string): string {
  return fecha.slice(0, 10);
}

function formatEje(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

const RANGOS_PRECIOS: { valor: "todo" | 30 | 10 | 5; etiqueta: string }[] = [
  { valor: "todo", etiqueta: "Todos" },
  { valor: 30, etiqueta: "Último mes" },
  { valor: 10, etiqueta: "Últimos 10 días" },
  { valor: 5, etiqueta: "Últimos 5 días" },
];

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/50 py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{etiqueta}</span>
      <span className="text-sm font-medium tabular-nums">{valor}</span>
    </div>
  );
}

const ICONOS_TIMELINE: Record<
  EventoTimeline["tipo"],
  { icon: React.ElementType; clase: string }
> = {
  compra: { icon: ArrowDownToLine, clase: "bg-emerald-600/15 text-emerald-600" },
  venta: { icon: ArrowUpFromLine, clase: "bg-red-600/15 text-red-600" },
  clausula: { icon: Lock, clase: "bg-primary/10 text-primary" },
  mercado: { icon: Store, clase: "bg-sky-600/15 text-sky-600" },
  ajuste: { icon: SlidersHorizontal, clase: "bg-muted text-muted-foreground" },
};

function TimelineItem({ evento }: { evento: EventoTimeline }) {
  const meta = ICONOS_TIMELINE[evento.tipo];
  const Icon = meta.icon;
  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      <span
        className={`relative z-10 mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${meta.clase}`}
      >
        <Icon className="size-2.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-1">
          <p className="text-sm font-semibold">{evento.titulo}</p>
          <span className="text-[11px] text-muted-foreground">
            {formatFechaCorta(evento.fecha)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {evento.detalle}
          {evento.importe != null
            ? `${evento.detalle ? " · " : ""}${formatValor(evento.importe)} €`
            : ""}
        </p>
      </div>
    </div>
  );
}

export function JugadorDetalleSheet({
  jugador,
  open,
  onOpenChange,
}: {
  jugador: CardJugador;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [d, setD] = useState<DetalleJugador | null>(null);
  const [timeline, setTimeline] = useState<EventoTimeline[]>([]);
  const [hayLiga, setHayLiga] = useState<boolean | null>(null);
  const [rangoPrecios, setRangoPrecios] = useState<"todo" | 30 | 10 | 5>("todo");
  const [nowMs] = useState(() => Date.now());
  const [tabActiva, setTabActiva] = useState<"economica" | "datos">("economica");

  useEffect(() => {
    if (!open) return;
    let activo = true;
    (async () => {
      const supabase = createBrowserClient();
      const [jugadorRes, precioRes, historialRes] = await Promise.all([
        supabase
          .from("jugadores")
          .select(
            "jugador_id, nombre, slug, posicion, posiciones_juego, edad, nacionalidad, pie, altura, foto_url, jerarquia, lesion, estado, probabilidad, equipos(nombre, escudo_url)",
          )
          .eq("jugador_id", jugador.jugador_id)
          .maybeSingle(),
        supabase
          .from("v_precio_actual")
          .select(
            "valor, valor_anterior, diferencia, diferencia_pct, tendencia, aceleracion, fecha",
          )
          .eq("jugador_id", jugador.jugador_id)
          .maybeSingle(),
        supabase
          .from("precios_diarios")
          .select("fecha, valor")
          .eq("jugador_id", jugador.jugador_id)
          .order("fecha", { ascending: false })
          .limit(500),
      ]);
      if (!activo) return;

      const eq = jugadorRes.data?.equipos as
        | { nombre: string; escudo_url: string }
        | { nombre: string; escudo_url: string }[]
        | null;
      const equipo = Array.isArray(eq) ? (eq[0] ?? null) : (eq ?? null);

      setD({
        nombre: (jugadorRes.data?.nombre as string) || jugador.nombre,
        slug: (jugadorRes.data?.slug as string | null) ?? null,
        posicion: (jugadorRes.data?.posicion as string | null) ?? jugador.posicion,
        posiciones_juego: (jugadorRes.data?.posiciones_juego as Record<string, string> | null) ?? null,
        edad: (jugadorRes.data?.edad as number | null) ?? null,
        nacionalidad: (jugadorRes.data?.nacionalidad as string | null) ?? null,
        pie: (jugadorRes.data?.pie as string | null) ?? null,
        altura: (jugadorRes.data?.altura as number | null) ?? null,
        foto_url: (jugadorRes.data?.foto_url as string | null) || jugador.foto,
        jerarquia: (jugadorRes.data?.jerarquia as string | null) ?? null,
        lesion: (jugadorRes.data?.lesion as string | null) ?? null,
        estado: (jugadorRes.data?.estado as string | null) ?? null,
        probabilidad: (jugadorRes.data?.probabilidad as number | null) ?? null,
        equipo: equipo ?? (jugador.equipo ? { nombre: jugador.equipo, escudo_url: jugador.escudo ?? "" } : null),
        precio: precioRes.data
          ? {
              valor: (precioRes.data.valor as number | null) ?? jugador.valor,
              valor_anterior: (precioRes.data.valor_anterior as number | null) ?? null,
              diferencia: (precioRes.data.diferencia as number | null) ?? null,
              diferencia_pct: (precioRes.data.diferencia_pct as number | null) ?? null,
              tendencia: (precioRes.data.tendencia as number | null) ?? jugador.tendencia,
              aceleracion: (precioRes.data.aceleracion as number | null) ?? null,
              fecha: (precioRes.data.fecha as string | null) ?? null,
            }
          : jugador.valor != null
            ? {
                valor: jugador.valor,
                valor_anterior: null,
                diferencia: null,
                diferencia_pct: null,
                tendencia: jugador.tendencia,
                aceleracion: null,
                fecha: null,
              }
            : null,
        historial: (historialRes.data ?? []).map((h) => ({
          fecha: h.fecha as string,
          valor: h.valor as number,
        })),
      });

      const ligaSel = leerLigaActiva();
      if (activo) setHayLiga(ligaSel != null);
      if (ligaSel != null) {
        const [movRes, miembrosRes, mercadoRes] = await Promise.all([
          supabase
            .schema("liga")
            .from("movimientos")
            .select(
              "id, fecha, tipo, importe, miembro_id, contraparte",
            )
            .eq("jugador_id", jugador.jugador_id)
            .eq("liga_id", ligaSel),
          supabase
            .schema("liga")
            .from("miembros")
            .select("id, nombre")
            .eq("liga_id", ligaSel),
          supabase
            .schema("liga")
            .from("v_market_historial")
            .select("fecha, creado")
            .eq("jugador_id", jugador.jugador_id)
            .eq("liga_id", ligaSel),
        ]);
        if (activo) {
          const miembros = new Map<number, string>(
            (miembrosRes.data ?? []).map((m) => [
              m.id as number,
              (m.nombre as string) ?? "",
            ]),
          );
          const historialPrecios = (historialRes.data ?? [])
            .map((h) => ({
              fecha: new Date(h.fecha as string).getTime(),
              valor: h.valor as number,
            }))
            .sort((a, b) => a.fecha - b.fecha);
          const precioEn = (fechaRaw: string): number | null => {
            const t = new Date(fechaRaw).getTime();
            if (isNaN(t)) return null;
            let mejor: number | null = null;
            for (const p of historialPrecios) {
              if (p.fecha <= t) {
                mejor = p.valor;
              } else if (p.fecha - t > 0) {
                break;
              }
            }
            return mejor;
          };
          const eventos: EventoTimeline[] = [];

          for (const m of mercadoRes.data ?? []) {
            const fecha = (m.creado as string) ?? (m.fecha as string) ?? "";
            eventos.push({
              fecha,
              tipo: "mercado",
              titulo: "Salió al mercado",
              detalle: "",
              importe: precioEn(fecha),
            });
          }

          for (const mv of movRes.data ?? []) {
            const info = TIPO_MOVIMIENTO[mv.tipo as string];
            if (!info) continue;
            const nombre = miembros.get(mv.miembro_id as number) ?? "";
            eventos.push({
              fecha: (mv.fecha as string) ?? "",
              tipo: info.tipo,
              titulo: info.etiqueta,
              detalle: nombre ? `Miembro: ${nombre}` : "",
              importe: (mv.importe as number) ?? null,
            });
          }

          eventos.sort(
            (a, b) =>
              new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
          );
          setTimeline(eventos);
        }
      } else {
        setTimeline([]);
      }
    })();
    return () => {
      activo = false;
    };
  }, [open, jugador.jugador_id, jugador]);

  const precio = d?.precio;
  const sube = (precio?.diferencia ?? 0) > 0;
  const baja = (precio?.diferencia ?? 0) < 0;
  const lesiones = (d?.lesion ?? "").toLowerCase() === "lesionado";
  const duda = (d?.lesion ?? "").toLowerCase() === "duda";

  const historialOrdenado = [...(d?.historial ?? [])]
    .reduce<{ fecha: string; valor: number }[]>((acc, h) => {
      const dia = diaDe(h.fecha);
      if (acc.some((a) => diaDe(a.fecha) === dia)) return acc;
      acc.push(h);
      return acc;
    }, [])
    .map((h) => ({ ...h, label: formatFechaDia(h.fecha) }))
    .reverse();
  const historialFiltrado =
    rangoPrecios === "todo"
      ? historialOrdenado
      : historialOrdenado.filter((h) => {
          const dif =
            (nowMs - new Date(h.fecha).getTime()) / (1000 * 60 * 60 * 24);
          return dif <= rangoPrecios;
        });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="center" className="overflow-y-auto data-[side=center]:max-w-[1200px]">
        <SheetHeader>
          <SheetTitle>Detalle del jugador</SheetTitle>
          <SheetDescription>
            Datos y valor de mercado de {d?.nombre ?? jugador.nombre}.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted">
              {d?.foto_url ? (
                <img src={d.foto_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-semibold">
                  {jugador.nombre.slice(0, 2).toUpperCase()}
                </div>
              )}
              {d?.equipo?.escudo_url && (
                <img
                  src={d.equipo.escudo_url}
                  alt=""
                  className="absolute bottom-0.5 right-0.5 size-6 rounded object-contain"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{d?.nombre ?? jugador.nombre}</p>
              <p className="text-sm text-muted-foreground">
                {d?.posicion ?? "—"}
                {d?.equipo?.nombre ? ` · ${d.equipo.nombre}` : ""}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <TitularidadBadge
                  estado={d?.estado}
                  jerarquia={d?.jerarquia}
                  probabilidad={d?.probabilidad}
                />
                {lesiones && (
                  <span className="rounded-full bg-red-600/10 px-2 py-0.5 text-[11px] font-medium text-red-600">
                    Lesionado
                  </span>
                )}
                {duda && (
                  <span className="rounded-full bg-amber-600/10 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                    Duda
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-1 rounded-lg border bg-muted p-1">
            <Button
              size="sm"
              variant={tabActiva === "economica" ? "default" : "ghost"}
              onClick={() => setTabActiva("economica")}
            >
              Económica
            </Button>
            <Button
              size="sm"
              variant={tabActiva === "datos" ? "default" : "ghost"}
              onClick={() => setTabActiva("datos")}
            >
              Datos
            </Button>
          </div>

          {tabActiva === "economica" ? (
            <div className="flex flex-col gap-4">
              {precio && (
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Valor de mercado</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatValor(precio.valor)}
                    <span className="ml-2 align-middle text-sm font-medium">€</span>
                  </p>
                  {precio.diferencia != null && (
                    <p
                      className={`mt-1 text-sm font-semibold tabular-nums ${
                        sube ? "text-emerald-600" : baja ? "text-red-600" : "text-muted-foreground"
                      }`}
                    >
                      {sube ? "▲" : baja ? "▼" : "±"} {formatValor(Math.abs(precio.diferencia))}
                      {precio.diferencia_pct != null
                        ? ` (${precio.diferencia_pct > 0 ? "+" : ""}${precio.diferencia_pct.toFixed(2)}%)`
                        : ""}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {precio.valor_anterior != null && (
                      <span>Ant.: {formatValor(precio.valor_anterior)}</span>
                    )}
                    {precio.tendencia != null && (
                      <span>Tendencia: {precio.tendencia}</span>
                    )}
                    {precio.aceleracion != null && (
                      <span>Aceleración: {formatValor(precio.aceleracion)}</span>
                    )}
                    {precio.fecha && (
                      <span>Actualizado: {new Date(precio.fecha).toLocaleString("es-ES")}</span>
                    )}
                  </div>
                </div>
              )}

              {historialOrdenado.length ? (
                <div className="rounded-xl border bg-card p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Evolución del valor
                    </p>
                    <div className="flex gap-1">
                      {RANGOS_PRECIOS.map((r) => (
                        <Button
                          key={r.valor}
                          size="sm"
                          variant={rangoPrecios === r.valor ? "secondary" : "ghost"}
                          onClick={() => setRangoPrecios(r.valor)}
                        >
                          {r.etiqueta}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={historialFiltrado}
                        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="fillValor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={20}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          tickLine={false}
                          axisLine={false}
                          width={70}
                          tickFormatter={formatEje}
                          domain={["auto", "auto"]}
                        />
                        <Tooltip
                          formatter={(v) => [formatValor(Number(v)), "Valor"]}
                          labelFormatter={(l) => `Fecha: ${l}`}
                          contentStyle={{
                            background: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="valor"
                          stroke="var(--primary)"
                          strokeWidth={2}
                          fill="url(#fillValor)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border bg-card p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Datos personales</p>
                <Campo etiqueta="Edad" valor={d?.edad != null ? `${d.edad} años` : "—"} />
                <Campo
                  etiqueta="Nacionalidad"
                  valor={d?.nacionalidad ? d.nacionalidad.toUpperCase() : "—"}
                />
                <Campo etiqueta="Pie" valor={d?.pie ? d.pie : "—"} />
                <Campo etiqueta="Altura" valor={d?.altura != null ? `${(d.altura / 100).toFixed(2)} m` : "—"} />
                <Campo etiqueta="Estado" valor={d?.estado ? (ESTADOS_LEGIBLES[d.estado] ?? d.estado) : "—"} />
                {d?.probabilidad != null && (
                  <Campo etiqueta="Prob. de jugar" valor={`${d.probabilidad}%`} />
                )}
                {d?.posiciones_juego && (
                  <Campo
                    etiqueta="Posiciones"
                    valor={Object.values(d.posiciones_juego).find(Boolean) || "—"}
                  />
                )}
              </div>

              {timeline.length ? (
                <div className="rounded-xl border bg-card p-3">
                  <p className="mb-3 text-xs font-medium text-muted-foreground">
                    Timeline del jugador
                  </p>
                  <div className="relative flex flex-col gap-0">
                    <div className="absolute bottom-0 left-[7px] top-0 w-px bg-border" />
                    {timeline.map((e, i) => (
                      <TimelineItem key={`${e.fecha}-${i}`} evento={e} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">
                    {hayLiga === false
                      ? "Selecciona una liga para ver el timeline del jugador."
                      : "Sin movimientos registrados en tu liga."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
