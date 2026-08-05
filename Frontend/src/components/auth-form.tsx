"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function AuthFormBody({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const isLogin = mode === "login";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setInfo(null);
    const supabase = createClient();

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message);
        } else {
          const next = params.get("next") ?? "/dashboard";
          router.push(next);
          router.refresh();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          toast.error(error.message);
        } else if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setInfo("Te hemos enviado un enlace de confirmación a tu correo. Revísalo para poder iniciar sesión.");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{isLogin ? "Iniciar sesión" : "Crear cuenta"}</CardTitle>
        <CardDescription>
          {isLogin
            ? "Accede con tu email y contraseña."
            : "Regístrate para entrar en tu liga de LaLiga."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {info && <p className="text-sm text-muted-foreground">{info}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Espera..." : isLogin ? "Entrar" : "Registrarme"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {isLogin ? (
            <>
              ¿No tienes cuenta?{" "}
              <Link href="/auth/signup" className="underline underline-offset-4 hover:text-primary">
                Regístrate
              </Link>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{" "}
              <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
                Inicia sesión
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  return (
    <Suspense fallback={null}>
      <AuthFormBody mode={mode} />
    </Suspense>
  );
}