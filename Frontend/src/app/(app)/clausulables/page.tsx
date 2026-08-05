import { SectionPlaceholder } from "@/components/section-placeholder";
import { getLigaNombre } from "@/lib/liga-context";

export const dynamic = "force-dynamic";

export default async function ClausulablesPage() {
  const ligaLabel = await getLigaNombre();
  return (
    <SectionPlaceholder
      title="Clausulables"
      description="Jugadores con dueño y su cláusula actual, por liga."
      ligaLabel={ligaLabel}
    />
  );
}
