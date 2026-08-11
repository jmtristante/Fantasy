import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LIGA_LOGO = "https://assets.laliga.com/assets/logos/LL_RGB_h_color/LL_RGB_h_color.png";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const configured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://xxxx.supabase.co");

  let ligas: { id: number; nombre: string; temporada: string | null }[] = [];
  let error: string | null = null;
  let nJugadores = 0;

  if (configured) {
    const { data: ligasData, error: ligasError } = (await supabase
      .schema("liga")
      .from("ligas")
      .select("id, nombre, temporada")
      .order("nombre")) as { data: { id: number; nombre: string; temporada: string | null }[] | null; error: { message: string } | null };

    if (ligasError) {
      error = ligasError.message;
    } else {
      ligas = ligasData ?? [];
      const { count } = await supabase
        .from("jugadores")
        .select("*", { count: "exact" });
      nJugadores = count ?? 0;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-lg md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full bg-slate-600/30 blur-3xl" />
        <div className="relative">
          <h1 className="font-heading text-4xl tracking-wider md:text-5xl">
            Hola, {user?.email?.split("@")[0] ?? "fantástico"}
          </h1>
          <p className="mt-1 text-slate-300">
            Imagen diaria de tu liga de LaLiga. Fichajes, cláusulas y rentabilidad
            de tus jugadores.
          </p>
        </div>
      </div>

      {!configured && (
        <Card>
          <CardHeader>
            <CardTitle>Falta configurar Supabase</CardTitle>
            <CardDescription>
              Rellena src/.env.local con los datos de tu proyecto
              (Supabase &gt; Settings &gt; API) y reinicia el servidor.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {configured && error && (
        <Card>
          <CardHeader>
            <CardTitle>No se pudieron leer los datos</CardTitle>
            <CardDescription>
              Prueba a exponer el esquema <code>liga</code> en
              Settings &gt; API &gt; Exposed schemas del dashboard de Supabase.
              Detalle: {error}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {configured && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Jugadores en la base
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{nJugadores}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Número de ligas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{ligas.length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Mis ligas</CardTitle>
              <CardDescription>
                Liga privada de amigos y cualquier otra que hayas creado.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {ligas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no hay ligas. Créala desde el menú &quot;Mis ligas&quot;.
                </p>
              ) : (
                ligas.map((liga) => (
                  <div
                    key={liga.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-border">
                        <img
                          src={LIGA_LOGO}
                          alt="Logo LaLiga"
                          className="size-full object-contain p-1"
                        />
                      </div>
                      <div>
                        <div className="font-medium">{liga.nombre}</div>
                        <div className="text-sm text-muted-foreground">
                          Temporada {liga.temporada ?? "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}