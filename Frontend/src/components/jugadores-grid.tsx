"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JugadorCard, type CardJugador } from "@/components/jugador-card";

const POSICIONES = ["Portero", "Defensa", "Mediocampista", "Delantero"] as const;

export function JugadoresGrid({ filas }: { filas: CardJugador[] }) {
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<string | null>(null);
  const [equipo, setEquipo] = useState<string | null>(null);
  const [orden, setOrden] = useState<"valor-desc" | "valor-asc" | "nombre">("valor-desc");

  const equipos = useMemo(
    () =>
      Array.from(new Set(filas.map((f) => f.equipo).filter((e): e is string => Boolean(e)))).sort(
        (a, b) => a.localeCompare(b, "es"),
      ),
    [filas],
  );

  const listas = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = filas;
    if (pos) base = base.filter((f) => f.posicion === pos);
    if (equipo) base = base.filter((f) => f.equipo === equipo);
    if (q) {
      base = base.filter(
        (f) =>
          f.nombre.toLowerCase().includes(q) ||
          (f.equipo?.toLowerCase().includes(q) ?? false),
      );
    }
    const ordenadas = [...base];
    if (orden === "valor-desc") ordenadas.sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1));
    else if (orden === "valor-asc") ordenadas.sort((a, b) => (a.valor ?? -1) - (b.valor ?? -1));
    else ordenadas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return ordenadas;
  }, [filas, query, pos, equipo, orden]);

  const variantOrden = (o: "valor-desc" | "valor-asc" | "nombre") =>
    orden === o ? ("secondary" as const) : ("ghost" as const);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o equipo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 max-w-xs"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
            {pos ?? "Posición"}
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuRadioGroup value={pos ?? ""} onValueChange={(v) => setPos(v || null)}>
              <DropdownMenuRadioItem value="">Todas</DropdownMenuRadioItem>
              {POSICIONES.map((p) => (
                <DropdownMenuRadioItem key={p} value={p}>
                  {p}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
            {equipo ?? "Equipo"}
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto w-52">
            <DropdownMenuRadioGroup value={equipo ?? ""} onValueChange={(v) => setEquipo(v || null)}>
              <DropdownMenuRadioItem value="">Todos</DropdownMenuRadioItem>
              {equipos.map((e) => (
                <DropdownMenuRadioItem key={e} value={e}>
                  {e}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {pos && (
          <Button size="sm" variant="ghost" onClick={() => setPos(null)}>
            Posición: {pos} ✕
          </Button>
        )}
        {equipo && (
          <Button size="sm" variant="ghost" onClick={() => setEquipo(null)}>
            Equipo: {equipo} ✕
          </Button>
        )}

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