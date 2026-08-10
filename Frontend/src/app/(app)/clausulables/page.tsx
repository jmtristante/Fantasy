import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getSelectedLigaId } from "@/lib/liga";
import { getCurrentUser } from "@/lib/auth-user";
import {
  ClausulablesManager,
  type FilaRobo,
} from "@/components/clausulables-manager";

export const dynamic = "force-dynamic";

// Apreciación reciente medida con la ventana de los últimos ~5 días cotizados.
const VENTANA_DIAS = 5;

function ordenar(filas: FilaRobo[]): FilaRobo[] {
  return [...filas].sort((a, b) => {
    // Bloqueados imposibles de robar, al final.
    if (a.bloqueado !== b.bloqueado) return a.bloqueado ? 1 : -1;
    // 1) Subiendo hoy (momentum del día).
    const aSube = (a.diferencia_pct ?? 0) > 0;
    const bSube = (b.diferencia_pct ?? 0) > 0;
    if (aSube !== bSube) return aSube ? -1 : 1;
    // 2) Gap cláusula–mercado menor primero (más cerca de pagar mercado).
    const ga = a.gap_pct ?? Infinity;
    const gb = b.gap_pct ?? Infinity;
    if (ga !== gb) return ga - gb;
    // 3) Apreciación reciente mayor primero.
    return (b.aprec_5d ?? 0) - (a.aprec_5d ?? 0);
  });
}

