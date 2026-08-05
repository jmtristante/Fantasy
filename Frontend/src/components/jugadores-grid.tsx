"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { JugadorCard, type CardJugador } from "@/components/jugador-card";

const POSICIONES = ["POR", "DEF", "MED", "DEL"] as const;

export function JugadoresGrid({ filas }: { filas: CardJugador[] }) {
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<string | null>(null);
  const [orden, setOrden] = useState<"valor-desc" | "valor-asc" | "nombre">("valor-desc");

  const listas = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = pos ? filas.filter((f) => f.posicion === pos) : filas;
    if (q) {
      base = base.filter(
        (f) =>
          f.nombre.toLowerCase().includes(q) ||
          (f.equipo?.toLowerCase().includes(q) ?? false) ||
          (f.posicion?.toLowerCase().includes(q) ?? false),
      );
    }
    const ordenadas = [...base];
    if (orden === "valor-desc") ordenadas.sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1));
    else if (orden === "valor-asc") ordenadas.sort((a, b) => (a.valor ?? -1) - (b.valor ?? -1));
    else ordenadas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return ordenadas;
  }, [filas, query, pos, orden]);

  const variantOrden = (o: "valor-desc" | "valor-asc" | "nombre") =>
    orden === o ? ("secondary" as const) : ("ghost" as const);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, equipo o posición..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 max-w-xs"
          />
        </div>
        {POSICIONES.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={pos === p ? "secondary" : "ghost"}
            onClick={() => setPos(pos === p ? null : p)}
          >
            {p}
          </Button>
        ))}
        <div className="ml-auto flex gap-1.5">
          <Button size="sm" variant={variantOrden("valor-desc")} onClick={() => setOrden("valor-desc")}>
            Valor ↓
          </Button>
          <Button size="sm" variant={variantOrden("valor-asc")} onClick={() => setOrden("valor-asc")}>
            Valor ↑
          </Button>
          <Button size="sm" variant={variantOrden("nombre")} onClick={() => setOrden("nombre")}>
            Nombre
          </Button>
        </div>
      </div>

      {listas.length === 0 ? (
        <p className="text-sm text-muted-foreground">No se encontraron jugadores.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{listas.length} jugadores</p>
          <div className="flex flex-wrap gap-3">
            {listas.map((f) => (
              <JugadorCard key={f.jugador_id} jugador={f} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}