"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import {
  LayoutDashboard,
  Users,
  Shirt,
  Store,
  Shield,
  ArrowLeftRight,
  CalendarDays,
  TrendingUp,
  LogOut,
  Database,
  Moon,
  Sun,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { LigaSelector } from "@/components/liga-selector";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

const NAV = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
];

const DATOS_NAV = [
  { href: "/datos/jugadores", label: "Jugadores", icon: Shirt },
  { href: "/datos/clasificacion", label: "Clasificación", icon: LayoutDashboard },
  { href: "/datos/calendario", label: "Calendario", icon: CalendarDays },
];

const LIGA_NAV = [
  { href: "/miembros", label: "Miembros", icon: Users },
  { href: "/plantillas", label: "Plantillas", icon: Shirt },
  { href: "/mercado", label: "Mercado", icon: Store },
  { href: "/clausulables", label: "Clausulables", icon: Shield },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/rentabilidad", label: "Rentabilidad", icon: TrendingUp },
  { href: "/alineaciones", label: "Alineaciones", icon: CalendarDays },
];

export function AppShell({
  user,
  ligas,
  selectedLigaId,
  children,
}: {
  user?: { email?: string | null };
  ligas: { id: number; nombre: string }[];
  selectedLigaId: number | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const email = user?.email ?? null;

  async function handleSignOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("No se pudo cerrar la sesión");
      return;
    }
    toast.success("Sesión cerrada");
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <LigaSelector ligas={ligas} selectedLigaId={selectedLigaId} />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>General</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map(({ href, label, icon: Icon }) => (
                  <NavItem key={href} href={href} label={label} icon={Icon} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Datos globales</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItem href="/datos" label="Datos" icon={Database} />
                {DATOS_NAV.map(({ href, label, icon: Icon }) => (
                  <NavItem key={href} href={href} label={label} icon={Icon} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Mi liga</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {LIGA_NAV.map(({ href, label, icon: Icon }) => (
                  <NavItem key={href} href={href} label={label} icon={Icon} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <UserMenu email={email} onSignOut={handleSignOut} />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <ThemeToggle />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleSignOut}>
                <LogOut />
                <span>Cerrar sesión</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-semibold text-muted-foreground">
            Fantasy LaLiga
          </span>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function initialsOf(email: string | null): string {
  if (!email) return "U";
  return email
    .split(/[@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function UserMenu({
  email,
  onSignOut,
}: {
  email: string | null;
  onSignOut: () => void;
}) {
  const initials = initialsOf(email);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          />
        }
      >
        <Avatar className="size-8 rounded-lg">
          <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">
            {email ?? "Mi cuenta"}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={4}
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{email ?? "Mi cuenta"}</span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const pathname = usePathname();
  const active = pathname.startsWith(href);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={active} render={<Link href={href} />}>
        <Icon className="size-4" />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const dark = mounted && resolvedTheme === "dark";
  return (
    <SidebarMenuButton
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span>{dark ? "Modo claro" : "Modo oscuro"}</span>
    </SidebarMenuButton>
  );
}
