"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Clock } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatValor, formatDate } from "@/lib/format";

const LALIGA = 0;

const TIPO_LABEL: Record<string, string> = {
  compra_mercado: "Compra",
  venta_mercado: "Venta",
  subida_clausula: "Subida de cláusula",
  blindaje: "Blindaje",
  clausula: "Cláusula",
  pago_jornada: "Pago de jornada",
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
};

const DOT_COLOR: Record<string, string> = {
  compra_mercado: "bg-emerald-500",
  venta_mercado: "bg-red-500",
  subida_clausula: "bg-blue-500",
  blindaje: "bg-orange-500",
  clausula: "bg-purple-500",
  pago_jornada: "bg-amber-500",
  entrada: "bg-green-500",
  salida: "bg-red-400",
  ajuste: "bg-zinc-400",
};

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm";

function spainNowLocal(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
  const hora = partes.hour === "24" ? "00" : partes.hour;
  return `${partes.year}-${partes.month}-${partes.day}T${hora}:${partes.minute}`;
}

function resumenMovimiento(h: {
  tipo: string;
  jugador: string | null;
  contraparte: string | null;
  nota: string | null;
}): string {
  const quien = h.contraparte ?? "LaLiga";
  switch (h.tipo) {
    case "compra_mercado":
      return `compró a ${h.jugador ?? "—"} de ${quien}`;
    case "venta_mercado":
      return `vendió a ${h.jugador ?? "—"} a ${quien}`;
    case "subida_clausula":
      return `subió la cláusula de ${h.jugador ?? "—"}`;
    case "blindaje":
      return `blindó a ${h.jugador ?? "—"}`;
    case "clausula":
      return `activó la cláusula de ${h.jugador ?? "—"}`;
    case "pago_jornada":
      return `recibió el pago de jornada`;
    default:
      return h.nota ?? h.tipo;
  }
}

