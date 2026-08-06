"use client";

import { useMemo } from "react";

export type JugadorCampo = {
  jugador_id: number;
  nombre: string;
  posicion: string | null;
  foto: string | null;
  escudo: string | null;
};

// Posición vertical de cada rol en el campo (%). El portero se coloca
// arriba y los delanteros abajo (parte visual que mira al ataque).
const ROL_Y: Record<string, number> = {
  Delantero: 82,
  Mediocampista: 60,
  Defensa: 38,
  Portero: 16,
};

type Posicionado = {
  jugador: JugadorCampo;
  left: number;
  top: number;
};

function ordenRol(rol: string): number {
  if (rol === "Delantero") return 0;
  if (rol === "Mediocampista") return 1;
  if (rol === "Defensa") return 2;
  return 3;
}

function calcPosiciones(titulares: JugadorCampo[]): Posicionado[] {
  const porRol = new Map<string, JugadorCampo[]>();
  for (const j of titulares) {
    const rol = j.posicion ?? "Otro";
    if (!porRol.has(rol)) porRol.set(rol, []);
    porRol.get(rol)!.push(j);
  }
  const filas = Array.from(porRol.entries()).sort((a, b) => ordenRol(a[0]) - ordenRol(b[0]));
  const result: Posicionado[] = [];
  for (const [rol, items] of filas) {
    const top = ROL_Y[rol] ?? 50;
    const n = items.length;
    for (let i = 0; i < n; i++) {
      const left = n === 1 ? 50 : 15 + (i * 70) / (n - 1);
      result.push({ jugador: items[i], left, top });
    }
  }
  return result;
}

export function CampoFutbol({
  titulares,
  rendirse = true,
}: {
  titulares: JugadorCampo[];
  rendirse?: boolean;
}) {
  const posicionados = useMemo(() => calcPosiciones(titulares), [titulares]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border shadow-inner ${
        rendirse ? "aspect-[16/10]" : ""
      }`}
      style={{
        background:
          "linear-gradient(180deg, #15803d 0%, #16a34a 55%, #15803d 100%)",
      }}
    >
      {/* Líneas del campo (vertical: ataque arriba, portería del de abajo) */}
      <div className="absolute inset-3 rounded-lg border-2 border-white/40" />
      <div className="absolute inset-x-3 top-1/2 h-px bg-white/40" />
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
      <div className="absolute left-1/2 top-[10%] h-24 w-16 -translate-x-1/2 rounded-sm border-2 border-white/40 bg-white/10" />
      <div className="absolute left-1/2 bottom-[10%] h-24 w-16 -translate-x-1/2 rounded-sm border-2 border-white/40 bg-white/10" />

      {/* Jugadores */}
      {posicionados.map((p) => (
        <div
          key={p.jugador.jugador_id}
          className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${p.left}%`, top: `${p.top}%` }}
        >
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-muted shadow-md">
            {p.jugador.foto ? (
              <img src={p.jugador.foto} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-semibold">
                {p.jugador.nombre.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <span className="max-w-16 truncate text-[10px] font-medium leading-tight text-white drop-shadow">
            {p.jugador.nombre}
          </span>
        </div>
      ))}
    </div>
  );
}