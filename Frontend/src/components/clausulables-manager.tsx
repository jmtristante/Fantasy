"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import type { CardJugador } from "@/components/jugador-card";

export type FilaRobo = {
  jugador_id: number;
  nombre: string;
  posicion: string | null;
  equipo: string | null;
  foto: string | null;
  escudo: string | null;
  dueno_id: number;
  dueno: string;
  dueno_foto: string | null;
  clausula: number | null;
  mercado: number | null;
  gap_pct: number | null;
  ratio: number | null;
  diferencia_pct: number | null;
  tendencia: number | null;
  aprec_5d: number | null;
  valor_estimado_14d: number | null;
  ganancia_14d: number | null;
  bloqueado: boolean;
  bloqueado_hasta: string | null;
};

function pct(v: number | null): string {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function GapBadge({ gap }: { gap: number | null }) {
  if (gap == null) return <span className="text-muted-foreground">—</span>;
  const gapBajo = gap <= 1;
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
        gapBajo
          ? "bg-emerald-600/90 text-white"
          : gap <= 5
            ? "bg-amber-600/90 text-white"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {gap <= 0 ? "0%" : `${gap.toFixed(1)}%`}
    </span>
  );
}

function Cambio({ v }: { v: number | null }) {
  if (v == null) return <span className="text-muted-foreground">—</span>;
  const clase =
    v > 0
      ? "text-emerald-600"
      : v < 0
        ? "text-red-600"
        : "text-muted-foreground";
  return (
    <span className={`font-semibold tabular-nums ${clase}`}>{pct(v)}</span>
  );
}

export function ClausulablesManager({
  filas,
  miSaldo,
}: {
  filas: FilaRobo[];
  miSaldo: number | null;
}) {
  const [filtro, setFiltro] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<FilaRobo | null>(null);
  const [nowMs] = useState(() => Date.now());

  const duenos = [...new Map(filas.map((f) => [f.dueno_id, f])).values()].sort(
    (a, b) => a.dueno.localeCompare(b.dueno),
  );

  const visibles = filas.filter(
    (f) => filtro == null || f.dueno_id === filtro,
  );

  const filaADetalle = (f: FilaRobo): CardJugador => ({
    id: f.jugador_id,
    jugador_id: f.jugador_id,
    nombre: f.nombre,
    posicion: f.posicion,
    equipo: f.equipo,
    foto: f.foto,
    escudo: f.escudo,
    valor: f.mercado,
    tendencia: f.tendencia,
    clausula: f.clausula,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Oportunidades de robo</h1>
        <p className="text-muted-foreground">
          Los jugadores más baratos de clausular frente a su posible próxima
          subida: ordenados por jugadores que ya suben, con el menor margen
          entre cláusula y mercado y mayor apreciación reciente.
        </p>
      </div>

      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          Tu saldo:{" "}
          <b className="tabular-nums text-foreground">{formatValor(miSaldo)}</b>
        </span>
      </Card>

      {duenos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={filtro == null ? "default" : "outline"}
            onClick={() => setFiltro(null)}
          >
            Todos <span className="ml-1.5 text-xs opacity-80">({filas.length})</span>
          </Button>
          {duenos.map((d) => (
            <Button
              key={d.dueno_id}
              size="sm"
              variant={filtro === d.dueno_id ? "default" : "outline"}
              onClick={() => setFiltro(d.dueno_id)}
            >
              {d.dueno}
              <span className="ml-1.5 text-xs opacity-80">
                (
                {filas.filter((f) => f.dueno_id === d.dueno_id).length})
              </span>
            </Button>
          ))}
        </div>
      )}

      {visibles.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {filtro != null
            ? "Este amigo no tiene jugadores."
            : "Tu liga aún no tiene jugadores con dueño."}
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jugador</TableHead>
                <TableHead>Dueño</TableHead>
                <TableHead className="text-right">Cláusula</TableHead>
                <TableHead className="text-right">Mercado</TableHead>
                <TableHead className="text-right">Gap</TableHead>
                <TableHead className="text-right">Hoy</TableHead>
                <TableHead className="text-right">Últimos 5 días</TableHead>
                <TableHead className="text-right">Estim. 14 días</TableHead>
                <TableHead className="text-right">Ganancia 14 días</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.map((f) => (
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
                          {f.bloqueado && (
                            <span
                              className="flex shrink-0 items-center gap-1 rounded bg-muted px-1 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground"
                              title={
                                f.bloqueado_hasta
                                  ? `Bloqueado hasta ${new Date(
                                      f.bloqueado_hasta,
                                    ).toLocaleDateString("es-ES")}`
                                  : "Bloqueado"
                              }
                            >
                              <Lock className="size-3" />
                              {f.bloqueado_hasta
                                ? `${Math.max(
                                    1,
                                    Math.ceil(
                                      (new Date(f.bloqueado_hasta).getTime() -
                                        nowMs) /
                                        86_400_000,
                                    ),
                                  )}d`
                                : "—"}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {f.posicion ?? "—"}
                          {f.equipo ? ` · ${f.equipo}` : ""}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MiembroAvatar nombre={f.dueno} fotoUrl={f.dueno_foto} />
                      <span>{f.dueno}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatValor(f.clausula)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatValor(f.mercado)}
                  </TableCell>
                  <TableCell className="text-right">
                    <GapBadge gap={f.gap_pct} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Cambio v={f.diferencia_pct} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Cambio v={f.aprec_5d} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {f.valor_estimado_14d != null ? (
                      formatValor(f.valor_estimado_14d)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {f.ganancia_14d != null ? (
                      <span
                        className={`font-semibold tabular-nums ${
                          f.ganancia_14d > 0
                            ? "text-emerald-600"
                            : f.ganancia_14d < 0
                              ? "text-red-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {f.ganancia_14d > 0 ? "+" : ""}
                        {formatValor(f.ganancia_14d)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </CardContent>
        </Card>
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