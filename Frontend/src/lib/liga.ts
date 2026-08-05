import { cookies } from "next/headers";

import { LIGA_COOKIE } from "@/lib/liga-consts";

export async function getSelectedLigaId(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(LIGA_COOKIE)?.value;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}