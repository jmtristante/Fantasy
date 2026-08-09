"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserClient } from "@/lib/supabase/client";

export function EditMiembroButton({
  id,
  nombre,
  email,
  fotoUrl,
}: {
  id: number;
  nombre: string;
  email: string | null;
  fotoUrl: string | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({
    nombre,
    email: email ?? "",
    fotoUrl: fotoUrl ?? "",
  });

  async function guardar() {
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setCargando(true);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .schema("liga")
      .from("miembros")
      .update({
        nombre: form.nombre.trim(),
        email: form.email.trim() || null,
        foto_url: form.fotoUrl.trim() || null,
      })
      .eq("id", id);
    setCargando(false);
    if (error) {
      toast.error(`No se pudo guardar: ${error.message}`);
      return;
    }
    toast.success("Miembro actualizado");
    setAbierto(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setAbierto(true)} aria-label="Editar">
        <Pencil className="h-4 w-4" />
      </Button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            className="mt-8 w-full max-w-md rounded-xl border bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editar miembro</h2>
              <Button variant="ghost" size="icon" onClick={() => setAbierto(false)} aria-label="Cerrar">
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edtNombre">Nombre *</Label>
                <Input
                  id="edtNombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edtEmail">Email</Label>
                <Input
                  id="edtEmail"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edtFoto">Foto (URL)</Label>
                <Input
                  id="edtFoto"
                  type="url"
                  value={form.fotoUrl}
                  onChange={(e) => setForm({ ...form, fotoUrl: e.target.value })}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  Aparecerá como avatar en el historial de movimientos.
                </p>
              </div>

              {form.fotoUrl.trim() ? (
                <div className="flex items-center gap-3">
                  <img
                    src={form.fotoUrl.trim()}
                    alt="Vista previa"
                    className="size-12 rounded-full border object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Vista previa</span>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={cargando}>
                {cargando ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}