export default async function ClausulablesPage() {
  const supabase = await createClient();
  const ligaId = await getSelectedLigaId();

  if (ligaId == null) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Oportunidades de robo</h1>
          <p className="text-muted-foreground">
            Jugadores con dueño que suben y tienen la cláusula al precio de mercado.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sin liga seleccionada</CardTitle>
            <CardDescription>
              Selecciona o crea una liga en el menú lateral (arriba) para ver las
              oportunidades de clausular barato antes de que suban más.
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

  const email = (await getCurrentUser())?.email ?? null;

  const [{ data: miembros }, { data: plantilla }] = await Promise.all([
    supabase
      .schema("liga")
      .from("v_miembros_saldo")
      .select("miembro_id, nombre, email, foto_url, saldo")
      .eq("liga_id", ligaId),
    supabase
      .schema("liga")
      .from("v_plantilla")
      .select(
        "miembro_id, miembro, jugador_id, jugador, posicion, equipo, clausula, valor_mercado, tendencia, bloqueado, bloqueado_hasta",
      )
      .eq("liga_id", ligaId),
  ]);

  const ids = [...new Set((plantilla ?? []).map((p) => p.jugador_id as number))];

  let jugadorInfo = new Map<
    number,
    { foto: string | null; escudo: string | null }
  >();
  let diferenciaPct = new Map<number, number | null>();
  let fechasRows: { fecha: string | number }[] = [];
  if (ids.length > 0) {
    const [{ data: jugadores }, { data: precios }, { data: fechasRaw }] =
      await Promise.all([
        supabase
          .from("jugadores")
          .select("jugador_id, foto_url, equipos(nombre, escudo_url)")
          .in("jugador_id", ids),
        supabase
          .from("v_precio_actual")
          .select("jugador_id, diferencia_pct")
          .in("jugador_id", ids),
        supabase
          .from("precios_diarios")
          .select("fecha")
          .in("jugador_id", ids)
          .order("fecha", { ascending: false }),
      ]);
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
            foto: (j.foto_url as string | null) ?? null,
            escudo: e?.escudo_url ?? null,
          },
        ];
      }),
    );
    diferenciaPct = new Map(
      (precios ?? []).map((p) => [
        p.jugador_id as number,
        p.diferencia_pct as number | null,
      ]),
    );
    fechasRows = (fechasRaw ?? []) as { fecha: string | number }[];
  }

  // Apreciación en los últimos ~5 días cotizados (por día natural, no por timestamp).
  const aprec5d = new Map<number, { pct: number | null; dias: number }>();
  if (ids.length > 0 && fechasRows.length > 0) {
    const diasTop = [
      ...new Set(
        (fechasRows ?? []).map((f) =>
          new Date(f.fecha as string).toISOString().slice(0, 10),
        ),
      ),
    ].slice(0, VENTANA_DIAS + 1);
    if (diasTop.length > 1) {
      const desde = `${diasTop[diasTop.length - 1]}T00:00:00.000Z`;
      const { data: historial } = await supabase
        .from("precios_diarios")
        .select("jugador_id, fecha, valor")
        .in("jugador_id", ids)
        .gte("fecha", desde);
      // Último valor de cada jugador por día natural.
      const ultimoPorDia = new Map<number, Map<string, number>>();
      for (const r of historial ?? []) {
        const jid = r.jugador_id as number;
        const dia = new Date(r.fecha as string).toISOString().slice(0, 10);
        const m = ultimoPorDia.get(jid) ?? new Map<string, number>();
        m.set(dia, r.valor as number);
        ultimoPorDia.set(jid, m);
      }
      for (const jid of ids) {
        const fv = ultimoPorDia.get(jid);
        const diasValidos = fv
          ? diasTop.filter((d) => fv.has(d))
          : [];
        // Hace falta, al menos, un día de base.
        if (!fv || diasValidos.length < 2) {
          aprec5d.set(jid, { pct: null, dias: 0 });
          continue;
        }
        const actual = fv.get(diasValidos[0]);
        const base = fv.get(diasValidos[diasValidos.length - 1]);
        const pct =
          actual == null || base == null || base === 0
            ? null
            : ((actual - base) / base) * 100;
        aprec5d.set(jid, { pct, dias: diasValidos.length });
      }
    }
  }

  const miembroPorId = new Map(
    (miembros ?? []).map((m) => [m.miembro_id as number, m]),
  );
  const yo =
    email != null
      ? (miembros ?? []).find(
          (m) =>
            m.email != null && m.email.toLowerCase() === email.toLowerCase(),
        ) ?? null
      : null;
  const miSaldo = yo?.saldo ?? null;

  const filas: FilaRobo[] = (plantilla ?? []).map((p) => {
    const jid = p.jugador_id as number;
    const clausula = p.clausula as number | null;
    const mercado = p.valor_mercado as number | null;
    const gapPct =
      clausula != null && mercado != null && mercado > 0
        ? ((clausula - mercado) / mercado) * 100
        : null;
    const ratio =
      clausula != null && mercado != null && clausula > 0
        ? mercado / clausula
        : null;
    const info = jugadorInfo.get(jid);
    const dueno = miembroPorId.get(p.miembro_id as number);
    const hoy = diferenciaPct.get(jid) ?? null;
    const ap = aprec5d.get(jid);
    // Tasa diaria estimada ponderada: el día de hoy manda (90%) sobre la
    // tendencia reciente (10%), porque un mal partido puede frenar la subida.
    const tasa5d =
      ap?.pct != null && ap.dias > 0 ? ap.pct / ap.dias : null;
    const tasaDiaria =
      hoy != null && tasa5d != null
        ? hoy * 0.9 + tasa5d * 0.1
        : (hoy ?? tasa5d);
    const valorEstimado14d =
      mercado != null && tasaDiaria != null
        ? Math.round(mercado * Math.pow(1 + tasaDiaria / 100, 14))
        : null;
    const ganancia14d =
      valorEstimado14d != null && clausula != null
        ? valorEstimado14d - clausula
        : null;
    return {
      jugador_id: jid,
      nombre: p.jugador as string,
      posicion: (p.posicion as string | null) ?? null,
      equipo: (p.equipo as string | null) ?? null,
      foto: info?.foto ?? null,
      escudo: info?.escudo ?? null,
      dueno_id: p.miembro_id as number,
      dueno: (p.miembro as string) ?? "—",
      dueno_foto: dueno?.foto_url ?? null,
      clausula,
      mercado,
      gap_pct: gapPct,
      ratio,
      diferencia_pct: diferenciaPct.get(jid) ?? null,
      tendencia: (p.tendencia as number | null) ?? null,
      aprec_5d: aprec5d.get(jid)?.pct ?? null,
      valor_estimado_14d: valorEstimado14d,
      ganancia_14d: ganancia14d,
      bloqueado: (p.bloqueado as boolean) ?? false,
      bloqueado_hasta: (p.bloqueado_hasta as string | null) ?? null,
    };
  });

  return (
    <ClausulablesManager
      filas={ordenar(filas)}
      miSaldo={miSaldo}
    />
  );
}