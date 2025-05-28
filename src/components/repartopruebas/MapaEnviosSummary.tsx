// src/components/repartopruebas/MapaEnviosSummary.tsx
"use client";

import type { EnvioMapa, RepartoParaFiltro } from "@/app/repartoprueba/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, PackageSearch, Truck, Building, Route, MapPin, Info, Dot, CalendarDays, UserCircle, Hash } from "lucide-react";
import { tipoParadaEnum, EstadoRepartoEnum } from "@/lib/schemas"; // Import enums for status comparison
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface MapaEnviosSummaryProps {
  displayedEnvios: EnvioMapa[];
  unassignedEnviosCount: number;
  selectedRepartoId?: string | null;
  repartosList: RepartoParaFiltro[];
  calculatedDistanceKm?: number | null; // Nueva prop para la distancia
}

function getEstadoRepartoBadgeClass(estado: string | null | undefined): string {
  if (!estado) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600';
  switch (estado) {
    case EstadoRepartoEnum.Values.completado: return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 border-green-300 dark:border-green-600';
    case EstadoRepartoEnum.Values.planificado: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100 border-yellow-300 dark:border-yellow-600';
    case EstadoRepartoEnum.Values.en_curso: return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100 border-blue-300 dark:border-blue-600';
    case EstadoRepartoEnum.Values.cancelado: return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 border-red-300 dark:border-red-600';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600';
  }
}
function getEstadoRepartoDisplayName(estadoValue: string | null | undefined) {
    if (!estadoValue) return 'N/A';
    return estadoValue.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}


export function MapaEnviosSummary({
  displayedEnvios,
  unassignedEnviosCount,
  selectedRepartoId,
  repartosList,
  calculatedDistanceKm,
}: MapaEnviosSummaryProps) {

  const getSelectedRepartoDetails = () => {
    if (!selectedRepartoId || selectedRepartoId === "all" || selectedRepartoId === "unassigned") {
      return null;
    }
    // Need to find the full reparto object, not just RepartoParaFiltro if we need status
    // For now, repartosList is RepartoParaFiltro which doesn't have status.
    // This might need adjustment in how data is passed if we need reparto status here.
    return repartosList.find(r => r.id === selectedRepartoId);
  };

  const selectedRepartoInfo = getSelectedRepartoDetails();

  const totalParadasEntrega = displayedEnvios.filter(
    (envio) => envio.tipo_parada === tipoParadaEnum.Values.entrega_cliente
  ).length;
  
  const totalParadasRetiroEmpresa = displayedEnvios.filter(
    (envio) => envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa
  ).length;

  let tituloPrincipal = "Vista General del Mapa";
  let IconoPrincipal = Layers;
  let subtitulo = "Todos los envíos geolocalizados";

  if (selectedRepartoInfo) {
    tituloPrincipal = "Resumen del Reparto";
    IconoPrincipal = selectedRepartoInfo.tipo_reparto === 'individual' ? Route : Building;
    subtitulo = selectedRepartoInfo.label || "Detalles del reparto";
  } else if (selectedRepartoId === "unassigned") {
    tituloPrincipal = "Envíos No Asignados";
    IconoPrincipal = PackageSearch;
    subtitulo = `Total: ${unassignedEnviosCount} envíos pendientes de asignación.`;
  } else if (selectedRepartoId === "all") {
     subtitulo = "Mostrando todos los envíos asignados y geolocalizados.";
  }


  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <IconoPrincipal size={18} className="text-primary flex-shrink-0"/>
            <span className="truncate">{tituloPrincipal}</span>
        </CardTitle>
        <CardDescription className="text-xs truncate">{subtitulo}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-2 text-sm">
        {selectedRepartoInfo && (
          <>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <UserCircle size={14} className="text-blue-500 flex-shrink-0" />
              <span className="text-xs">Repartidor: <span className="font-medium text-foreground truncate">{selectedRepartoInfo.repartidor_nombre || "N/A"}</span></span>
            </div>
            {selectedRepartoInfo.fecha_reparto && isValid(parseISO(selectedRepartoInfo.fecha_reparto)) && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays size={14} className="text-green-500 flex-shrink-0" />
                    <span className="text-xs">Fecha: <span className="font-medium text-foreground">{format(parseISO(selectedRepartoInfo.fecha_reparto), "PPP", {locale: es})}</span></span>
                </div>
            )}
             {/* Placeholder for reparto status - needs data from a full Reparto object */}
            {/* <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={cn("text-xs", getEstadoRepartoBadgeClass(selectedRepartoInfo.estado))}> {/* Assuming selectedRepartoInfo will have 'estado' */}
            {/*    {getEstadoRepartoDisplayName(selectedRepartoInfo.estado)}
              </Badge>
            </div> */}
          </>
        )}

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Hash size={14} className="text-indigo-500 flex-shrink-0" />
          <span className="text-xs">Paradas de Entrega (en mapa): <span className="font-medium text-foreground">{totalParadasEntrega}</span></span>
        </div>
         {totalParadasRetiroEmpresa > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
                <Building size={14} className="text-teal-500 flex-shrink-0" />
                <span className="text-xs">Retiros en Empresa (en mapa): <span className="font-medium text-foreground">{totalParadasRetiroEmpresa}</span></span>
            </div>
        )}
        {isFilteredByReparto(selectedRepartoId) && calculatedDistanceKm !== null && calculatedDistanceKm !== undefined && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
                <Route size={14} className="text-purple-500 flex-shrink-0" />
                <span className="text-xs">Distancia Estimada: <span className="font-medium text-foreground">{calculatedDistanceKm.toFixed(2)} km</span></span>
            </div>
        )}
         {isFilteredByReparto(selectedRepartoId) && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
                <Info size={14} className="text-gray-500 flex-shrink-0" />
                <span className="text-xs">Tiempo Estimado: <span className="font-medium text-foreground">N/A</span></span>
            </div>
        )}


        {(selectedRepartoId === "all" || selectedRepartoId === "unassigned" || !selectedRepartoId) && unassignedEnviosCount > 0 && (
           <div className="flex items-center gap-1.5 text-muted-foreground pt-1.5 mt-1.5 border-t border-border/50">
            <PackageSearch size={14} className="text-orange-500 flex-shrink-0" />
            <span className="text-xs">Envíos No Asignados (Global): <span className="font-medium text-foreground">{unassignedEnviosCount}</span></span>
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

function isFilteredByReparto(repartoId?: string | null): boolean {
    return !!repartoId && repartoId !== "all" && repartoId !== "unassigned";
}

    