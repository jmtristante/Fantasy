import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DatosPage() {
  const supabase = await createClient();

  async function count(table: string): Promise<number> {
    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    return count ?? 0;
  }

  const [equipos, jugadores, partidos, jornadas] = await Promise.all([
    count("equipos"),
    count("jugadores"),
    count("partidos"),
    count("jornadas"),
  ]);

  const sections = [
    {
      href: "/datos/jugadores",
      title: "Jugadores",
      description: "Busca jugadores con su último valor de mercado.",
    },
    {
      href: "/datos/clasificacion",
      title: "Clasificación",
      description: "Tabla general de la temporada actual.",
    },
    {
      href: "/datos/calendario",
      title: "Calendario",
      description: "Partidos por jornada con resultados.",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Datos globales</h1>
        <p className="text-muted-foreground">
          Información scrapeada de LaLiga, sin depender de ninguna liga privada.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Equipos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{equipos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jugadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{jugadores}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Partidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{partidos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jornadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{jornadas}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle>{s.title}</CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
