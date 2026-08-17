import "server-only";
import { cookies } from "next/headers";

const COOKIE = "laliga_credentials";

export type LaligaCredentials = { email: string; password: string };

/**
 * Guarda las credenciales de LaLiga Fantasy solo en la cookie de sesión
 * (httpOnly). No se persisten en base de datos.
 */
export async function setLaligaCredentials(creds: LaligaCredentials) {
  const store = await cookies();
  store.set(COOKIE, JSON.stringify(creds), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function getLaligaCredentials(): Promise<LaligaCredentials | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LaligaCredentials;
    if (parsed.email && parsed.password) return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function clearLaligaCredentials() {
  const store = await cookies();
  store.delete(COOKIE);
}
