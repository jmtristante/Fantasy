"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { setSelectedLiga } from "@/lib/liga-actions";

const LIGA_LOGO = "https://assets.laliga.com/assets/logos/LL_RGB_h_color/LL_RGB_h_color.png";

type Liga = { id: number; nombre: string };

export function LigaSelector({
  ligas,
  selectedLigaId,
}: {
  ligas: Liga[];
  selectedLigaId: number | null;
}) {
  const router = useRouter();
  const selected = ligas.find((l) => l.id === selectedLigaId) ?? null;

  async function select(id: number | null) {
    await setSelectedLiga(id);
    router.refresh();
  }

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
        <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-border">
          <img src={LIGA_LOGO} alt="Logo LaLiga" className="size-full object-contain p-1" />
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">
            {selected?.nombre ?? "Elige tu liga"}
          </span>
          <span className="text-xs text-muted-foreground">
            {selected ? "Liga activa" : "Liga privada"}
          </span>
        </div>
        <ChevronsUpDown className="ml-auto size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={4}
        className="w-64 rounded-lg"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Tus ligas
          </DropdownMenuLabel>
          {ligas.length === 0 && (
            <DropdownMenuItem disabled>No tienes ligas todavía</DropdownMenuItem>
          )}
          {ligas.map((l) => (
            <DropdownMenuItem key={l.id} onClick={() => select(l.id)}>
              <span className="truncate">{l.nombre}</span>
              {l.id === selectedLigaId && <Check className="ml-auto size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/ligas?crear=1")}>
          <Plus className="size-4" />
          Nueva liga
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
