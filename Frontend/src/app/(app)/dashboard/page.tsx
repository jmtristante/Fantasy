import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {user?.email ?? "fantástico"}
        </h1>
        <p className="text-muted-foreground">
          Imagen diaria de tu liga de LaLiga.
        </p>
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
                    <div>
                      <div className="font-medium">{liga.nombre}</div>
                      <div className="text-sm text-muted-foreground">
                        Temporada {liga.temporada ?? "—"}
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