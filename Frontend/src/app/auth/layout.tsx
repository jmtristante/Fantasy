import { Trophy } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="pointer-events-none absolute -left-24 top-1/4 size-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 size-96 rounded-full bg-slate-600/30 blur-3xl" />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-black/30">
            <Trophy className="size-7" />
          </div>
          <div>
            <h1 className="font-heading text-4xl tracking-wider text-white">
              FANTASY LALIGA
            </h1>
            <p className="text-sm text-slate-300">
              Gestiona tu liga privada de LaLiga
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
