"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatValor } from "@/lib/format";

export function CreateMiembroForm({
  ligaId,
  presupuestoInicial,
}: {
  ligaId: number;
  presupuestoInicial: number;
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setCargando(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.schema("liga").from("miembros").insert({
      liga_id: ligaId,
      nombre: form.nombre.trim(),
      email: form.email.trim() || null,
      presupuesto_inicial: presupuestoInicial,
    });
    setCargando(false);
    if (error) {
      toast.error(`No se pudo crear el miembro: ${error.message}`);
      return;
    }
    toast.success("Miembro añadido a la liga");
    setForm({ nombre: "", email: "" });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Añadir miembro</CardTitle>
        <CardDescription>
          Registra a un amigo que juega en la liga. Su presupuesto inicial es el
          de la liga; después podrás asignarle jugadores y registrar sus
          movimientos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Juan"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Presupuesto inicial de la liga: {formatValor(presupuestoInicial)}.
          </p>
          <Button type="submit" disabled={cargando} className="w-fit">
            {cargando ? "Añadiendo..." : "Añadir miembro"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}