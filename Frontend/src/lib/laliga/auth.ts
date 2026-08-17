import "server-only";

const AUTH_URL = "https://api-fantasy.llt-services.com/login/v3/email/auth";
const TOKEN_URL = "https://api-fantasy.llt-services.com/login/v3/email/token";
const API_BASE = "https://api-fantasy.llt-services.com/api/v3";
const POLICY = "B2C_1A_ResourceOwnerv2";

export type LaligaCredentials = { email: string; password: string };

/**
 * Autentica contra LaLiga Fantasy con usuario (email) y contraseña.
 * Devuelve el access_token (válido ~24h) o lanza si las credenciales fallan.
 */
export async function authenticateLaliga({
  email,
  password,
}: LaligaCredentials): Promise<string> {
  const authResp = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ policy: POLICY, username: email, password }).toString(),
  });

  if (!authResp.ok) {
    throw new Error("No se pudo conectar con LaLiga Fantasy.");
  }

  const authJson = (await authResp.json()) as { code?: string };
  if (!authJson.code) {
    throw new Error("Usuario o contraseña de LaLiga Fantasy incorrectos.");
  }

  const tokenResp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ policy: POLICY, code: authJson.code }).toString(),
  });

  if (!tokenResp.ok) {
    throw new Error("No se pudo obtener el token de LaLiga Fantasy.");
  }

  const tokenJson = (await tokenResp.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error("LaLiga Fantasy no devolvió un token de acceso.");
  }

  return tokenJson.access_token;
}

export async function laligaApiGet<T = unknown>(path: string, token: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!resp.ok) {
    throw new Error(`Error consultando LaLiga Fantasy (${resp.status}).`);
  }

  return (await resp.json()) as T;
}
