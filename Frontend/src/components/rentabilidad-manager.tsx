"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
}: {
  resumen: ResumenMiembro[];
}) {
  const [filtro, setFiltro] = useState<number | null>(resumen[0]?.id ?? null);
  const [soloPlantilla, setSoloPlantilla] = useState(true);
  const [detalle, setDetalle] = useState<FilaJugador | null>(null);

  const visibles = (filtro == null ? resumen : resumen.filter((r) => r.id === filtro))
    .map((r) => ({
      ...r,
      filas: ordenarFilas(
        soloPlantilla ? r.filas.filter((f) => f.en_plantilla) : r.filas,
      ),
    }))
    .sort((a, b) => {
      const aPos = a.rentabilidad >= 0;
      const bPos = b.rentabilidad >= 0;
      if (aPos !== bPos) return aPos ? -1 : 1;
      return b.rentabilidad - a.rentabilidad;
    });

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

      {visibles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin datos</CardTitle>
            <CardDescription>
              No hay jugadores ni movimientos todavía en esta liga.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        visibles.map((r) => (
          <Card key={r.id}>
            <CardHeader className="flex flex-row items-center gap-3">
              <MiembroAvatar nombre={r.nombre} fotoUrl={r.foto} />
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2">
                  {r.nombre}
                  <Badge variant="secondary">{r.filas.length}</Badge>
                </CardTitle>
                <CardDescription>Rentabilidad total de sus jugadores.</CardDescription>
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

              {r.filas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Este amigo todavía no tiene jugadores.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    {r.filas.map((f) => {
                      const pct = pctTexto(f.invertido, f.rentabilidad);
                      return (
                        <TableRow key={f.jugador_id}>
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
        ))
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