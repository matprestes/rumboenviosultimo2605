
// src/components/repartopruebas/MapaEnviosSummary.tsx
"use client";

import type { EnvioMapa, RepartoParaFiltro } from "@/types/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layers, PackageSearch, Truck, Building, Route, MapPin, Info } from "lucide-react";

// Assuming tipoParadaEnum is defined in schemas or types
import { tipoParadaEnum } from "@/lib/schemas"; 

interface MapaEnviosSummaryProps {
  displayedEnvios: EnvioMapa[];
  unassignedEnviosCount: number;
  selectedRepartoId?: string | null;
  repartosList: RepartoParaFiltro[];
}

export function MapaEnviosSummary({
  displayedEnvios,
  unassignedEnviosCount,
  selectedRepartoId,
  repartosList,
}: MapaEnviosSummaryProps) {
  
  const getSelectedRepartoDetails = () => {
    if (!selectedRepartoId || selectedRepartoId === "all" || selectedRepartoId === "unassigned") {
      return null;
    }
    return repartosList.find(r => r.id === selectedRepartoId);
  };

  const selectedReparto = getSelectedRepartoDetails();
  
  // Count only actual delivery stops for the summary if a reparto is selected
  const totalParadasEntrega = displayedEnvios.filter(
    (envio) => envio.tipo_parada === tipoParadaEnum.Values.entrega_cliente
  ).length;

  let puntoDeRetiro = null;
  let tipoDeRepartoDisplay = "General";

  if (selectedReparto) {
    tipoDeRepartoDisplay = selectedReparto.tipo_reparto === 'individual' ? "Reparto Individual" : `Lote: ${selectedReparto.empresa_nombre}`;
    if (selectedReparto.tipo_reparto !== 'individual' && selectedReparto.empresa_nombre) {
      puntoDeRetiro = selectedReparto.empresa_nombre;
    } else if (selectedReparto.tipo_reparto === 'individual') {
        const primerRetiro = displayedEnvios.find(e => e.tipo_parada === tipoParadaEnum.Values.retiro_individual_origen || (e.orden === 0 && e.tipo_parada !== tipoParadaEnum.Values.entrega_cliente));
        if(primerRetiro) puntoDeRetiro = primerRetiro.client_location || "Múltiples orígenes";
        else if (displayedEnvios.length > 0) puntoDeRetiro = "Múltiples orígenes individuales";
    }
  }


  const getTitle = () => {
    if (selectedReparto) return selectedReparto.label || "Resumen del Reparto";
    if (selectedRepartoId === "unassigned") return "Envíos No Asignados";
    if (selectedRepartoId === "all") return "Todos los Envíos Asignados";
    return "Vista General del Mapa";
  };
  
  const getIcon = () => {
    if (selectedReparto) return selectedReparto.tipo_reparto === 'individual' ? Route : Building;
    if (selectedRepartoId === "unassigned") return PackageSearch;
    return Layers;
  }
  const Icon = getIcon();


  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-md font-semibold flex items-center gap-2">
            <Icon size={18} className="text-primary"/>
            {getTitle()}
        </CardTitle>
        {selectedReparto && (
            <CardDescription className="text-xs">
                {selectedReparto.repartidor_nombre || "Repartidor no asignado"}
                {selectedReparto.empresa_nombre ? ` - ${selectedReparto.empresa_nombre}` : ''}
            </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4 text-xs">
        {selectedReparto && puntoDeRetiro && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin size={14} className="text-blue-500" />
            <span>Origen: <span className="font-medium text-foreground">{puntoDeRetiro}</span></span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Truck size={14} className="text-green-500" />
          <span>Entregas en ruta: <span className="font-medium text-foreground">{totalParadasEntrega}</span></span>
        </div>
        
        {(selectedRepartoId === "all" || selectedRepartoId === "unassigned" || !selectedRepartoId) && unassignedEnviosCount > 0 && (
           <div className="flex items-center gap-1.5 text-muted-foreground pt-1 mt-1 border-t border-border/50">
            <PackageSearch size={14} className="text-orange-500" />
            <span>Envíos No Asignados: <span className="font-medium text-foreground">{unassignedEnviosCount}</span></span>
          </div>
        )}
        {displayedEnvios.length === 0 && selectedRepartoId !== "unassigned" && (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 pt-1">
                <Info size={14} />
                <span>Este reparto no tiene paradas geolocalizadas para mostrar.</span>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

