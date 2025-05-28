// src/components/repartopruebas/MapaEnviosSummary.tsx
"use client";

import type { EnvioMapa, RepartoParaFiltro } from "@/app/repartoprueba/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layers, PackageSearch, Truck, Building, Route, MapPin, Info, Dot } from "lucide-react";
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

  const totalParadasEntrega = displayedEnvios.filter(
    (envio) => envio.tipo_parada === tipoParadaEnum.Values.entrega_cliente
  ).length;

  let puntoDeRetiroInfo = null;
  let tituloPrincipal = "Vista General del Mapa";
  let IconoPrincipal = Layers;

  if (selectedReparto) {
    tituloPrincipal = selectedReparto.label || "Resumen del Reparto";
    IconoPrincipal = selectedReparto.tipo_reparto === 'individual' ? Route : Building;
    if (selectedReparto.tipo_reparto !== 'individual' && selectedReparto.empresa_nombre) {
      puntoDeRetiroInfo = { label: "Retiro en Empresa", value: selectedReparto.empresa_nombre };
    } else if (selectedReparto.tipo_reparto === 'individual') {
        const primerRetiro = displayedEnvios.find(e => e.tipo_parada === tipoParadaEnum.Values.retiro_individual_origen || (e.orden === 0 && e.tipo_parada !== tipoParadaEnum.Values.entrega_cliente));
        if(primerRetiro) puntoDeRetiroInfo = { label: "Primer Origen", value: primerRetiro.client_location || "Múltiples orígenes" };
        else if (displayedEnvios.length > 0) puntoDeRetiroInfo = { label: "Orígenes", value: "Múltiples individuales" };
    }
  } else if (selectedRepartoId === "unassigned") {
    tituloPrincipal = "Envíos No Asignados";
    IconoPrincipal = PackageSearch;
  } else if (selectedRepartoId === "all") {
    tituloPrincipal = "Todos los Envíos Asignados";
    IconoPrincipal = Layers;
  }


  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <IconoPrincipal size={18} className="text-primary flex-shrink-0"/>
            <span className="truncate">{tituloPrincipal}</span>
        </CardTitle>
        {selectedReparto && (
            <CardDescription className="text-xs truncate">
                {selectedReparto.repartidor_nombre || "Repartidor N/A"}
                {selectedReparto.empresa_nombre && selectedReparto.tipo_reparto !== 'individual' ? ` - ${selectedReparto.empresa_nombre}` : ''}
            </CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-1.5 text-sm">
        {puntoDeRetiroInfo && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin size={14} className="text-blue-500 flex-shrink-0" />
            <span className="text-xs">{puntoDeRetiroInfo.label}: <span className="font-medium text-foreground truncate">{puntoDeRetiroInfo.value}</span></span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Truck size={14} className="text-green-500 flex-shrink-0" />
          <span className="text-xs">Entregas en ruta: <span className="font-medium text-foreground">{totalParadasEntrega}</span></span>
        </div>

        {(selectedRepartoId === "all" || selectedRepartoId === "unassigned" || !selectedRepartoId) && unassignedEnviosCount > 0 && (
           <div className="flex items-center gap-1.5 text-muted-foreground pt-1.5 mt-1.5 border-t border-border/50">
            <PackageSearch size={14} className="text-orange-500 flex-shrink-0" />
            <span className="text-xs">Envíos No Asignados: <span className="font-medium text-foreground">{unassignedEnviosCount}</span></span>
          </div>
        )}
        {displayedEnvios.length === 0 && selectedRepartoId !== "unassigned" && (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 pt-1.5">
                <Info size={14} className="flex-shrink-0" />
                <span className="text-xs">Sin paradas geolocalizadas para este filtro.</span>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
