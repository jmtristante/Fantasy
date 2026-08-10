import { Plus, Trash2, Lock, Minus, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatValor } from "@/lib/format";
import { JugadorDetalleSheet } from "@/components/jugador-detalle";

export type CardJugador = {
  id: number;
  jugador_id: number;
  nombre: string;
  posicion: string | null;
  equipo: string | null;
  foto: string | null;
  escudo: string | null;
  valor: number | null;
  tendencia: number | null;
  aceleracion_estado?: string | null;
  estado?: string | null;
  jerarquia?: string | null;
  probabilidad?: number | null;
  lesion?: string | null;
  clausula?: number | null;
};

function Iniciales({ nombre }: { nombre: string }) {
  const partes = nombre.trim().split(/\s+/);
  const iniciales = (partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "");
  return (
    <span className="select-none text-lg font-semibold text-muted-foreground">
      {(iniciales || "?").toUpperCase()}
    </span>
  );
}

function normalizaEstado(estado: string | null | undefined) {
  return (estado ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function IndicadorMovimientoBadge({
  tendencia,
  aceleracion_estado,
}: {
  tendencia: number | null;
  aceleracion_estado?: string | null;
}) {
  const estado = normalizaEstado(aceleracion_estado);
  const v = tendencia ?? 0;
  const sube = v > 0;
  const baja = v < 0;
  const verde = v >= 0;

  if (!estado) {
    return (
      <Badge
        className="px-1.5 py-0 text-[11px] shadow bg-muted text-muted-foreground"
        title="Sin movimiento"
      >
        <Minus className="size-3" />
      </Badge>
    );
  }

  let Icono: LucideIcon = Minus;
  const mucho = estado.includes("mucho");

  if (estado.startsWith("desacelera")) {
    Icono = mucho
      ? sube
        ? ChevronsDown
        : baja
          ? ChevronsUp
          : Minus
      : sube
        ? ArrowDown
        : baja
          ? ArrowUp
          : Minus;
  } else if (estado.startsWith("acelera")) {
    Icono = mucho
      ? sube
        ? ChevronsUp
        : baja
          ? ChevronsDown
          : Minus
      : sube
        ? ArrowUp
        : baja
          ? ArrowDown
          : Minus;
  } else if (estado.startsWith("inflexion")) {
    Icono = TriangleAlert;
  } else {
    Icono = Minus;
  }

  const claseFondo = verde
    ? "bg-emerald-600/90 text-white"
    : baja
      ? "bg-red-600/90 text-white"
      : "bg-muted text-muted-foreground";
  return (
    <Badge
      className={`px-1.5 py-0 text-[11px] shadow ${claseFondo}`}
      title={aceleracion_estado ?? undefined}
    >
      <Icono className="size-3" />
    </Badge>
  );
}

function BloqueoBadge({ hasta }: { hasta: string | null }) {
  const texto = hasta ? `hasta ${new Date(hasta).toLocaleDateString("es-ES")}` : "";
  return (
    <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
      <Lock className="size-2.5" />
      {texto || "Bloqueado"}
    </span>
  );
}

function LesionBadge({ lesion }: { lesion?: string | null }) {
  const l = (lesion ?? "").toLowerCase();
  if (l === "lesionado") {
    return (
      <span className="absolute bottom-1 right-1 rounded-full bg-red-600/95 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
        Lesionado
      </span>
    );
  }
  if (l === "duda") {
    return (
      <span className="absolute bottom-1 right-1 rounded-full bg-amber-600/95 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
        Duda
      </span>
    );
  }
  return null;
}

const ESTADOS_LEGIBLES: Record<string, { texto: string; clase: string }> = {
  "1": { texto: "Titular", clase: "bg-emerald-600/90 text-white" },
  "2": { texto: "Suplente", clase: "bg-sky-600/90 text-white" },
  "3": { texto: "Sancionado", clase: "bg-amber-600/90 text-white" },
  "4": { texto: "Lesionado", clase: "bg-red-600/90 text-white" },
  "5": { texto: "Duda", clase: "bg-violet-600/90 text-white" },
};

const JERARQUIA_CORTA: Record<string, { texto: string; clase: string }> = {
  Dios: { texto: "D", clase: "bg-amber-500/90 text-white" },
  Clave: { texto: "C", clase: "bg-orange-500/90 text-white" },
  Importante: { texto: "I", clase: "bg-violet-500/90 text-white" },
  Rotacion: { texto: "R", clase: "bg-muted text-muted-foreground" },
};

export function TitularidadBadge({
  estado,
  jerarquia,
  probabilidad,
}: {
  estado?: string | null;
  jerarquia?: string | null;
  probabilidad?: number | null;
}) {
  const e = estado != null ? ESTADOS_LEGIBLES[estado] : null;
  const j = jerarquia != null ? JERARQUIA_CORTA[jerarquia] : null;
  if (!e && !j && probabilidad == null) return null;
  return (
    <span className="flex items-center gap-1">
      {e && (
        <span
          className={`rounded-full px-1.5 py-0 text-[10px] font-semibold shadow ${e.clase}`}
          title={e.texto}
        >
          {e.texto}
        </span>
      )}
      {j && (
        <span
          className={`rounded-full px-1.5 py-0 text-[10px] font-semibold shadow ${j.clase}`}
          title={`Jerarquía: ${jerarquia}`}
        >
          {j.texto}
        </span>
      )}
      {probabilidad != null && (
        <span
          className="rounded-full bg-black/40 px-1.5 py-0 text-[10px] font-semibold text-white"
          title="Probabilidad de jugar"
        >
          {probabilidad}%
        </span>
      )}
    </span>
  );
}

export function JugadorCard({
  jugador,
  onAdd,
  onRemove,
  deshabilitado,
  bloqueado,
  bloqueadoHasta,
}: {
  jugador: CardJugador;
  onAdd?: () => void;
  onRemove?: () => void;
  deshabilitado?: boolean;
  bloqueado?: boolean;
  bloqueadoHasta?: string | null;
}) {
  const { nombre, posicion, equipo, foto, escudo, valor, tendencia, aceleracion_estado, lesion } = jugador;
  const [detalleOpen, setDetalleOpen] = useState(false);
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setDetalleOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetalleOpen(true);
          }
        }}
        className="relative flex w-32 shrink-0 cursor-pointer flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div className="relative h-24 overflow-hidden bg-muted">
          {foto ? (
            <img src={foto} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Iniciales nombre={nombre} />
            </div>
          )}
          {escudo && (
            <img
              src={escudo}
              alt=""
              className="absolute left-1 top-1 size-7 rounded object-contain bg-white/90 p-0.5 ring-1 ring-border"
            />
          )}
          <div className="absolute right-1 top-1">
            <IndicadorMovimientoBadge
              tendencia={tendencia}
              aceleracion_estado={aceleracion_estado}
            />
          </div>
          {bloqueado && <BloqueoBadge hasta={bloqueadoHasta ?? null} />}
          <LesionBadge lesion={lesion} />
        </div>
        <div className="flex flex-1 flex-col gap-1 p-2">
          <span className="truncate text-sm font-semibold" title={nombre}>
            {nombre}
          </span>
          <span className="truncate text-[11px] text-muted-foreground">
            {posicion ?? "—"}
            {equipo ? ` · ${equipo}` : ""}
          </span>
          <TitularidadBadge
            estado={jugador.estado}
            jerarquia={jugador.jerarquia}
            probabilidad={jugador.probabilidad}
          />
          <div className="mt-auto flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              {jugador.clausula != null ? (
                <div className="flex flex-col">
                  <span className="text-sm font-bold tabular-nums">
                    {formatValor(valor)}
                  </span>
                  <span
                    className="text-[10px] tabular-nums text-muted-foreground"
                    title="Valor de cláusula"
                  >
                    Cláusula: {formatValor(jugador.clausula)}
                  </span>
                </div>
              ) : (
                <span className="text-sm font-bold tabular-nums">{formatValor(valor)}</span>
              )}
              {onAdd && (
                <Button
                  size="icon-sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd();
                  }}
                  aria-label={`Añadir a ${nombre}`}
                >
                  <Plus className="size-4" />
                </Button>
              )}
              {onRemove && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  disabled={deshabilitado}
                  aria-label={`Quitar a ${nombre}`}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <JugadorDetalleSheet
        jugador={jugador}
        open={detalleOpen}
        onOpenChange={setDetalleOpen}
      />
    </>
  );
}