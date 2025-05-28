// src/components/repartopruebas/MapaEnviosSummary.tsx
"use client";

import type { EnvioMapa, RepartoParaFiltro } from "@/app/repartoprueba/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, PackageSearch, Truck, Building, Route, MapPin, Info, CalendarDays, UserCircle, Hash, Milestone } from "lucide-react";
import { tipoParadaEnum, EstadoRepartoEnum } from "@/lib/schemas"; 
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface MapaEnviosSummaryProps {
  displayedEnvios: EnvioMapa[];
  unassignedEnviosCount: number;
  selectedRepartoDetails?: RepartoParaFiltro | null;
  calculatedDistanceKm?: number | null;
  selectedRepartoId?: string | null; // Added this prop
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
  selectedRepartoDetails,
  calculatedDistanceKm,
  selectedRepartoId, // Destructure the new prop
}: MapaEnviosSummaryProps) {

  const totalParadasEnMapa = displayedEnvios.length;
  
  const totalParadasEntrega = displayedEnvios.filter(
    (envio) => envio.tipo_parada === tipoParadaEnum.Values.entrega_cliente
  ).length;
  
  const totalParadasRetiroEmpresa = displayedEnvios.filter(
    (envio) => envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa
  ).length;

  let tituloPrincipal = "Vista General del Mapa";
  let IconoPrincipal = Layers;
  let subtitulo = "Todos los envíos geolocalizados";

  if (selectedRepartoDetails) {
    tituloPrincipal = "Resumen del Reparto";
    IconoPrincipal = selectedRepartoDetails.tipo_reparto === 'individual' ? Route : Building;
    subtitulo = selectedRepartoDetails.label || "Detalles del reparto";
  } else if (selectedRepartoId === "unassigned") { 
    tituloPrincipal = "Envíos No Asignados";
    IconoPrincipal = PackageSearch;
    subtitulo = `Total: ${unassignedEnviosCount} envíos pendientes de asignación.`;
  } else if (selectedRepartoId === "all" || !selectedRepartoId) {
     subtitulo = `Mostrando ${totalParadasEnMapa} paradas en el mapa.`;
  }


  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="p-4 pb-3 border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <IconoPrincipal size={18} className="text-primary flex-shrink-0"/>
            <span className="truncate">{tituloPrincipal}</span>
        </CardTitle>
        <CardDescription className="text-xs truncate">{subtitulo}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-3 space-y-1.5 text-sm">
        {selectedRepartoDetails && (
          <>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <UserCircle size={14} className="text-blue-500 flex-shrink-0" />
              <span className="text-xs">Repartidor: <span className="font-medium text-foreground truncate">{selectedRepartoDetails.repartidor_nombre || "N/A"}</span></span>
            </div>
            {selectedRepartoDetails.fecha_reparto && isValid(parseISO(selectedRepartoDetails.fecha_reparto)) && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays size={14} className="text-green-500 flex-shrink-0" />
                    <span className="text-xs">Fecha: <span className="font-medium text-foreground">{format(parseISO(selectedRepartoDetails.fecha_reparto), "PPP", {locale: es})}</span></span>
                </div>
            )}
            {selectedRepartoDetails.estado && (
                <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={cn("text-xs capitalize px-2 py-0.5", getEstadoRepartoBadgeClass(selectedRepartoDetails.estado))}>
                        {getEstadoRepartoDisplayName(selectedRepartoDetails.estado)}
                    </Badge>
                </div>
            )}
          </>
        )}

        <div className="flex items-center gap-1.5 text-muted-foreground pt-1">
          <Hash size={14} className="text-indigo-500 flex-shrink-0" />
          <span className="text-xs">Total Paradas en Mapa: <span className="font-medium text-foreground">{totalParadasEnMapa}</span></span>
        </div>
        {totalParadasRetiroEmpresa > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
                <Building size={14} className="text-teal-500 flex-shrink-0" />
                <span className="text-xs">Puntos de Retiro (Empresa): <span className="font-medium text-foreground">{totalParadasRetiroEmpresa}</span></span>
            </div>
        )}
         <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin size={14} className="text-red-500 flex-shrink-0" />
            <span className="text-xs">Paradas de Entrega (Clientes): <span className="font-medium text-foreground">{totalParadasEntrega}</span></span>
        </div>

        {calculatedDistanceKm !== null && calculatedDistanceKm !== undefined && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
                <Milestone size={14} className="text-purple-500 flex-shrink-0" />
                <span className="text-xs">Distancia Estimada Ruta: <span className="font-medium text-foreground">{calculatedDistanceKm > 0 ? calculatedDistanceKm.toFixed(2) + ' km' : '-'}</span></span>
            </div>
        )}
         {(selectedRepartoDetails || isFilteredByReparto(selectedRepartoId)) && ( // Show Time only if a specific reparto is selected
            <div className="flex items-center gap-1.5 text-muted-foreground">
                <Info size={14} className="text-gray-500 flex-shrink-0" />
                <span className="text-xs">Tiempo Estimado Ruta: <span className="font-medium text-foreground">N/A</span></span>
            </div>
        )}

        {(selectedRepartoId === "all" || !selectedRepartoId) && unassignedEnviosCount > 0 && (
           <div className="flex items-center gap-1.5 text-muted-foreground pt-1.5 mt-1.5 border-t border-border/30">
            <PackageSearch size={14} className="text-orange-500 flex-shrink-0" />
            <span className="text-xs">Envíos No Asignados (Global): <span className="font-medium text-foreground">{unassignedEnviosCount}</span></span>
          </div>
        )}
        {displayedEnvios.length === 0 && selectedRepartoId !== "unassigned" && (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 pt-1.5 mt-1.5 border-t border-border/30">
                <Info size={14} className="flex-shrink-0" />
                <span className="text-xs">Sin paradas geolocalizadas para este filtro.</span>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to determine if a specific reparto is being filtered (not "all" or "unassigned")
function isFilteredByReparto(repartoId: string | null | undefined): boolean {
    return !!repartoId && repartoId !== "all" && repartoId !== "unassigned";
}
