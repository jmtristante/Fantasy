import { Trophy } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-900" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(0deg,transparent,transparent_44px,#000_44px,#000_48px)]" />
      <div className="pointer-events-none absolute -left-20 top-1/3 size-96 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 size-96 rounded-full bg-emerald-950/40 blur-3xl" />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <Trophy className="size-7 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-4xl tracking-wider text-white">
              FANTASY LALIGA
            </h1>
            <p className="text-sm text-emerald-100">
              Gestiona tu liga privada de LaLiga
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
