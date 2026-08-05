"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@/lib/supabase/client";

export function DeleteMiembroButton({
  id,
  nombre,
  nJugadores,
}: {
  id: number;
  nombre: string;
  nJugadores?: number;
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function onDelete() {
    const aviso = nJugadores
      ? `¿Borrar a ${nombre}? Perderá sus ${nJugadores} jugadores y su historial de movimientos. Esta acción no se puede deshacer.`
      : `¿Seguro que quieres borrar a ${nombre}? Esta acción no se puede deshacer.`;
    if (!confirm(aviso)) return;
    setCargando(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.schema("liga").from("miembros").delete().eq("id", id);
    setCargando(false);
    if (error) {
      toast.error(`No se pudo borrar: ${error.message}`);
      return;
    }
    toast.success(`${nombre} borrado`);
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" onClick={onDelete} disabled={cargando}>
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}