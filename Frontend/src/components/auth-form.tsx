"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithLaliga } from "@/app/auth/login/actions";

function AuthFormBody() {
  const params = useSearchParams();
  const [state, formAction, pending] = useActionState(loginWithLaliga, {});

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>
          Accede con tu cuenta de LaLiga Fantasy para sincronizar tu liga.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="next" value={params.get("next") ?? "/dashboard"} />
          <div className="grid gap-2">
            <Label htmlFor="email">Email de LaLiga Fantasy</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@email.com"
              name="email"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              name="password"
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Espera..." : "Entrar"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          ¿No tienes cuenta en LaLiga Fantasy?{" "}
          <Link
            href="https://miliga.laliga.com/es-ES"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-primary"
          >
            Crea una
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuthForm() {
  return (
    <Suspense fallback={null}>
      <AuthFormBody />
    </Suspense>
  );
}
