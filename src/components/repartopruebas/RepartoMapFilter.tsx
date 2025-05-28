// src/components/repartopruebas/RepartoMapFilter.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import type { RepartoParaFiltro } from "@/app/repartoprueba/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Route, PackageSearch, ListFilter, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface RepartoMapFilterProps {
  repartos: RepartoParaFiltro[];
  currentRepartoId?: string | null;
}

function TruckIconOrIndividualIcon({tipoReparto} : {tipoReparto: RepartoParaFiltro['tipo_reparto']}) {
    if (tipoReparto === 'viaje_empresa' || tipoReparto === 'viaje_empresa_lote') {
        return <Building className="h-4 w-4 opacity-70 text-blue-600 dark:text-blue-400 flex-shrink-0" />;
    }
    return <Route className="h-4 w-4 opacity-70 flex-shrink-0" />;
}

export function RepartoMapFilter({ repartos, currentRepartoId }: RepartoMapFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleFilterChange = (repartoId: string) => {
    const params = new URLSearchParams(); // Start with fresh params
    if (repartoId && repartoId !== "all") {
      params.set("repartoId", repartoId);
    }
    // If repartoId is "all", no param is set, effectively clearing the filter
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const defaultValue = currentRepartoId || "all";

  return (
    <Card className="rounded-2xl shadow-md">
        <CardHeader className="p-4 pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <ListFilter size={18} className="text-primary flex-shrink-0"/>
                Filtrar Vista
            </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
            <Label htmlFor="reparto-map-filter" className="sr-only">
                Filtro de Reparto
            </Label>
            <Select value={defaultValue} onValueChange={handleFilterChange}>
                <SelectTrigger id="reparto-map-filter" className="w-full text-sm">
                    <SelectValue placeholder="Seleccionar filtro..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">
                        <div className="flex items-center gap-2">
                            <Route className="h-4 w-4 opacity-70 flex-shrink-0" /> Todos los Envíos Asignados
                        </div>
                    </SelectItem>
                    <SelectItem value="unassigned">
                        <div className="flex items-center gap-2">
                            <PackageSearch className="h-4 w-4 opacity-70 flex-shrink-0" /> Envíos No Asignados
                        </div>
                    </SelectItem>
                    {repartos.map((reparto) => (
                        <SelectItem key={reparto.id} value={reparto.id}>
                            <div className="flex items-center gap-2">
                                <TruckIconOrIndividualIcon tipoReparto={reparto.tipo_reparto} /> 
                                <span className="truncate">{reparto.label}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </CardContent>
    </Card>
  );
}
