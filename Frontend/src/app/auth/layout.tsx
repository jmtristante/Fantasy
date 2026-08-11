import { Trophy } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden bg-slate-50 p-6">
      <div className="pointer-events-none absolute -left-24 top-1/4 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 size-96 rounded-full bg-slate-200 blur-3xl" />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Trophy className="size-7" />
          </div>
          <div>
            <h1 className="font-heading text-4xl tracking-wider text-foreground">
              FANTASY LALIGA
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestiona tu liga privada de LaLiga
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
