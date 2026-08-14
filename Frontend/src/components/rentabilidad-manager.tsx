"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MiembroAvatar } from "@/components/miembro-avatar";
import { formatValor } from "@/lib/format";
import { JugadorDetalleSheet } from "@/components/jugador-detalle";
import { IndicadorMovimientoBadge, type CardJugador } from "@/components/jugador-card";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type FilaJugador = {
  jugador_id: number;
  nombre: string;
  equipo: string | null;
  foto: string | null;
  escudo: string | null;
  fichaje: number;
  subidas: number;
  ventas: number;
  valor_actual: number | null;
  diferencia_diaria: number | null;
  diferencia_pct_diaria: number | null;
  tendencia: number | null;
  aceleracion_estado?: string | null;
  en_plantilla: boolean;
  invertido: number;
  devuelto: number;
  rentabilidad: number;
  miembro_id?: number | null;
  miembro_nombre?: string | null;
};

export type ResumenMiembro = {
  id: number;
  nombre: string;
  foto: string | null;
  filas: FilaJugador[];
  invertido: number;
  devuelto: number;
  rentabilidad: number;
  subida_hoy: number;
};

function pctTexto(invertido: number, rentabilidad: number): string | null {
  if (invertido <= 0) return null;
  const v = (rentabilidad / invertido) * 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`;
}

const COLORES_AMIGOS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#9333ea",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#0d9488",
  "#4f46e5",
  "#be123c",
];

// Positivos a la izquierda (arriba), negativos a la derecha (abajo).
function ordenarFilas(filas: FilaJugador[]): FilaJugador[] {
  return [...filas].sort((a, b) => {
    const aPos = a.rentabilidad >= 0;
    const bPos = b.rentabilidad >= 0;
    if (aPos !== bPos) return aPos ? -1 : 1;
    return b.rentabilidad - a.rentabilidad;
  });
}

export function RentabilidadManager({
  resumen,
  serieRentabilidad,
}: {
  resumen: ResumenMiembro[];
  serieRentabilidad?: {
    fechas: string[];
    amigos: { id: number; nombre: string; datos: (number | null)[] }[];
  };
}) {
  const [filtro, setFiltro] = useState<number | null>(null);
  const [soloPlantilla, setSoloPlantilla] = useState(true);
  const [detalle, setDetalle] = useState<FilaJugador | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const esGeneral = filtro == null;

  const visibles = (
    esGeneral
      ? [
          {
            id: -1,
            nombre: "General",
            foto: null,
            filas: resumen.flatMap((r) =>
              r.filas.map((f) => ({ ...f, miembro_id: r.id, miembro_nombre: r.nombre })),
            ),
            invertido: 0,
            devuelto: 0,
            rentabilidad: 0,
            subida_hoy: 0,
          } satisfies ResumenMiembro,
        ]
      : resumen.filter((r) => r.id === filtro)
  )
    .map((r) => {
      const filas = ordenarFilas(
        soloPlantilla ? r.filas.filter((f) => f.en_plantilla) : r.filas,
      );
      const totales = r.filas.reduce(
        (acc, f) => ({
          invertido: acc.invertido + f.invertido,
          devuelto: acc.devuelto + f.devuelto,
        }),
        { invertido: 0, devuelto: 0 },
      );
      const subidaHoy = filas
        .filter((f) => f.en_plantilla)
        .reduce((acc, f) => acc + (f.diferencia_diaria ?? 0), 0);
      return {
        ...r,
        filas,
        invertido: totales.invertido,
        devuelto: totales.devuelto,
        rentabilidad: totales.devuelto - totales.invertido,
        subida_hoy: subidaHoy,
      };
    })
    .sort((a, b) => {
      const aPos = a.rentabilidad >= 0;
      const bPos = b.rentabilidad >= 0;
      if (aPos !== bPos) return aPos ? -1 : 1;
      return b.rentabilidad - a.rentabilidad;
    });

  function formatValorCompacto(n: number): string {
    const abs = Math.abs(n);
    if (abs >= 1e9) return `${(n / 1e9).toFixed(1)} MM`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(1)} M`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(0)} k`;
    return `${n}`;
  }

  const lineData =
    serieRentabilidad && serieRentabilidad.amigos.length > 0
      ? serieRentabilidad.fechas.map((f, i) => {
          const row: Record<string, string | number | null> = { fecha: f };
          for (const a of serieRentabilidad.amigos) row[a.nombre] = a.datos[i];
          return row;
        })
      : [];

  const filaADetalle = (f: FilaJugador): CardJugador => ({
    id: f.jugador_id,
    jugador_id: f.jugador_id,
    nombre: f.nombre,
    posicion: null,
    equipo: f.equipo,
    foto: f.foto,
    escudo: f.escudo,
    valor: f.valor_actual ?? f.invertido,
    tendencia: null,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rentabilidad</h1>
        <p className="text-muted-foreground">
          Lo que cada jugador devuelve (ventas + valor de mercado actual) frente a lo
          invertido (fichaje + subidas de cláusula). Los pagos por puntos aún no están
          disponibles.
        </p>
      </div>

      {resumen.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={esGeneral ? "default" : "outline"}
            onClick={() => setFiltro(null)}
          >
            General
          </Button>
          {resumen.map((r) => (
            <Button
              key={r.id}
              size="sm"
              variant={filtro === r.id ? "default" : "outline"}
              onClick={() => setFiltro(r.id)}
            >
              {r.nombre}
              <span className="ml-1.5 text-xs opacity-80">({r.filas.length})</span>
            </Button>
          ))}
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={soloPlantilla}
              onChange={(e) => setSoloPlantilla(e.target.checked)}
              className="size-4 accent-foreground"
            />
            Solo en plantilla
          </label>
        </div>
      )}

      {esGeneral ? (
        resumen.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Sin datos</CardTitle>
              <CardDescription>
                No hay jugadores ni movimientos todavía en esta liga.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {lineData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Evolución diaria del patrimonio</CardTitle>
                  <CardDescription>
                    Valoración del equipo más el dinero en mano de cada amigo día a
                    día (últimas ~8 semanas).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={lineData}
                        margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 11 }} minTickGap={28} />
                        <YAxis
                          domain={["auto", "auto"]}
                          tickFormatter={(v) => formatValorCompacto(v as number)}
                          width={64}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            formatValor(value as number),
                            (name as string) ?? "",
                          ]}
                        />
                        <Legend />
                        {serieRentabilidad!.amigos.map((a, i) => (
                          <Line
                            key={a.id}
                            type="monotone"
                            dataKey={a.nombre}
                            dot={false}
                            strokeWidth={2}
                            stroke={COLORES_AMIGOS[i % COLORES_AMIGOS.length]}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumen.map((m) => {
              const filasG = soloPlantilla
                ? m.filas.filter((f) => f.en_plantilla)
                : m.filas;
              const totalesG = m.filas.reduce(
                (acc, f) => ({
                  invertido: acc.invertido + f.invertido,
                  devuelto: acc.devuelto + f.devuelto,
                }),
                { invertido: 0, devuelto: 0 },
              );
              const subidaHoyG = filasG
                .filter((f) => f.en_plantilla)
                .reduce((acc, f) => acc + (f.diferencia_diaria ?? 0), 0);
              const rentG = totalesG.devuelto - totalesG.invertido;
              const ordenG = [...filasG].sort((a, b) => b.rentabilidad - a.rentabilidad);
              const topG = ordenG[0] ?? null;
              const peorG = ordenG[ordenG.length - 1] ?? null;
              return (
                <Card key={m.id}>
                  <CardHeader className="flex flex-row items-center gap-3">
                    <MiembroAvatar nombre={m.nombre} fotoUrl={m.foto} />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {m.nombre}
                        <Badge variant="secondary">{filasG.length}</Badge>
                      </CardTitle>
                      <CardDescription>Resumen de la liga.</CardDescription>
                    </div>
                    <div className="ml-auto text-right">
                      <div
                        className={`text-xl font-bold tabular-nums ${
                          rentG > 0
                            ? "text-emerald-600"
                            : rentG < 0
                              ? "text-red-600"
                              : ""
                        }`}
                      >
                        {rentG > 0 ? "+" : ""}
                        {formatValor(rentG)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {pctTexto(totalesG.invertido, rentG) ?? "—"}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Invertido</div>
                        <div className="font-medium tabular-nums">
                          {formatValor(totalesG.invertido)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Devuelto</div>
                        <div className="font-medium tabular-nums">
                          {formatValor(totalesG.devuelto)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Beneficio</div>
                        <div
                          className={`font-medium tabular-nums ${
                            rentG > 0
                              ? "text-emerald-600"
                              : rentG < 0
                                ? "text-red-600"
                                : ""
                          }`}
                        >
                          {rentG > 0 ? "+" : ""}
                          {formatValor(rentG)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Subida de hoy</div>
                        <div
                          className={`font-medium tabular-nums ${
                            subidaHoyG > 0
                              ? "text-emerald-600"
                              : subidaHoyG < 0
                                ? "text-red-600"
                                : ""
                          }`}
                        >
                          {subidaHoyG > 0 ? "+" : ""}
                          {formatValor(subidaHoyG)}
                        </div>
                      </div>
                    </div>
                    {filasG.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Este amigo todavía no tiene jugadores.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1 text-sm">
                        {topG && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Top beneficio</span>
                            <span className="flex min-w-0 items-center gap-1.5">
                              {topG.foto ? (
                                <img
                                  src={topG.foto}
                                  alt=""
                                  className="size-5 rounded object-cover"
                                />
                              ) : null}
                              <span className="truncate font-medium">{topG.nombre}</span>
                              <span className="font-semibold tabular-nums text-emerald-600">
                                +{formatValor(topG.rentabilidad)}
                              </span>
                            </span>
                          </div>
                        )}
                        {peorG && peorG !== topG && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Menos beneficio</span>
                            <span className="flex min-w-0 items-center gap-1.5">
                              {peorG.foto ? (
                                <img
                                  src={peorG.foto}
                                  alt=""
                                  className="size-5 rounded object-cover"
                                />
                              ) : null}
                              <span className="truncate font-medium">{peorG.nombre}</span>
                              <span
                                className={`font-semibold tabular-nums ${
                                  peorG.rentabilidad < 0 ? "text-red-600" : "text-emerald-600"
                                }`}
                              >
                                {peorG.rentabilidad > 0 ? "+" : ""}
                                {formatValor(peorG.rentabilidad)}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </div>
        )
      ) : visibles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin datos</CardTitle>
            <CardDescription>
              No hay jugadores ni movimientos todavía en esta liga.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        visibles.map((r) => {
          const esGeneral = r.id === -1;
          const termino = busqueda.trim().toLowerCase();
          const filasFiltradas = termino
            ? r.filas.filter((f) =>
                (f.nombre as string).toLowerCase().includes(termino),
              )
            : r.filas;
          return (
          <Card key={r.id}>
            <CardHeader className="flex flex-row items-center gap-3">
              {!esGeneral && <MiembroAvatar nombre={r.nombre} fotoUrl={r.foto} />}
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2">
                  {r.nombre}
                  <Badge variant="secondary">{r.filas.length}</Badge>
                </CardTitle>
                <CardDescription>
                  {esGeneral
                    ? "Estado de todos los jugadores de la liga a la vez."
                    : "Rentabilidad total de sus jugadores."}
                </CardDescription>
              </div>
              <div className="ml-auto text-right">
                <div
                  className={`text-xl font-bold tabular-nums ${
                    r.rentabilidad > 0
                      ? "text-emerald-600"
                      : r.rentabilidad < 0
                        ? "text-red-600"
                        : ""
                  }`}
                >
                  {r.rentabilidad > 0 ? "+" : ""}
                  {formatValor(r.rentabilidad)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {pctTexto(r.invertido, r.rentabilidad) ?? "—"}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-4 text-sm">
                <span className="text-muted-foreground">
                  Invertido: <b className="text-foreground">{formatValor(r.invertido)}</b>
                </span>
                <span className="text-muted-foreground">
                  Devuelto: <b className="text-foreground">{formatValor(r.devuelto)}</b>
                </span>
                <span className="text-muted-foreground">
                  Beneficio:{" "}
                  <b
                    className={
                      r.rentabilidad > 0
                        ? "text-emerald-600"
                        : r.rentabilidad < 0
                          ? "text-red-600"
                          : "text-foreground"
                    }
                  >
                    {r.rentabilidad > 0 ? "+" : ""}
                    {formatValor(r.rentabilidad)}
                  </b>
                </span>
                <span className="text-muted-foreground">
                  Subida de hoy:{" "}
                  <b
                    className={
                      r.subida_hoy > 0
                        ? "text-emerald-600"
                        : r.subida_hoy < 0
                          ? "text-red-600"
                          : "text-foreground"
                    }
                  >
                    {r.subida_hoy > 0 ? "+" : ""}
                    {formatValor(r.subida_hoy)}
                  </b>
                </span>
                </div>

                <div className="relative mb-3">
                  <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar jugador…"
                    className="pl-8"
                  />
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>

                {r.filas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Este amigo todavía no tiene jugadores.
                  </p>
                ) : filasFiltradas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ningún jugador coincide con “{busqueda}”.
                  </p>
                ) : (
                  <Table>
                  <TableHeader>
                    <TableRow>
                      {esGeneral && <TableHead>Amigo</TableHead>}
                      <TableHead>Jugador</TableHead>
                      <TableHead className="text-right">Hoy</TableHead>
                      <TableHead className="text-right">Fichaje</TableHead>
                      <TableHead className="text-right">Subidas</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">Valor actual</TableHead>
                      <TableHead className="text-right">Invertido</TableHead>
                      <TableHead className="text-right">Devuelto</TableHead>
                      <TableHead className="text-right">Rentabilidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filasFiltradas.map((f) => {
                      const pct = pctTexto(f.invertido, f.rentabilidad);
                      return (
                        <TableRow key={f.jugador_id}>
                          {esGeneral && (
                            <TableCell className="text-muted-foreground">
                              {f.miembro_nombre}
                            </TableCell>
                          )}
                          <TableCell>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => setDetalle(f)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setDetalle(f);
                                }
                              }}
                              className="flex cursor-pointer items-center gap-2 rounded-md p-1 -m-1 transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                              {f.foto ? (
                                <div className="relative">
                                  <img
                                    src={f.foto}
                                    alt={f.nombre}
                                    className="size-9 rounded-md border object-cover"
                                  />
                                  {f.escudo && (
                                    <img
                                      src={f.escudo}
                                      alt=""
                                      className="absolute -left-1.5 -top-1.5 size-4.5 rounded-full object-contain"
                                    />
                                  )}
                                </div>
                              ) : (
                                <div className="flex size-9 items-center justify-center rounded-md border bg-muted text-xs font-semibold text-muted-foreground">
                                  {f.nombre.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate font-medium">{f.nombre}</span>
                                  {f.tendencia != null && (
                                    <IndicadorMovimientoBadge
                                      tendencia={f.tendencia}
                                      aceleracion_estado={f.aceleracion_estado}
                                    />
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {f.equipo ?? "—"}
                                  {f.en_plantilla ? " · En plantilla" : " · Vendido"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {f.diferencia_diaria != null ? (
                              <span
                                className={`font-semibold tabular-nums ${
                                  f.diferencia_diaria > 0
                                    ? "text-emerald-600"
                                    : f.diferencia_diaria < 0
                                      ? "text-red-600"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {f.diferencia_diaria > 0
                                  ? "▲"
                                  : f.diferencia_diaria < 0
                                    ? "▼"
                                    : "±"}{" "}
                                {formatValor(Math.abs(f.diferencia_diaria))}
                                {f.diferencia_pct_diaria != null ? (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    {f.diferencia_pct_diaria > 0 ? "+" : ""}
                                    {f.diferencia_pct_diaria.toFixed(2)}%
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatValor(f.fichaje)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatValor(f.subidas)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatValor(f.ventas)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatValor(f.valor_actual)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatValor(f.invertido)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatValor(f.devuelto)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`font-semibold tabular-nums ${
                                f.rentabilidad > 0
                                  ? "text-emerald-600"
                                  : f.rentabilidad < 0
                                    ? "text-red-600"
                                    : ""
                              }`}
                            >
                              {f.rentabilidad > 0 ? "+" : ""}
                              {formatValor(f.rentabilidad)}
                            </span>
                            {pct ? (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                {pct}
                              </span>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          );
        })
      )}

      {detalle != null && (
        <JugadorDetalleSheet
          jugador={filaADetalle(detalle)}
          open={detalle != null}
          onOpenChange={(open) => {
            if (!open) setDetalle(null);
          }}
        />
      )}
    </div>
  );
}