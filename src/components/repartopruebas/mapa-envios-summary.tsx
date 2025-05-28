
"use client";

import type { EnvioMapa, RepartoParaFiltro } from "@/types/supabase"; // No need for TipoParadaEnum directly here
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageSearch, Truck, Building, Route, MapPin } from "lucide-react";
import { tipoParadaEnum as tipoParadaSchemaEnum } from "@/lib/schemas";

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
  
  const totalParadasEntrega = displayedEnvios.filter(
    (envio) => envio.tipo_parada !== tipoParadaSchemaEnum.Values.retiro_empresa
  ).length;

  let puntoDeRetiro = null;
  if (selectedReparto && (selectedReparto.tipo_reparto === 'viaje_empresa' || selectedReparto.tipo_reparto === 'viaje_empresa_lote')) {
    puntoDeRetiro = selectedReparto.empresa_nombre;
  } else if (displayedEnvios.some(e => e.tipo_parada === tipoParadaSchemaEnum.Values.retiro_empresa)) {
    const retiro = displayedEnvios.find(e => e.tipo_parada === tipoParadaSchemaEnum.Values.retiro_empresa);
    if(retiro) puntoDeRetiro = retiro.nombre_cliente; 
  }


  const getTitle = () => {
    if (selectedReparto) return "Resumen del Reparto Seleccionado";
    if (selectedRepartoId === "unassigned") return "Resumen de Envíos No Asignados";
    return "Resumen General de Envíos";
  };

  return (
    <Card className="mb-6 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
            <Route className="h-5 w-5 text-primary"/>
            {getTitle()}
        </CardTitle>
        {selectedReparto && (
            <CardDescription>{selectedReparto.label}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {puntoDeRetiro && (
          <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
            <Building className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Punto de Retiro</p>
              <p className="font-medium">{puntoDeRetiro}</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
          <Truck className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Total de Paradas (Entregas)</p>
            <p className="font-medium">{totalParadasEntrega}</p>
          </div>
        </div>

        {/* Show "Envíos No Asignados" count always if it's > 0, 
            or specifically if filtering for "all" or "unassigned",
            but rely on the prop unassignedEnviosCount which is always fetched now.
        */}
        {(unassignedEnviosCount > 0 || selectedRepartoId === "all" || selectedRepartoId === "unassigned" || !selectedRepartoId) && (
          <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
            <PackageSearch className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Envíos No Asignados</p>
              <p className="font-medium">{unassignedEnviosCount}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}