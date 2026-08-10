import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * Usuario autenticado del request actual, memoizado por petición.
 *
 * Evita repetir auth.getUser() (un round-trip HTTP a Supabase) cada vez que
 * layout, isAdmin, proxy o una página lo necesitan en el mismo render.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});