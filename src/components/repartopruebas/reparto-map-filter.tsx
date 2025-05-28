
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { RepartoParaFiltro } from "@/types/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Route, Box } from "lucide-react";

interface RepartoMapFilterProps {
  repartos: RepartoParaFiltro[];
  currentRepartoId?: string | null;
}

export function RepartoMapFilter({ repartos, currentRepartoId }: RepartoMapFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (repartoId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (repartoId === "all") {
      params.delete("repartoId");
    } else {
      params.set("repartoId", repartoId);
    }
    // Keep other existing search params like 'page' if they exist, though not relevant for map
    // params.set("page", "1"); // Reset page if pagination was used elsewhere

    router.push(`/mapa-envios?${params.toString()}`, { scroll: false });
  };

  const defaultValue = currentRepartoId || "all";

  return (
    <div className="mb-6 p-4 border rounded-lg shadow-sm bg-card">
      <Label htmlFor="reparto-filter" className="text-sm font-medium text-muted-foreground mb-2 block">
        Filtrar Envíos por Reparto
      </Label>
      <Select value={defaultValue} onValueChange={handleFilterChange}>
        <SelectTrigger id="reparto-filter" className="w-full md:w-[350px]">
          <SelectValue placeholder="Seleccionar un filtro de reparto..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4" /> Todos los Envíos Geocodificados
            </div>
          </SelectItem>
          <SelectItem value="unassigned">
             <div className="flex items-center gap-2">
              <Box className="h-4 w-4 opacity-70" /> Envíos No Asignados
            </div>
          </SelectItem>
          {repartos.map((reparto) => (
            <SelectItem key={reparto.id} value={reparto.id}>
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4" /> {reparto.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}