import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { LIGA_COOKIE } from "@/lib/liga-consts";
import { getCurrentUser } from "@/lib/auth-user";

export async function getSelectedLigaId(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(LIGA_COOKIE)?.value;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function isAdmin(ligaId: number): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user?.email || ligaId == null) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .schema("liga")
    .from("miembros")
    .select("es_admin")
    .eq("liga_id", ligaId)
    .ilike("email", user.email)
    .maybeSingle();

  return data?.es_admin === true;
}