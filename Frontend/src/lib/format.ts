export function formatValor(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("es-ES");
}

export function banderaPais(codigo: string | null | undefined): string {
  if (!codigo) return "";
  const iso = codigo.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso)) return "";
  return String.fromCodePoint(
    ...Array.from(iso, (c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

export function banderaUrl(codigo: string | null | undefined): string {
  if (!codigo) return "";
  const iso = codigo.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso)) return "";
  return `https://flagcdn.com/w40/${iso.toLowerCase()}.png`;
}

export function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
