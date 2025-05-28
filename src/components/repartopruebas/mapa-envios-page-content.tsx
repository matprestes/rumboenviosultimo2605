// src/components/repartopruebas/mapa-envios-page-content.tsx
"use client";

import * as React from 'react';
import type { RepartoParaFiltro, EnvioMapa } from "@/app/repartoprueba/actions";
import { getEnviosGeolocalizadosAction } from "@/app/repartoprueba/actions";
import { RepartoMapFilter } from "@/components/repartopruebas/RepartoMapFilter";
import { EnviosNoAsignadosCard } from "@/components/repartopruebas/EnviosNoAsignadosCard";
import { MapaEnviosSummary } from "@/components/repartopruebas/MapaEnviosSummary";
import { MapaEnviosView } from "@/components/repartopruebas/MapaEnviosView";
import { AlertTriangle, Loader2 } from "lucide-react";

interface MapaEnviosPageContentProps {
  selectedRepartoId?: string | null;
  repartosParaFiltro: RepartoParaFiltro[];
  initialUnassignedEnviosData: EnvioMapa[];
  initialUnassignedEnviosCount: number;
}

export default function MapaEnviosPageContent({
  selectedRepartoId,
  repartosParaFiltro,
  initialUnassignedEnviosData,
  initialUnassignedEnviosCount
}: MapaEnviosPageContentProps) {
  
  const [enviosParaMapa, setEnviosParaMapa] = React.useState<EnvioMapa[]>(selectedRepartoId === "unassigned" ? initialUnassignedEnviosData : []);
  const [errorMapa, setErrorMapa] = React.useState<string | null>(null);
  const [isLoadingMapaData, setIsLoadingMapaData] = React.useState(true);
  const [calculatedDistance, setCalculatedDistance] = React.useState<number | null>(null);

  React.useEffect(() => {
    async function fetchMapData() {
      setIsLoadingMapaData(true);
      setErrorMapa(null);
      setCalculatedDistance(null); 

      if (selectedRepartoId === "unassigned") {
        setEnviosParaMapa(initialUnassignedEnviosData);
        setIsLoadingMapaData(false);
      } else {
        const { data, error } = await getEnviosGeolocalizadosAction(selectedRepartoId); // 'all' or specific ID
        if (error) {
          setErrorMapa(error);
          setEnviosParaMapa([]);
        } else {
          setEnviosParaMapa(data || []);
        }
        setIsLoadingMapaData(false);
      }
    }
    fetchMapData();
  }, [selectedRepartoId, initialUnassignedEnviosData]);

  const isFilteredBySpecificReparto = !!selectedRepartoId && selectedRepartoId !== "all" && selectedRepartoId !== "unassigned";
  
  const selectedRepartoDetails = React.useMemo(() => {
    if (!selectedRepartoId || selectedRepartoId === "all" || selectedRepartoId === "unassigned") {
      return null;
    }
    return repartosParaFiltro.find(r => r.id === selectedRepartoId) || null;
  }, [selectedRepartoId, repartosParaFiltro]);


  if (errorMapa && !isLoadingMapaData) { // Show error only if not loading
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] border-2 border-dashed border-destructive/30 rounded-2xl bg-card shadow-md p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error al Cargar Datos del Mapa</h2>
        <p className="text-destructive/80 max-w-md">{errorMapa}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Intente seleccionar otro filtro o recargar la página.
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 xl:gap-6 flex-grow h-full">
      <div className="lg:col-span-1 space-y-4 xl:space-y-6 flex flex-col min-h-0"> {/* Sidebar column */}
        <RepartoMapFilter repartos={repartosParaFiltro} currentRepartoId={selectedRepartoId} />
        <MapaEnviosSummary
            displayedEnvios={enviosParaMapa || []}
            unassignedEnviosCount={initialUnassignedEnviosCount}
            selectedRepartoDetails={selectedRepartoDetails}
            calculatedDistanceKm={calculatedDistance}
            selectedRepartoId={selectedRepartoId} // Pass selectedRepartoId here
        />
        {(selectedRepartoId === "all" || selectedRepartoId === "unassigned" || !selectedRepartoId) && initialUnassignedEnviosCount > 0 && (
            <EnviosNoAsignadosCard envios={initialUnassignedEnviosData} />
        )}
         {isFilteredBySpecificReparto && initialUnassignedEnviosCount > 0 && initialUnassignedEnviosData.length > 0 && (
             <EnviosNoAsignadosCard envios={initialUnassignedEnviosData} />
        )}
      </div>
      <div className="lg:col-span-3 h-[50vh] md:h-[60vh] lg:h-full min-h-[400px] rounded-2xl overflow-hidden shadow-md border border-border/30 bg-muted/10"> {/* Map column */}
        {isLoadingMapaData ? (
            <div className="flex items-center justify-center h-full bg-background rounded-lg">
                <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                <p className="ml-3 text-muted-foreground">Cargando datos del mapa...</p>
            </div>
        ) : (
            <MapaEnviosView
                envios={enviosParaMapa || []}
                isFilteredByReparto={isFilteredBySpecificReparto}
                selectedEnvioIdForPopup={null} 
                onDistanceCalculated={setCalculatedDistance}
            />
        )}
      </div>
    </div>
  );
}
