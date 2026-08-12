"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Clock, Loader2, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatValor, formatDate } from "@/lib/format";

const LALIGA = 0;

const LIGA_LOGO = "https://assets.laliga.com/assets/logos/LL_RGB_h_color/LL_RGB_h_color.png";

function EntidadAvatar({
  nombre,
  foto,
}: {
  nombre: string | null;
  foto: string | null;
}) {
  if (nombre === "LaLiga") {
    return (
      <div className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-border">
        <img src={LIGA_LOGO} alt="LaLiga" className="size-full object-contain p-1" />
      </div>
    );
  }
  if (foto) {
    return (
      <img src={foto} alt={nombre ?? ""} className="size-9 rounded-full border object-cover" />
    );
  }
  return (
    <div className="flex size-9 items-center justify-center rounded-full border bg-muted text-[10px] font-semibold text-muted-foreground">
      {nombre ? nombre.slice(0, 2).toUpperCase() : "?"}
    </div>
  );
}

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
  compra_mercado: "bg-emerald-600",
  venta_mercado: "bg-red-600",
  subida_clausula: "bg-blue-500",
  blindaje: "bg-orange-500",
  clausula: "bg-purple-500",
  pago_jornada: "bg-amber-500",
  entrada: "bg-emerald-600",
  salida: "bg-red-600",
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
  esAdmin,
  miembros,
  libres,
  plantilla,
  historial,
}: {
  ligaId: number;
  ligaNombre: string;
  esAdmin: boolean;
  miembros: { id: number; nombre: string; foto: string | null }[];
  libres: { jugador_id: number; nombre: string; precio: number | null }[];
  plantilla: {
    miembro_id: number;
    miembro: string;
    jugador_id: number;
    nombre: string;
    clausula: number | null;
    valor_mercado: number | null;
  }[];
  historial: {
    id: number;
    fecha: string;
    tipo: string;
    miembro_id: number | null;
    miembro: string;
    miembro_foto: string | null;
    contraparte_id: number | null;
    contraparte: string | null;
    contraparte_foto: string | null;
    jugador_id: number | null;
    jugador: string | null;
    jugador_foto: string | null;
    jugador_escudo: string | null;
    importe: number;
    nota: string | null;
  }[];
}) {
  const router = useRouter();

  const [modal, setModal] = useState<"mercado" | "blindaje" | "subida" | null>(null);
  const [fecha, setFecha] = useState("");

  // Edición de un movimiento existente (historial)
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [borrandoId, setBorrandoId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    fecha: "",
    tipo: "",
    miembroId: 0,
    jugadorId: "",
    contraparteId: "",
    importe: "",
    nota: "",
  });

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

  // Filtros del historial
  const hoyLocal = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  }, []);
  const [filtroPersona, setFiltroPersona] = useState<number | "laliga" | null>(null);
  const [filtroFecha, setFiltroFecha] = useState<string>(hoyLocal);

  const historialFiltrado = useMemo(() => {
    let rows = historial;
    if (filtroFecha) {
      rows = rows.filter((h) => (h.fecha ?? "").slice(0, 10) === filtroFecha);
    }
    if (filtroPersona != null) {
      if (filtroPersona === "laliga") {
        rows = rows.filter((h) => h.contraparte_id == null && h.tipo !== "blindaje" && h.tipo !== "subida_clausula");
      } else {
        rows = rows.filter(
          (h) => h.miembro_id === filtroPersona || h.contraparte_id === filtroPersona,
        );
      }
    }
    return rows;
  }, [historial, filtroPersona, filtroFecha]);

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

  const opcionesJugador = useMemo(() => {
    const vistos = new Map<number, { jugador_id: number; nombre: string }>();
    for (const l of libres) vistos.set(l.jugador_id, { jugador_id: l.jugador_id, nombre: l.nombre });
    for (const p of plantilla) vistos.set(p.jugador_id, { jugador_id: p.jugador_id, nombre: p.nombre });
    return Array.from(vistos.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [libres, plantilla]);

  function abrirEdicion(h: (typeof historial)[number]) {
    setEditForm({
      fecha: (h.fecha ?? "").slice(0, 16),
      tipo: h.tipo,
      miembroId: h.miembro_id ?? 0,
      jugadorId: h.jugador_id != null ? String(h.jugador_id) : "",
      contraparteId: h.contraparte_id != null ? String(h.contraparte_id) : "",
      importe: String(h.importe ?? 0),
      nota: h.nota ?? "",
    });
    setEditandoId(h.id);
  }

  async function guardarEdicion() {
    if (editandoId == null) return;
    const importeNum = Number(editForm.importe);
    if (!Number.isFinite(importeNum)) {
      toast.error("Importe inválido");
      return;
    }
    const supabase = createBrowserClient();
    const { error } = await supabase
      .schema("liga")
      .from("movimientos")
      .update({
        fecha: editForm.fecha ? new Date(editForm.fecha).toISOString() : undefined,
        tipo: editForm.tipo || undefined,
        miembro_id: editForm.miembroId || null,
        jugador_id: editForm.jugadorId ? Number(editForm.jugadorId) : null,
        contraparte: editForm.contraparteId ? Number(editForm.contraparteId) : null,
        importe: importeNum,
        nota: editForm.nota.trim() || null,
      })
      .eq("id", editandoId);
    if (error) {
      toast.error(`No se pudo guardar: ${error.message}`);
      return;
    }
    toast.success("Movimiento actualizado");
    setEditandoId(null);
    router.refresh();
  }

  async function borrarMovimiento(id: number) {
    if (!confirm("¿Borrar este movimiento del historial? Esta acción no se puede deshacer.")) {
      return;
    }
    setBorrandoId(id);
    const supabase = createBrowserClient();
    const { error } = await supabase.schema("liga").from("movimientos").delete().eq("id", id);
    setBorrandoId(null);
    if (error) {
      toast.error(`No se pudo borrar: ${error.message}`);
      return;
    }
    toast.success("Movimiento borrado");
    router.refresh();
  }

  function flujo(h: (typeof historial)[number]): {
    origen: { nombre: string; foto: string | null } | null;
    destino: { nombre: string; foto: string | null } | null;
  } {
    if (h.tipo === "compra_mercado" || h.tipo === "clausula") {
      return {
        origen: h.contraparte
          ? { nombre: h.contraparte, foto: h.contraparte_foto }
          : { nombre: "LaLiga", foto: null },
        destino: { nombre: h.miembro, foto: h.miembro_foto },
      };
    }
    if (h.tipo === "venta_mercado") {
      return {
        origen: { nombre: h.miembro, foto: h.miembro_foto },
        destino: h.contraparte
          ? { nombre: h.contraparte, foto: h.contraparte_foto }
          : { nombre: "LaLiga", foto: null },
      };
    }
    return {
      origen: { nombre: h.miembro, foto: h.miembro_foto },
      destino: null,
    };
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
    const buyerIs = comprador !== LALIGA;
    const sellerIs = vendedor !== LALIGA;
    setOcupadoMercado(true);
    const supabase = createBrowserClient();
    const notaCompra = buyerIs
      ? `Compra de ${jugadorMercado.nombre}${sellerIs ? ` a ${miembros.find((m) => m.id === vendedor)?.nombre ?? "un amigo"}` : " a LaLiga"}`
      : null;
    const notaVenta = sellerIs
      ? `Venta de ${jugadorMercado.nombre}${buyerIs ? ` a ${miembros.find((m) => m.id === comprador)?.nombre ?? "un amigo"}` : " a LaLiga"}`
      : null;

    const { error } = await supabase.rpc("registrar_operacion_mercado", {
      p_liga_id: ligaId,
      p_fecha: fecha,
      p_comprador: comprador,
      p_vendedor: vendedor,
      p_jugador_id: jugadorMercado.jugador_id,
      p_precio: precioNum,
      p_nota_compra: notaCompra,
      p_nota_venta: notaVenta,
    });
    setOcupadoMercado(false);
    if (error) {
      toast.error(`No se pudo registrar la operación: ${error.message}`);
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
        {esAdmin && (
          <Button onClick={() => abrirModal("mercado")}>
            <Plus className="size-4" />
            Añadir movimiento
          </Button>
        )}
      </div>

      {historial.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin movimientos</CardTitle>
            <CardDescription>
              {esAdmin
                ? "Registra el primero con el botón \"Añadir movimiento\"."
                : "La liga todavía no tiene movimientos."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Historial</CardTitle>
                <CardDescription>
                  {historialFiltrado.length}{" "}
                  {historialFiltrado.length === 1 ? "movimiento" : "movimientos"}
                  {filtroPersona != null || filtroFecha
                    ? ` de ${historial.length} en total`
                    : ""}
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filtro por persona */}
                <Label className="text-xs text-muted-foreground">Persona</Label>
                <select
                  className={SELECT_CLASS.replace("w-full", "w-auto")}
                  value={filtroPersona == null ? "all" : String(filtroPersona)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFiltroPersona(v === "all" ? null : v === "laliga" ? "laliga" : Number(v));
                  }}
                >
                  <option value="all">Todos</option>
                  <option value="laliga">LaLiga</option>
                  {miembros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>

                {/* Filtro por día */}
                <Label className="text-xs text-muted-foreground">Día</Label>
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col">
            {historialFiltrado.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ningún movimiento coincide con el filtro.
              </p>
            ) : null}
            {historialFiltrado.map((h, i) => {
              const f = flujo(h);
              return (
                <div
                  key={h.id}
                  className={`flex flex-wrap items-center justify-between gap-3 py-3 ${i !== 0 ? "border-t" : ""}`}
                >
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {/* Origen */}
                      <div className="flex flex-col items-center gap-1">
                        {f.origen ? <EntidadAvatar nombre={f.origen.nombre} foto={f.origen.foto} /> : null}
                        <span className="max-w-[90px] truncate text-[11px] leading-tight text-muted-foreground">
                          {f.origen?.nombre ?? ""}
                        </span>
                      </div>

                      {/* Flecha y jugador */}
                      <div className="flex min-w-0 flex-col items-center gap-1">
                        {h.jugador && h.jugador_foto ? (
                          <div className="relative">
                            <img
                              src={h.jugador_foto}
                              alt={h.jugador}
                              className="size-12 rounded-md border object-cover shadow-sm"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                            {h.jugador_escudo && (
                              <img
                                src={h.jugador_escudo}
                                alt=""
                                className="absolute -left-1.5 -top-1.5 size-5 rounded-full object-contain"
                              />
                            )}
                          </div>
                        ) : (
                          <div className="flex size-12 items-center justify-center rounded-md border bg-muted text-xs font-semibold text-muted-foreground">
                            {h.jugador ? h.jugador.slice(0, 2).toUpperCase() : <span className="text-base">⚽</span>}
                          </div>
                        )}
                        <span
                          className={`${
                            f.destino ? "text-muted-foreground" : ""
                          } text-[10px] font-medium uppercase tracking-wide`}
                        >
                          {f.destino ? "⟶" : ""}
                        </span>
                      </div>

                      {/* Destino */}
                      {f.destino && (
                        <div className="flex flex-col items-center gap-1">
                          <EntidadAvatar nombre={f.destino.nombre} foto={f.destino.foto} />
                          <span className="max-w-[90px] truncate text-[11px] leading-tight text-muted-foreground">
                            {f.destino.nombre}
                          </span>
                        </div>
                      )}

                      <span
                        className={`size-2.5 shrink-0 rounded-full ${DOT_COLOR[h.tipo] ?? "bg-zinc-400"}`}
                      />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-sm font-semibold">
                            {TIPO_LABEL[h.tipo] ?? h.tipo}
                          </span>
                          {h.nota ? (
                            <span className="truncate text-sm text-muted-foreground">
                              {h.nota}
                            </span>
                          ) : (
                            <span className="truncate text-sm italic text-muted-foreground">
                              {resumenMovimiento(h)}
                            </span>
                          )}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {formatDate(h.fecha)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        h.importe > 0 ? "text-emerald-600" : h.importe < 0 ? "text-red-600" : ""
                      }`}
                    >
                      {h.importe > 0 ? "+" : ""}
                      {formatValor(h.importe)}
                    </span>
                    {esAdmin && (
                      <div className="flex items-center gap-1">
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Editar ${h.id}`}
                          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                          onClick={() => abrirEdicion(h)}
                        >
                          <svg
                            className="size-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Borrar ${h.id}`}
                          className="cursor-pointer rounded-md p-1.5 text-destructive transition-colors hover:bg-muted"
                          onClick={() => borrarMovimiento(h.id)}
                        >
                          {borrandoId === h.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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

      {editandoId != null && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onClick={() => setEditandoId(null)}
        >
          <div
            className="mt-8 w-full max-w-2xl rounded-xl border bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editar movimiento</h2>
              <Button variant="ghost" size="icon" onClick={() => setEditandoId(null)} aria-label="Cerrar">
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edtFecha">Fecha y hora</Label>
                <Input
                  id="edtFecha"
                  type="datetime-local"
                  value={editForm.fecha}
                  onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edtTipo">Tipo</Label>
                <select
                  id="edtTipo"
                  className={SELECT_CLASS}
                  value={editForm.tipo}
                  onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                >
                  {Object.entries(TIPO_LABEL).map(([valor, label]) => (
                    <option key={valor} value={valor}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edtMiembro">Miembro</Label>
                <select
                  id="edtMiembro"
                  className={SELECT_CLASS}
                  value={editForm.miembroId}
                  onChange={(e) => setEditForm({ ...editForm, miembroId: Number(e.target.value) })}
                >
                  {miembros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edtJugador">Jugador</Label>
                <select
                  id="edtJugador"
                  className={SELECT_CLASS}
                  value={editForm.jugadorId}
                  onChange={(e) => setEditForm({ ...editForm, jugadorId: e.target.value })}
                >
                  <option value="">Sin jugador</option>
                  {opcionesJugador.map((j) => (
                    <option key={j.jugador_id} value={j.jugador_id}>
                      {j.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edtContraparte">Contraparte</Label>
                <select
                  id="edtContraparte"
                  className={SELECT_CLASS}
                  value={editForm.contraparteId}
                  onChange={(e) => setEditForm({ ...editForm, contraparteId: e.target.value })}
                >
                  <option value="">LaLiga / sin contraparte</option>
                  {miembros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edtImporte">Importe</Label>
                <Input
                  id="edtImporte"
                  type="number"
                  value={editForm.importe}
                  onChange={(e) => setEditForm({ ...editForm, importe: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Label htmlFor="edtNota">Nota</Label>
              <Input
                id="edtNota"
                value={editForm.nota}
                onChange={(e) => setEditForm({ ...editForm, nota: e.target.value })}
                placeholder="Opcional"
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setEditandoId(null)}>
                Cancelar
              </Button>
              <Button onClick={guardarEdicion}>Guardar cambios</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}