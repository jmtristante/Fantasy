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
import { setSelectedLiga } from "@/lib/liga-actions";

export function CreateLigaForm() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({
    tuNombre: "",
    nombre: "",
    temporada: "",
    presupuesto: "",
    descripcion: "",
    horaReinicio: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error("El nombre de la liga es obligatorio");
      return;
    }
    if (!form.tuNombre.trim()) {
      toast.error("Tu nombre es obligatorio");
      return;
    }
    setCargando(true);
    const supabase = createBrowserClient();
    const presupuesto = form.presupuesto ? Number(form.presupuesto) : 0;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .schema("liga")
      .from("ligas")
      .insert({
        nombre: form.nombre.trim(),
        temporada: form.temporada.trim() || null,
        presupuesto,
        descripcion: form.descripcion.trim() || null,
        mercado_reset_hora: form.horaReinicio || null,
        creado_por: user?.email ?? null,
      })
      .select("id")
      .single();

    if (error) {
      setCargando(false);
      toast.error(`No se pudo crear la liga: ${error.message}`);
      return;
    }

    const ligaId = data?.id as number | undefined;
    if (ligaId != null) {
      const { error: errorMiembro } = await supabase
        .schema("liga")
        .from("miembros")
        .insert({
          liga_id: ligaId,
          nombre: form.tuNombre.trim(),
          email: user?.email ?? null,
          presupuesto_inicial: presupuesto,
          es_admin: true,
        });
      if (errorMiembro) {
        toast.error(`La liga se creó, pero no se pudo añadirte como miembro: ${errorMiembro.message}`);
      }
      await setSelectedLiga(ligaId);
    }

    setCargando(false);
    toast.success("Liga creada");
    setForm({
      tuNombre: "",
      nombre: "",
      temporada: "",
      presupuesto: "",
      descripcion: "",
      horaReinicio: "",
    });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear liga</CardTitle>
        <CardDescription>
          Te añadimos automáticamente como miembro de la liga con el nombre que
          indiques. Después podrás registrar al resto de participantes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tuNombre">Tu nombre *</Label>
              <Input
                id="tuNombre"
                value={form.tuNombre}
                onChange={(e) => setForm({ ...form, tuNombre: e.target.value })}
                placeholder="Como aparecerás en la liga"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nombre">Nombre de la liga *</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Liga de los viernes"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="temporada">Temporada</Label>
              <Input
                id="temporada"
                value={form.temporada}
                onChange={(e) => setForm({ ...form, temporada: e.target.value })}
                placeholder="2026-27"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="presupuesto">Presupuesto inicial</Label>
              <Input
                id="presupuesto"
                type="number"
                value={form.presupuesto}
                onChange={(e) => setForm({ ...form, presupuesto: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="horaReinicio">Hora de reinicio del mercado</Label>
              <Input
                id="horaReinicio"
                type="time"
                value={form.horaReinicio}
                onChange={(e) => setForm({ ...form, horaReinicio: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                A esa hora el mercado se vacía hasta que añadas jugadores.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>
          <Button type="submit" disabled={cargando}>
            {cargando ? "Creando..." : "Crear liga"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}