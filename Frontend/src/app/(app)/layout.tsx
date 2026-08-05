import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSelectedLigaId } from "@/lib/liga";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: ligas } = await supabase
    .schema("liga")
    .from("ligas")
    .select("id, nombre")
    .order("nombre");

  const selectedLigaId = await getSelectedLigaId();

  return (
    <AppShell user={user} ligas={ligas ?? []} selectedLigaId={selectedLigaId}>
      {children}
    </AppShell>
  );
}
