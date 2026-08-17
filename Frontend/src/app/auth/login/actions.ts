"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authenticateLaliga } from "@/lib/laliga/auth";
import { setLaligaCredentials } from "@/lib/laliga/session";

export type LoginState = { error?: string };

export async function loginWithLaliga(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Introduce tu email y contraseña de LaLiga Fantasy." };
  }

  // 1) Validar las credenciales contra LaLiga Fantasy (obtiene el token).
  try {
    await authenticateLaliga({ email, password });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error de autenticación." };
  }

  // 2) Guardar las credenciales solo en la cookie de sesión (no en BD).
  await setLaligaCredentials({ email, password });

  // 3) Sesión de la app (Supabase) vinculada al mismo email para que la
  //    selección de liga y los permisos sigan funcionando.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      return { error: "No se pudo iniciar sesión en la app." };
    }
  }

  const next = String(formData.get("next") ?? "/dashboard");
  redirect(next.startsWith("/") ? next : "/dashboard");
}
