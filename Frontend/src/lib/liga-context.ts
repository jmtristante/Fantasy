import { createClient } from "@/lib/supabase/server";
import { getSelectedLigaId } from "@/lib/liga";

export async function getLigaNombre(): Promise<string | null> {
  const ligaId = await getSelectedLigaId();
  if (ligaId == null) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .schema("liga")
    .from("ligas")
    .select("nombre")
    .eq("id", ligaId)
    .maybeSingle();
  return data?.nombre ?? null;
}