import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSelectedLigaId } from "@/lib/liga";
import { getCurrentUser } from "@/lib/auth-user";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [user, ligas] = await Promise.all([
    getCurrentUser(),
    createClient()
      .then((supabase) =>
        supabase
          .schema("liga")
          .from("ligas")
          .select("id, nombre")
          .order("nombre"),
      )
      .then(({ data }) => data ?? []),
  ]);

  if (!user) {
    redirect("/auth/login");
  }

  const selectedLigaId = await getSelectedLigaId();

  return (
    <AppShell user={user} ligas={ligas ?? []} selectedLigaId={selectedLigaId}>
      {children}
    </AppShell>
  );
}
