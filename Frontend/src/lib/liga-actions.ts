"use server";

import { cookies } from "next/headers";

import { LIGA_COOKIE } from "@/lib/liga-consts";

export async function setSelectedLiga(id: number | null) {
  const store = await cookies();
  if (id == null) {
    store.delete(LIGA_COOKIE);
  } else {
    store.set(LIGA_COOKIE, String(id), { path: "/", maxAge: 31536000 });
  }
}