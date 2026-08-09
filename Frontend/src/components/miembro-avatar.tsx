"use client";

export function MiembroAvatar({
  nombre,
  fotoUrl,
  className = "size-8",
}: {
  nombre: string;
  fotoUrl: string | null;
  className?: string;
}) {
  if (!fotoUrl) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-semibold text-muted-foreground ${className}`}
      >
        {nombre.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={fotoUrl}
      alt={nombre}
      className={`shrink-0 rounded-full border object-cover ${className}`}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}