export function MovimientosManager({
  ligaId,
  ligaNombre,
  miembros,
  libres,
  plantilla,
  saldos,
  historial,
}: {
  ligaId: number;
  ligaNombre: string;
  miembros: { id: number; nombre: string }[];
  libres: { jugador_id: number; nombre: string; precio: number | null }[];
  plantilla: {
    miembro_id: number;
    miembro: string;
    jugador_id: number;
    nombre: string;
    clausula: number | null;
    valor_mercado: number | null;
  }[];
  saldos: Record<number, number>;
  historial: {
    id: number;
    fecha: string;
    tipo: string;
    miembro: string;
    contraparte: string | null;
    jugador: string | null;
    importe: number;
    nota: string | null;
  }[];
}) {
  const router = useRouter();

  const [modal, setModal] = useState<"mercado" | "blindaje" | "subida" | null>(null);
  const [fecha, setFecha] = useState("");

  // Operación de mercado
  const [comprador, setComprador] = useState<number>(miembros[0]?.id ?? LALIGA);
  const [vendedor, setVendedor] = useState<number>(LALIGA);
  const [filtroJugador, setFiltroJugador] = useState("");
  const [jugadorId, setJugadorId] = useState<number | null>(null);
  const [precio, setPrecio] = useState("");
  const [ocupadoMercado, setOcupadoMercado] = useState(false);

  // Blindaje
  const [blMiembro, setBlMiembro] = useState<number>(miembros[0]?.id ?? LALIGA);
  const [blJugadorId, setBlJugadorId] = useState<number | null>(null);
  const [invertido, setInvertido] = useState("");
  const [ocupadoBlindaje, setOcupadoBlindaje] = useState(false);

  const opcionesMiembros = miembros.map((m) => ({ id: m.id, nombre: m.nombre }));

  const candidatosMercado = useMemo(() => {
    const base =
      vendedor === LALIGA
        ? libres.map((l) => ({
            jugador_id: l.jugador_id,
            nombre: l.nombre,
            precio: l.precio,
          }))
        : plantilla
            .filter((p) => p.miembro_id === vendedor)
            .map((p) => ({
              jugador_id: p.jugador_id,
              nombre: p.nombre,
              precio: p.clausula,
            }));
    const q = filtroJugador.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [vendedor, libres, plantilla, filtroJugador]);

  const jugadorMercado = candidatosMercado.find((c) => c.jugador_id === jugadorId) ?? null;

  const jugadoresBlindaje = useMemo(
    () => (blMiembro === LALIGA ? [] : plantilla.filter((p) => p.miembro_id === blMiembro)),
    [plantilla, blMiembro],
  );
  const jugadorBlindaje = jugadoresBlindaje.find((p) => p.jugador_id === blJugadorId) ?? null;

  function abrirModal(tipo: "mercado" | "blindaje" | "subida") {
    setFecha(spainNowLocal());
    setModal(tipo);
  }

  async function registrarMercado() {
    if (!jugadorMercado) {
      toast.error("Selecciona un jugador");
      return;
    }
    if (comprador === LALIGA && vendedor === LALIGA) {
      toast.error("Al menos uno de los dos (comprador o vendedor) debe ser un amigo");
      return;
    }
    if (comprador !== LALIGA && comprador === vendedor) {
      toast.error("Un amigo no puede comprarse a sí mismo");
      return;
    }
    const precioNum = Number(precio || (jugadorMercado.precio ?? 0));
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      toast.error("Precio inválido");
      return;
    }
    if (comprador !== LALIGA && precioNum > (saldos[comprador] ?? 0)) {
      toast.error(
        `Saldo insuficiente de ${miembros.find((m) => m.id === comprador)?.nombre ?? ""}`,
      );
      return;
    }
    const buyerIs = comprador !== LALIGA;
    const sellerIs = vendedor !== LALIGA;
    setOcupadoMercado(true);
    const supabase = createBrowserClient();
    const ops: Array<PromiseLike<unknown>> = [];
    if (buyerIs) {
      ops.push(
        supabase
          .schema("liga")
          .from("movimientos")
          .insert({
            liga_id: ligaId,
            fecha,
            miembro_id: comprador,
            tipo: "compra_mercado",
            jugador_id: jugadorMercado.jugador_id,
            importe: -precioNum,
            contraparte: sellerIs ? vendedor : null,
            nota: `Compra de ${jugadorMercado.nombre}${sellerIs ? ` a ${miembros.find((m) => m.id === vendedor)?.nombre ?? "un amigo"}` : " a LaLiga"}`,
          })
          .then((r) => r.error),
      );
    }
    if (sellerIs) {
      ops.push(
        supabase
          .schema("liga")
          .from("movimientos")
          .insert({
            liga_id: ligaId,
            fecha,
            miembro_id: vendedor,
            tipo: "venta_mercado",
            jugador_id: jugadorMercado.jugador_id,
            importe: precioNum,
            contraparte: buyerIs ? comprador : null,
            nota: `Venta de ${jugadorMercado.nombre}${buyerIs ? ` a ${miembros.find((m) => m.id === comprador)?.nombre ?? "un amigo"}` : " a LaLiga"}`,
          })
          .then((r) => r.error),
      );
    }
    if (sellerIs) {
      ops.push(
        supabase
          .schema("liga")
          .from("plantillas")
          .delete()
          .eq("liga_id", ligaId)
          .eq("jugador_id", jugadorMercado.jugador_id)
          .then((r) => r.error),
      );
    }
    if (buyerIs) {
      ops.push(
        supabase
          .schema("liga")
          .from("plantillas")
          .insert({
            liga_id: ligaId,
            miembro_id: comprador,
            jugador_id: jugadorMercado.jugador_id,
          })
          .then((r) => r.error),
      );
      ops.push(
        supabase
          .schema("liga")
          .from("clausulas_historial")
          .insert({
            liga_id: ligaId,
            jugador_id: jugadorMercado.jugador_id,
            miembro_id: comprador,
            valor: precioNum,
            motivo: "compra_mercado",
          })
          .then((r) => r.error),
      );
    }
    const resultados = await Promise.all(ops);
    setOcupadoMercado(false);
    const error = resultados.find((e) => e != null) as { message?: string } | undefined;
    if (error) {
      toast.error(`No se pudo registrar la operación: ${error?.message ?? "error"}`);
      router.refresh();
      return;
    }
    toast.success("Operación de mercado registrada");
    setJugadorId(null);
    setPrecio("");
    setModal(null);
    router.refresh();
  }

  async function registrarBlindaje() {
    if (!jugadorBlindaje) {
      toast.error("Selecciona un jugador del miembro");
      return;
    }
    setOcupadoBlindaje(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.schema("liga").from("movimientos").insert({
      liga_id: ligaId,
      fecha,
      miembro_id: blMiembro,
      tipo: "blindaje",
      jugador_id: blJugadorId,
      importe: 0,
      nota: `Blindaje de ${jugadorBlindaje.nombre}`,
    });
    setOcupadoBlindaje(false);
    if (error) {
      toast.error(`No se pudo blindar: ${error.message}`);
      return;
    }
    toast.success(`${jugadorBlindaje.nombre} blindado durante 24 horas`);
    setModal(null);
    router.refresh();
  }

  async function blindar() {
    if (!jugadorBlindaje) {
      toast.error("Selecciona un jugador del miembro");
      return;
    }
    const inv = Number(invertido);
    if (!Number.isFinite(inv) || inv <= 0) {
      toast.error("Importe a invertir inválido");
      return;
    }
    if (blMiembro !== LALIGA && inv > (saldos[blMiembro] ?? 0)) {
      toast.error("Saldo insuficiente para blindar");
      return;
    }
    const prev = jugadorBlindaje.clausula ?? 0;
    const nueva = prev + 2 * inv;
    setOcupadoBlindaje(true);
    const supabase = createBrowserClient();
    const ops: Array<PromiseLike<unknown>> = [
      supabase
        .schema("liga")
        .from("movimientos")
        .insert({
          liga_id: ligaId,
          fecha,
          miembro_id: blMiembro,
          tipo: "subida_clausula",
          jugador_id: blJugadorId,
          importe: -inv,
          nota: `Blindaje de ${jugadorBlindaje.nombre}`,
        })
        .then((r) => r.error),
      supabase
        .schema("liga")
        .from("clausulas_historial")
        .insert({
          liga_id: ligaId,
          jugador_id: blJugadorId,
          miembro_id: blMiembro,
          valor: nueva,
          motivo: "subida_clausula",
        })
        .then((r) => r.error),
    ];
    const resultados = await Promise.all(ops);
    setOcupadoBlindaje(false);
    const error = resultados.find((e) => e != null) as { message?: string } | undefined;
    if (error) {
      toast.error(`No se pudo blindar: ${error?.message ?? "error"}`);
      router.refresh();
      return;
    }
    toast.success(
      `${jugadorBlindaje.nombre} blindado: cláusula ${formatValor(prev)} → ${formatValor(nueva)}`,
    );
    setInvertido("");
    setModal(null);
    router.refresh();
  }

  if (miembros.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
          <p className="text-muted-foreground">{ligaNombre}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sin miembros</CardTitle>
            <CardDescription>
              Añade a los participantes de la liga antes de registrar
              movimientos.
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
          <p className="text-muted-foreground">
            Historial de <span className="font-medium text-foreground">{ligaNombre}</span>, del
            más reciente al más antiguo.
          </p>
        </div>
        <Button onClick={() => abrirModal("mercado")}>
          <Plus className="size-4" />
          Añadir movimiento
        </Button>
      </div>

      {historial.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin movimientos</CardTitle>
            <CardDescription>
              Registra el primero con el botón &quot;Añadir movimiento&quot;.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
            <CardDescription>
              {historial.length} {historial.length === 1 ? "movimiento" : "movimientos"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            {historial.map((h, i) => (
              <div
                key={h.id}
                className={`flex items-center justify-between gap-3 py-3 ${i !== 0 ? "border-t" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`size-2.5 shrink-0 rounded-full ${DOT_COLOR[h.tipo] ?? "bg-zinc-400"}`} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold">{h.miembro}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {resumenMovimiento(h)}
                      </span>
                    </div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {formatDate(h.fecha)} · {TIPO_LABEL[h.tipo] ?? h.tipo}
                      {h.contraparte
                        ? ""
                        : h.tipo !== "subida_clausula" && h.tipo !== "blindaje"
                          ? " · LaLiga"
                          : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    h.importe > 0 ? "text-emerald-600" : h.importe < 0 ? "text-red-600" : ""
                  }`}
                >
                  {h.importe > 0 ? "+" : ""}
                  {formatValor(h.importe)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="mt-8 w-full max-w-2xl rounded-xl border bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Añadir movimiento</h2>
              <Button variant="ghost" size="icon" onClick={() => setModal(null)} aria-label="Cerrar">
                <X className="size-4" />
              </Button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={modal === "mercado" ? "default" : "outline"}
                onClick={() => setModal("mercado")}
              >
                Operación de mercado
              </Button>
              <Button
                size="sm"
                variant={modal === "blindaje" ? "default" : "outline"}
                onClick={() => setModal("blindaje")}
              >
                Blindaje (24h)
              </Button>
              <Button
                size="sm"
                variant={modal === "subida" ? "default" : "outline"}
                onClick={() => setModal("subida")}
              >
                Subida de cláusula
              </Button>
              <Button size="sm" variant="outline" disabled>
                Pago de jornada
              </Button>
            </div>

            <div className="mb-4 max-w-xs">
              <Label htmlFor="fecha">Fecha y hora</Label>
              <Input
                id="fecha"
                type="datetime-local"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Por defecto: ahora en España.
              </p>
            </div>

            {modal === "mercado" && (
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Amigo que compra</Label>
                    <select
                      className={SELECT_CLASS}
                      value={comprador}
                      onChange={(e) => setComprador(Number(e.target.value))}
                    >
                      <option value={LALIGA}>LaLiga</option>
                      {opcionesMiembros.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Amigo que vende</Label>
                    <select
                      className={SELECT_CLASS}
                      value={vendedor}
                      onChange={(e) => {
                        setVendedor(Number(e.target.value));
                        setJugadorId(null);
                        setPrecio("");
                      }}
                    >
                      <option value={LALIGA}>LaLiga</option>
                      {opcionesMiembros.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Jugador ({vendedor === LALIGA ? "libres" : "del vendedor"})</Label>
                  <Input
                    placeholder="Filtrar por nombre..."
                    value={filtroJugador}
                    onChange={(e) => setFiltroJugador(e.target.value)}
                    className="max-w-xs"
                  />
                  <select
                    className={SELECT_CLASS}
                    value={jugadorId ?? ""}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setJugadorId(v);
                      const c = candidatosMercado.find((x) => x.jugador_id === v);
                      setPrecio(String(c?.precio ?? ""));
                    }}
                  >
                    <option value="" disabled>
                      Selecciona un jugador
                    </option>
                    {candidatosMercado.map((c) => (
                      <option key={c.jugador_id} value={c.jugador_id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:max-w-xs">
                  <Label>Precio</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Button onClick={registrarMercado} disabled={ocupadoMercado}>
                    {ocupadoMercado ? "Registrando..." : "Registrar operación"}
                  </Button>
                </div>
              </div>
            )}

            {modal === "blindaje" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Blinda a un jugador tuyo para que <b>no pueda ser clausulado durante
                  24 horas</b>. No cuesta dinero.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Amigo</Label>
                    <select
                      className={SELECT_CLASS}
                      value={blMiembro}
                      onChange={(e) => {
                        setBlMiembro(Number(e.target.value));
                        setBlJugadorId(null);
                      }}
                    >
                      {opcionesMiembros.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Jugador (de su plantilla)</Label>
                    <select
                      className={SELECT_CLASS}
                      value={blJugadorId ?? ""}
                      onChange={(e) => setBlJugadorId(Number(e.target.value))}
                    >
                      <option value="" disabled>
                        Selecciona un jugador
                      </option>
                      {jugadoresBlindaje.map((p) => (
                        <option key={p.jugador_id} value={p.jugador_id}>
                          {p.nombre} ({formatValor(p.clausula)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Button onClick={registrarBlindaje} disabled={ocupadoBlindaje}>
                    {ocupadoBlindaje ? "Blindando..." : "Blindar jugador (24h)"}
                  </Button>
                </div>
              </div>
            )}

            {modal === "subida" && (
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Amigo</Label>
                    <select
                      className={SELECT_CLASS}
                      value={blMiembro}
                      onChange={(e) => {
                        setBlMiembro(Number(e.target.value));
                        setBlJugadorId(null);
                      }}
                    >
                      {opcionesMiembros.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Jugador (de su plantilla)</Label>
                    <select
                      className={SELECT_CLASS}
                      value={blJugadorId ?? ""}
                      onChange={(e) => setBlJugadorId(Number(e.target.value))}
                    >
                      <option value="" disabled>
                        Selecciona un jugador
                      </option>
                      {jugadoresBlindaje.map((p) => (
                        <option key={p.jugador_id} value={p.jugador_id}>
                          {p.nombre} ({formatValor(p.clausula)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="sm:max-w-xs">
                  <Label>Importe a invertir</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    value={invertido}
                    onChange={(e) => setInvertido(e.target.value)}
                    placeholder="0"
                  />
                  {jugadorBlindaje ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cláusula: {formatValor(jugadorBlindaje.clausula)} →{" "}
                      {formatValor((jugadorBlindaje.clausula ?? 0) + 2 * (Number(invertido) || 0))}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Button onClick={blindar} disabled={ocupadoBlindaje}>
                    {ocupadoBlindaje ? "Registrando..." : "Subir cláusula (×2)"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}