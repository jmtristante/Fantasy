import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SectionPlaceholder({
  title,
  description,
  ligaLabel = null,
}: {
  title: string;
  description: string;
  ligaLabel?: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
          {title}
          {ligaLabel && <Badge variant="secondary">{ligaLabel}</Badge>}
        </h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>En construcción</CardTitle>
          <CardDescription>
            Esta sección se implementará en la siguiente iteración de la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Mientras tanto, puedes consultar y modificar los datos directamente desde la
            consola de Supabase usando las vistas <code>liga.*</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}