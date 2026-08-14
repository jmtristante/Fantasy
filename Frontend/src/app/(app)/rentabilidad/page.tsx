import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getSelectedLigaId } from "@/lib/liga";
import { RentabilidadManager, type FilaJugador, type ResumenMiembro } from "@/components/rentabilidad-manager";

export const dynamic = "force-dynamic";

export default async function RentabilidadPage() {
  const supabase = await createClient();
  const ligaId = await getSelectedLigaId();

  if (ligaId == null) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rentabilidad</h1>
          <p className="text-muted-foreground">
            Cuánto rinde cada jugador frente a lo invertido en fichaje y subidas de cláusula.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sin liga seleccionada</CardTitle>
            <CardDescription>
              Selecciona o crea una liga en el menú lateral (arriba) para ver la
              rentabilidad de cada amigo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ligas?crear=1" className={buttonVariants({ size: "sm" })}>
              Crear liga
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [
    { data: miembros },
    { data: movimientos },
    { data: drafts },
    { data: plantillas },
    { data: precios },
    { data: ligaInfo },
  ] = await Promise.all([
      supabase
        .schema("liga")
        .from("miembros")
        .select("id, nombre, foto_url, presupuesto_inicial")
        .eq("liga_id", ligaId)
        .order("nombre"),
      supabase
        .schema("liga")
        .from("movimientos")
        .select("tipo, importe, miembro_id, jugador_id, fecha")
        .eq("liga_id", ligaId),
      supabase
        .schema("liga")
        .from("clausulas_historial")
        .select("miembro_id, jugador_id, valor, fecha")
        .eq("liga_id", ligaId)
        .eq("motivo", "draft_inicial"),
      supabase
        .schema("liga")
        .from("plantillas")
        .select("miembro_id, jugador_id, desde")
        .eq("liga_id", ligaId),
      supabase
        .from("v_precio_actual")
        .select("jugador_id, valor, diferencia, diferencia_pct, tendencia, aceleracion_estado"),
      supabase
        .schema("liga")
        .from("ligas")
        .select("creado")
        .eq("id", ligaId)
        .single(),
    ]);

  const valorPorJugador = new Map(
    (precios ?? []).map((p) => [p.jugador_id as number, p.valor as number | null]),
  );
  const diferenciaPorJugador = new Map(
    (precios ?? []).map((p) => [p.jugador_id as number, p.diferencia as number | null]),
  );
  const diferenciaPctPorJugador = new Map(
    (precios ?? []).map((p) => [p.jugador_id as number, p.diferencia_pct as number | null]),
  );
  const tendenciaPorJugador = new Map(
    (precios ?? []).map((p) => [p.jugador_id as number, p.tendencia as number | null]),
  );
  const acelEstadoPorJugador = new Map(
    (precios ?? []).map((p) => [p.jugador_id as number, (p.aceleracion_estado as string | null) ?? null]),
  );

  type Stub = {
    invertido: number;
    devuelto: number;
    fichaje: number;
    subidas: number;
    ventas: number;
  };
  const porKey = new Map<string, Stub>();
  const keyDe = (m: number, j: number) => `${m}:${j}`;
  const stub = (m: number, j: number): Stub => {
    const k = keyDe(m, j);
    let s = porKey.get(k);
    if (!s) {
      s = { invertido: 0, devuelto: 0, fichaje: 0, subidas: 0, ventas: 0 };
      porKey.set(k, s);
    }
    return s;
  };

  // Fichaje e invertido por compras/subidas de clausula.
  //  - compra_mercado (y clausula pagada) -> fichaje: precio por el que se compró.
  //  - subida_clausula -> subidas: dinero invertido para subir la cláusula.
  for (const mv of movimientos ?? []) {
    if (mv.miembro_id == null || mv.jugador_id == null) continue;
    const s = stub(mv.miembro_id as number, mv.jugador_id as number);
    if (mv.importe < 0) {
      const gasto = -(mv.importe as number);
      s.invertido += gasto;
      if (mv.tipo === "subida_clausula") {
        s.subidas += gasto;
      } else {
        s.fichaje += gasto;
      }
    } else {
      const ingreso = mv.importe as number;
      s.devuelto += ingreso;
      s.ventas += ingreso;
    }
  }

  // Fichaje de los jugadores asignados en la plantilla inicial: se contabiliza
  // como su valor de mercado en la fecha en que entraron al equipo, no como la
  // cláusula con la que se dieron de alta.
  const precioEntradaPorJugador = new Map<number, number>();
  if ((drafts ?? []).length > 0) {
    const preciosEntrada = await Promise.all(
      (drafts ?? []).map((d) =>
        d.fecha == null
          ? Promise.resolve(undefined)
          : supabase
              .from("precios_diarios")
              .select("valor")
              .eq("jugador_id", d.jugador_id as number)
              .lte("fecha", d.fecha as string)
              .order("fecha", { ascending: false })
              .limit(1)
              .then((r) => (r.data?.[0]?.valor as number | undefined) ?? undefined),
      ),
    );
    (drafts ?? []).forEach((d, i) => {
      const v = preciosEntrada[i];
      if (v != null) precioEntradaPorJugador.set(d.jugador_id as number, v);
    });
  }
  for (const d of drafts ?? []) {
    if (d.miembro_id == null || d.jugador_id == null) continue;
    const s = stub(d.miembro_id as number, d.jugador_id as number);
    const valorMercado =
      precioEntradaPorJugador.get(d.jugador_id as number) ??
      valorPorJugador.get(d.jugador_id as number) ??
      0;
    s.invertido += valorMercado;
    s.fichaje += valorMercado;
  }

  // Valor actual: si el jugador sigue en plantilla del miembro.
  const owners = new Map<string, { jugador_id: number; miembro_id: number }>();
  for (const p of plantillas ?? []) {
    if (p.miembro_id == null || p.jugador_id == null) continue;
    const m = p.miembro_id as number;
    const j = p.jugador_id as number;
    owners.set(`${m}:${j}`, { jugador_id: j, miembro_id: m });
  }
  for (const o of owners.values()) {
    const s = stub(o.miembro_id, o.jugador_id);
    const valor = valorPorJugador.get(o.jugador_id) ?? null;
    if (valor != null) s.devuelto += valor;
  }

  const ids = new Set<number>();
  for (const s of porKey.keys()) ids.add(Number(s.split(":")[1]));

  let jugadorInfo = new Map<number, { nombre: string; equipo: string | null; foto: string | null; escudo: string | null }>();
  if (ids.size > 0) {
    const { data: jugadores } = await supabase
      .from("jugadores")
      .select("jugador_id, nombre, foto_url, equipos(nombre, escudo_url)")
      .in("jugador_id", [...ids]);
    jugadorInfo = new Map(
      (jugadores ?? []).map((j) => {
        const eq = j.equipos as
          | { nombre: string; escudo_url: string | null }
          | { nombre: string; escudo_url: string | null }[]
          | null;
        const e = Array.isArray(eq) ? eq[0] : eq;
        return [
          j.jugador_id as number,
          {
            nombre: j.nombre as string,
            equipo: e?.nombre ?? null,
            foto: (j.foto_url as string | null) ?? null,
            escudo: e?.escudo_url ?? null,
          },
        ];
      }),
    );
  }

  const filasPorMiembro = new Map<number, FilaJugador[]>();
  for (const [k, s] of porKey.entries()) {
    const [miembroIdRaw, jugadorIdRaw] = k.split(":");
    const miembroId = Number(miembroIdRaw);
    const jugadorId = Number(jugadorIdRaw);
    const info = jugadorInfo.get(jugadorId);
    const enPlantilla = owners.has(k);
    const fila: FilaJugador = {
      jugador_id: jugadorId,
      nombre: info?.nombre ?? "Jugador",
      equipo: info?.equipo ?? null,
      foto: info?.foto ?? null,
      escudo: info?.escudo ?? null,
      fichaje: s.fichaje,
      subidas: s.subidas,
      ventas: s.ventas,
      valor_actual: enPlantilla ? valorPorJugador.get(jugadorId) ?? null : null,
      diferencia_diaria: diferenciaPorJugador.get(jugadorId) ?? null,
      diferencia_pct_diaria: diferenciaPctPorJugador.get(jugadorId) ?? null,
      tendencia: tendenciaPorJugador.get(jugadorId) ?? null,
      aceleracion_estado: acelEstadoPorJugador.get(jugadorId) ?? null,
      en_plantilla: enPlantilla,
      invertido: s.invertido,
      devuelto: s.devuelto,
      rentabilidad: s.devuelto - s.invertido,
    };
    const lista = filasPorMiembro.get(miembroId) ?? [];
    lista.push(fila);
    filasPorMiembro.set(miembroId, lista);
  }

  const resumen = (miembros ?? []).map((m) => {
    const filas = filasPorMiembro.get(m.id as number) ?? [];
    const totales = filas.reduce(
      (acc, f) => ({ invertido: acc.invertido + f.invertido, devuelto: acc.devuelto + f.devuelto }),
      { invertido: 0, devuelto: 0 },
    );
    const subidaHoy = filas
      .filter((f) => f.en_plantilla)
      .reduce((acc, f) => acc + (f.diferencia_diaria ?? 0), 0);
    return {
      id: m.id as number,
      nombre: m.nombre as string,
      foto: (m.foto_url as string | null) ?? null,
      filas,
      invertido: totales.invertido,
      devuelto: totales.devuelto,
      rentabilidad: totales.devuelto - totales.invertido,
      subida_hoy: subidaHoy,
    } satisfies ResumenMiembro;
  });

  // Serie historica: patrimonio de cada amigo dia a dia = valoracion de su
  // equipo (suma del valor de mercado de los jugadores que tiene ese dia) mas
  // el dinero en mano (presupuesto inicial + movimientos acumulados hasta el dia).
  // El eje X arranca en la fecha de creacion de la liga.
  const VENTANA_DIAS = 56;
  const creado = ligaInfo?.creado ? new Date(ligaInfo.creado as string) : null;
  const inicioISO = (
    creado ?? new Date(Date.now() - VENTANA_DIAS * 24 * 60 * 60 * 1000)
  ).toISOString();
  const toDayStart = (f: string | Date) => {
    const d = new Date(f);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };

  // Altas/bajas por (miembro, jugador) para saber que equipo tenia cada dia.
  type Hold = { j: number; acq: number; sale: number | null };
  const holds = new Map<string, Hold>();
  const setHold = (m: number | null, j: number | null, kind: "acq" | "sale", ts: number) => {
    if (m == null || j == null) return;
    const k = `${m}:${j}`;
    let h = holds.get(k);
    if (!h) {
      h = { j, acq: Infinity, sale: null };
      holds.set(k, h);
    }
    if (kind === "acq") {
      if (ts < h.acq) h.acq = ts;
    } else if (h.sale == null || ts > h.sale) {
      h.sale = ts;
    }
  };
  for (const d of drafts ?? []) {
    setHold(d.miembro_id, d.jugador_id, "acq", toDayStart(d.fecha as string));
  }
  for (const mv of movimientos ?? []) {
    const ts = toDayStart(mv.fecha as string);
    if ((mv.importe as number) < 0) setHold(mv.miembro_id, mv.jugador_id, "acq", ts);
    else if ((mv.importe as number) > 0) setHold(mv.miembro_id, mv.jugador_id, "sale", ts);
  }
  // En plantilla sin movimiento conocido (p.ej. comprado al banco): alta = 'desde'.
  for (const p of plantillas ?? []) {
    const k = `${p.miembro_id}:${p.jugador_id}`;
    if (!holds.has(k) && p.miembro_id != null && p.jugador_id != null) {
      holds.set(k, {
        j: p.jugador_id as number,
        acq: toDayStart(p.desde as string),
        sale: null,
      });
    }
  }

  // Cash acumulado por amigo: presupuesto inicial + importes de movimientos.
  const presu = new Map<number, number>();
  for (const m of miembros ?? []) presu.set(m.id as number, (m.presupuesto_inicial as number) ?? 0);
  const importesPorMiembro = new Map<number, { ts: number; imp: number }[]>();
  for (const mv of movimientos ?? []) {
    if (mv.miembro_id == null) continue;
    const arr = importesPorMiembro.get(mv.miembro_id as number) ?? [];
    arr.push({ ts: toDayStart(mv.fecha as string), imp: mv.importe as number });
    importesPorMiembro.set(mv.miembro_id as number, arr);
  }
  for (const arr of importesPorMiembro.values()) arr.sort((a, b) => a.ts - b.ts);

  // Precios diarios de los jugadores que han pasado por algun equipo.
  const jugadorIds = [...new Set([...holds.values()].map((h) => h.j))];
  let serieRentabilidad: {
    fechas: string[];
    amigos: { id: number; nombre: string; datos: (number | null)[] }[];
  } = { fechas: [], amigos: [] };
  if (jugadorIds.length > 0) {
      const { data: preciosDiarios } = await supabase
        .from("precios_diarios")
        .select("jugador_id, fecha, valor")
        .in("jugador_id", jugadorIds)
        .gte("fecha", inicioISO)
        .order("fecha")
        .range(0, 100000);
    const preciosPorDia = new Map<string, Map<number, number>>();
    for (const pd of preciosDiarios ?? []) {
      const d = new Date(pd.fecha as string);
      const label = `${d.getDate().toString().padStart(2, "0")}/${(
        d.getMonth() + 1
      ).toString().padStart(2, "0")}`;
      let m = preciosPorDia.get(label);
      if (!m) {
        m = new Map();
        preciosPorDia.set(label, m);
      }
      m.set(pd.jugador_id as number, pd.valor as number);
    }
    const hoy = new Date();
    const hoyLabel = `${hoy.getDate().toString().padStart(2, "0")}/${(
      hoy.getMonth() + 1
    ).toString().padStart(2, "0")}`;
    // Eje X continuo desde la fecha de creacion de la liga hasta hoy.
    const diasArr: { ts: number; label: string }[] = [];
    const inicioDia = toDayStart(inicioISO);
    const finDia = toDayStart(hoy);
    for (let t = inicioDia; t <= finDia; t += 24 * 60 * 60 * 1000) {
      const d = new Date(t);
      const label = `${d.getDate().toString().padStart(2, "0")}/${(
        d.getMonth() + 1
      ).toString().padStart(2, "0")}`;
      diasArr.push({ ts: t, label });
    }
    if (diasArr.length === 0) {
      diasArr.push({ ts: finDia, label: hoyLabel });
    }
    const fechas = diasArr.map((x) => x.label);
    serieRentabilidad = {
      fechas,
      amigos: (miembros ?? []).map((m) => {
        const mid = m.id as number;
        const importes = importesPorMiembro.get(mid) ?? [];
        const ultimo = new Map<number, number>();
        for (const h of holds.values()) {
          if (h.j != null && `${mid}:${h.j}`.startsWith(`${mid}:`)) {
            ultimo.set(h.j, valorPorJugador.get(h.j) ?? 0);
          }
        }
        return {
          id: mid,
          nombre: m.nombre as string,
          datos: diasArr.map((dia) => {
            let cash = presu.get(mid) ?? 0;
            for (const it of importes) {
              if (it.ts <= dia.ts) cash += it.imp;
              else break;
            }
            let equipo = 0;
            for (const [k, h] of holds) {
              if (!k.startsWith(`${mid}:`)) continue;
              if (dia.ts < h.acq) continue;
              if (h.sale != null && dia.ts >= h.sale) continue;
              const pm = preciosPorDia.get(dia.label);
              const p =
                dia.label === hoyLabel
                  ? (valorPorJugador.get(h.j) ?? pm?.get(h.j) ?? 0)
                  : (pm?.get(h.j) ?? ultimo.get(h.j) ?? 0);
              ultimo.set(h.j, p);
              equipo += p;
            }
            return cash + equipo;
          }),
        };
      }),
    };
  }

  return <RentabilidadManager resumen={resumen} serieRentabilidad={serieRentabilidad} />;
}