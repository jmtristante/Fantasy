import Link from "next/link";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatValor } from "@/lib/format";
import { CreateLigaForm } from "@/components/create-liga-form";
import { DeleteLigaButton } from "@/components/delete-liga-button";

export const dynamic = "force-dynamic";

const LIGA_LOGO = "https://assets.laliga.com/assets/logos/LL_RGB_h_color/LL_RGB_h_color.png";

export default async function LigasPage({
  searchParams,
}: {
  searchParams: Promise<{ crear?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ligas, error } = await supabase
    .schema("liga")
    .from("ligas")
    .select("id, nombre, temporada, presupuesto, descripcion, creado, mercado_reset_hora")
    .order("nombre");

  const { data: misFichas } = user?.email
    ? await supabase
        .schema("liga")
        .from("miembros")
        .select("liga_id, es_admin")
        .ilike("email", user.email)
    : { data: null };

  const ligasAdmin = new Set<number>(
    (misFichas ?? [])
      .filter((m) => m.es_admin === true)
      .map((m) => m.liga_id as number),
  );

  const params = await searchParams;
  const mostrarForm = params.crear === "1";

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mis ligas</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Esquema &quot;liga&quot; no disponible</CardTitle>
            <CardDescription>
              El backend ya tiene el esquema <code>liga</code> y sus permisos,
              pero PostgREST no lo sirve todavía. Exponlo desde el Dashboard:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>Supabase Dashboard → Project → <b>Settings</b> → <b>API</b>.</li>
              <li>En <b>Exposed schemas</b>, añade <code>liga</code>.</li>
              <li>Guarda y refresca esta página.</li>
            </ol>
            <pre className="mt-4 overflow-auto rounded-md bg-muted p-4 text-xs">
{`-- Opción SQL equivalente (requiere recarga de PostgREST):
ALTER ROLE authenticator SET pgrst.db_schemas TO 'public, graphql_public, liga';
NOTIFY pgrst, 'reload config';`}
            </pre>
            <p className="mt-2 text-sm text-muted-foreground">
              El rol y los grants (USAGE + CRUD para <code>authenticated</code>)
              ya están aplicados; solo falta exponer el esquema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mis ligas</h1>
          <p className="text-muted-foreground">
            Tus ligas privadas creadas en el esquema &quot;liga&quot;.
          </p>
        </div>
      </div>

      {mostrarForm && <CreateLigaForm />}

      <div className="flex flex-wrap gap-2">
        <Link href="/ligas?crear=1" className={buttonVariants({ size: "sm" })}>
          + Nueva liga
        </Link>
        {mostrarForm && (
          <Link href="/ligas" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Cancelar
          </Link>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Temporada</TableHead>
              <TableHead className="text-right">Presupuesto</TableHead>
              <TableHead>Reinicio mercado</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(ligas ?? []).map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-border">
                      <img
                        src={LIGA_LOGO}
                        alt="Logo LaLiga"
                        className="size-full object-contain p-0.5"
                      />
                    </div>
                    {l.nombre}
                  </div>
                </TableCell>
                <TableCell>
                  {l.temporada ? <Badge variant="secondary">{l.temporada}</Badge> : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatValor(l.presupuesto ?? null)}
                </TableCell>
                <TableCell>
                  {l.mercado_reset_hora
                    ? String(l.mercado_reset_hora).slice(0, 5)
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{l.descripcion ?? "—"}</TableCell>
                <TableCell>
                  {ligasAdmin.has(l.id as number) && <DeleteLigaButton id={l.id as number} />}
                </TableCell>
              </TableRow>
            ))}
            {!ligas || ligas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Todavía no tienes ligas. Crea una nueva.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}