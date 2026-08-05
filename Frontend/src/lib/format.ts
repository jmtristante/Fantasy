export function formatValor(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("es-ES");
}

export function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
