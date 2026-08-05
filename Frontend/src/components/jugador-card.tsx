import { Plus, Trash2, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatValor } from "@/lib/format";

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

function TendenciaBadge({ tendencia }: { tendencia: number | null }) {
  if (tendencia == null) return null;
  const sube = tendencia > 0;
  const baja = tendencia < 0;
  const clase = sube
    ? "bg-emerald-600/90 text-white"
    : baja
      ? "bg-red-600/90 text-white"
      : "bg-muted text-muted-foreground";
  return (
    <Badge className={`px-1.5 py-0 text-[11px] shadow ${clase}`}>
      {sube ? `▲ ${tendencia}` : baja ? `▼ ${Math.abs(tendencia)}` : "±0"}
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
  const { nombre, posicion, equipo, foto, escudo, valor, tendencia } = jugador;
  return (
    <div className="relative flex w-32 shrink-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md">
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
          <TendenciaBadge tendencia={tendencia} />
        </div>
        {bloqueado && <BloqueoBadge hasta={bloqueadoHasta ?? null} />}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2">
        <span className="truncate text-sm font-semibold" title={nombre}>
          {nombre}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">
          {posicion ?? "—"}
          {equipo ? ` · ${equipo}` : ""}
        </span>
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-sm font-bold tabular-nums">{formatValor(valor)}</span>
          {onAdd && (
            <Button
              size="icon-sm"
              variant="secondary"
              onClick={onAdd}
              aria-label={`Añadir a ${nombre}`}
            >
              <Plus className="size-4" />
            </Button>
          )}
          {onRemove && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onRemove}
              disabled={deshabilitado}
              aria-label={`Quitar a ${nombre}`}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}