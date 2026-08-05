import { SectionPlaceholder } from "@/components/section-placeholder";
import { getLigaNombre } from "@/lib/liga-context";

export const dynamic = "force-dynamic";

export default async function AlineacionesPage() {
  const ligaLabel = await getLigaNombre();
  return (
    <SectionPlaceholder
      title="Alineaciones"
      description="Alineaciones de cada miembro por jornada."
      ligaLabel={ligaLabel}
    />
  );
}