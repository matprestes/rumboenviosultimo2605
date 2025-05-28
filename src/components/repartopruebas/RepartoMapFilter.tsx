
// src/components/repartopruebas/RepartoMapFilter.tsx
"use client";

import { useRouter, usePathname } from "next/navigation"; // Removed useSearchParams as it's not directly used here for reading
import type { RepartoParaFiltro } from "@/app/repartoprueba/actions"; // Adjusted import path
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Route, PackageSearch, ListFilter, Building } from "lucide-react"; // Added Building
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface RepartoMapFilterProps {
  repartos: RepartoParaFiltro[];
  currentRepartoId?: string | null;
}

export function RepartoMapFilter({ repartos, currentRepartoId }: RepartoMapFilterProps) {
  const router = useRouter();
  const pathname = usePathname(); 

  const handleFilterChange = (repartoId: string) => {
    const params = new URLSearchParams(); 
    if (repartoId && repartoId !== "all") {
      params.set("repartoId", repartoId);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const defaultValue = currentRepartoId || "all";

  return (
    <Card className="shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-md font-semibold flex items-center gap-2">
                <ListFilter size={18} className="text-primary"/>
                Filtrar Vista del Mapa
            </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
            <Label htmlFor="reparto-map-filter" className="sr-only">
                Filtro de Reparto
            </Label>
            <Select value={defaultValue} onValueChange={handleFilterChange}>
                <SelectTrigger id="reparto-map-filter" className="w-full text-xs sm:text-sm">
                <SelectValue placeholder="Seleccionar filtro de reparto..." />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">
                    <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 opacity-70" /> Todos los Envíos Asignados
                    </div>
                </SelectItem>
                <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                    <PackageSearch className="h-4 w-4 opacity-70" /> Envíos No Asignados
                    </div>
                </SelectItem>
                {repartos.map((reparto) => (
                    <SelectItem key={reparto.id} value={reparto.id}>
                    <div className="flex items-center gap-2">
                        <TruckIconOrIndividualIcon tipoReparto={reparto.tipo_reparto} /> {reparto.label}
                    </div>
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
        </CardContent>
    </Card>
  );
}

function TruckIconOrIndividualIcon({tipoReparto} : {tipoReparto: RepartoParaFiltro['tipo_reparto']}) {
    if (tipoReparto === 'viaje_empresa' || tipoReparto === 'viaje_empresa_lote') {
        return <Building className="h-4 w-4 opacity-70 text-blue-600 dark:text-blue-400" />;
    }
    return <Route className="h-4 w-4 opacity-70" />;
}
