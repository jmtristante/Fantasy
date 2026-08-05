"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@/lib/supabase/client";

export function DeleteLigaButton({ id }: { id: number }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function onDelete() {
    if (!confirm("¿Seguro que quieres borrar esta liga? Esta acción no se puede deshacer.")) {
      return;
    }
    setCargando(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.schema("liga").from("ligas").delete().eq("id", id);
    setCargando(false);
    if (error) {
      toast.error(`No se pudo borrar: ${error.message}`);
      return;
    }
    toast.success("Liga borrada");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" onClick={onDelete} disabled={cargando}>
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}