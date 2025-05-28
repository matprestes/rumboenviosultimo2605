// src/app/repartoprueba/page.tsx
import * as React from 'react'; // Import React
import { Suspense } from "react";
import { Loader2, AlertTriangle, Route } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
    getEnviosGeolocalizadosAction,
    getRepartosForMapFilterAction,
    getEnviosNoAsignadosGeolocalizadosAction,
    type RepartoParaFiltro,
    type EnvioMapa
} from "./actions";
import { RepartoMapFilter } from "@/components/repartopruebas/RepartoMapFilter";
import { EnviosNoAsignadosCard } from "@/components/repartopruebas/EnviosNoAsignadosCard";
import { MapaEnviosSummary } from "@/components/repartopruebas/MapaEnviosSummary";
import { MapaEnviosView } from "@/components/repartopruebas/MapaEnviosView";
import { Skeleton } from "@/components/ui/skeleton";

interface MapaEnviosPageContentProps {
  selectedRepartoId?: string | null;
  repartosParaFiltro: RepartoParaFiltro[];
  initialUnassignedEnviosData: EnvioMapa[];
  initialUnassignedEnviosCount: number;
}

async function MapaEnviosPageContent({
  selectedRepartoId,
  repartosParaFiltro,
  initialUnassignedEnviosData,
  initialUnassignedEnviosCount
}: MapaEnviosPageContentProps) {

  let enviosParaMapa: EnvioMapa[] = [];
  let errorMapa: string | null = null;
  const [calculatedDistance, setCalculatedDistance] = React.useState<number | null>(null);

  // Determine which envios to fetch based on the filter
  if (selectedRepartoId === "unassigned") {
    enviosParaMapa = initialUnassignedEnviosData;
  } else {
    const { data, error } = await getEnviosGeolocalizadosAction(selectedRepartoId); // selectedRepartoId can be 'all' or a specific ID
    if (error) {
      errorMapa = error;
    } else {
      enviosParaMapa = data || [];
    }
  }

  if (errorMapa) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] border-2 border-dashed border-destructive/30 rounded-2xl bg-card shadow-md p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error al Cargar Envíos del Mapa</h2>
        <p className="text-destructive/80 max-w-md">{errorMapa}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Por favor, verifique su conexión o si hay envíos geolocalizados para el filtro seleccionado.
        </p>
      </div>
    );
  }

  const isFilteredBySpecificReparto = !!selectedRepartoId && selectedRepartoId !== "all" && selectedRepartoId !== "unassigned";
  
  // Callback para recibir la distancia calculada desde el mapa
  const handleDistanceCalculated = (distance: number | null) => {
    // En un Server Component, no podemos usar useState directamente.
    // Esta lógica debería estar en un Client Component si el estado necesita ser interactivo.
    // Para esta estructura, la distancia se calculará en MapaEnviosView y se pasará a MapaEnviosSummary
    // directamente si MapaEnviosView es un Client Component y puede llamar a una prop.
    // O, MapaEnviosSummary podría recalcularla si tiene los envios.
    // Por ahora, si MapaEnviosView calcula, pasamos el valor a MapaEnviosSummary
    // (requiere que MapaEnviosPageContent sea Client Component para usar setCalculatedDistance)
    // Dado que MapaEnviosPageContent es un RSC, no podemos tener estado interactivo aquí.
    // La distancia se pasará como prop si MapaEnviosView puede devolverla o MapaEnviosSummary la calcula.
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
      <div className="lg:col-span-1 space-y-4 flex flex-col">
        <RepartoMapFilter repartos={repartosParaFiltro} currentRepartoId={selectedRepartoId} />
        <MapaEnviosSummary
            displayedEnvios={enviosParaMapa || []}
            unassignedEnviosCount={initialUnassignedEnviosCount}
            selectedRepartoId={selectedRepartoId}
            repartosList={repartosParaFiltro}
            // calculatedDistanceKm={calculatedDistance} // Se pasaría si se pudiera manejar estado aquí
        />
        {(selectedRepartoId === "all" || selectedRepartoId === "unassigned" || !selectedRepartoId) && initialUnassignedEnviosCount > 0 && (
            <EnviosNoAsignadosCard envios={initialUnassignedEnviosData} />
        )}
        {isFilteredBySpecificReparto && initialUnassignedEnviosCount > 0 && (
             <EnviosNoAsignadosCard envios={initialUnassignedEnviosData} />
        )}
      </div>
      <div className="lg:col-span-3 h-[calc(100vh-200px)] md:h-[calc(100vh-180px)] min-h-[400px] lg:min-h-full rounded-2xl overflow-hidden shadow-md border border-border/50">
         <MapaEnviosView
            envios={enviosParaMapa || []}
            isFilteredByReparto={isFilteredBySpecificReparto}
            selectedEnvioIdForPopup={null} 
            // onDistanceCalculated={setCalculatedDistance} // No se puede usar setCalculatedDistance en RSC
        />
      </div>
    </div>
  );
}

export default async function MapaEnviosMainPage({ searchParams }: { searchParams?: { repartoId?: string; }}) {
  let rawRepartoId = searchParams?.repartoId || "all";
  if (rawRepartoId && rawRepartoId !== "all" && rawRepartoId !== "unassigned") {
    rawRepartoId = rawRepartoId.split('?')[0]; 
  }
  const selectedRepartoId = rawRepartoId;

  const [repartosFilterResult, enviosNoAsignadosResult] = await Promise.all([
    getRepartosForMapFilterAction(),
    getEnviosNoAsignadosGeolocalizadosAction()
  ]);

  const repartosParaFiltro = repartosFilterResult.data || [];
  const initialUnassignedEnviosData = enviosNoAsignadosResult.data || [];
  const initialUnassignedEnviosCount = enviosNoAsignadosResult.count || 0;

  if (repartosFilterResult.error) {
     console.error("Error fetching repartos for filter (MapaEnviosMainPage):", repartosFilterResult.error);
  }
  if (enviosNoAsignadosResult.error) {
    console.error("Error fetching initial unassigned envios (MapaEnviosMainPage):", enviosNoAsignadosResult.error);
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <PageHeader
        title="Mapa de Envíos y Repartos"
        description="Visualice la ubicación de los envíos, filtre por reparto o vea los no asignados."
        icon={Route}
      />
      <Suspense fallback={<MapaEnviosSkeleton />}>
        <MapaEnviosPageContent
          selectedRepartoId={selectedRepartoId}
          repartosParaFiltro={repartosParaFiltro}
          initialUnassignedEnviosData={initialUnassignedEnviosData}
          initialUnassignedEnviosCount={initialUnassignedEnviosCount}
        />
      </Suspense>
    </div>
  );
}

function MapaEnviosSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
      <div className="lg:col-span-1 space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" /> {/* Filter */}
        <Skeleton className="h-32 w-full rounded-2xl" /> {/* Summary */}
        <Skeleton className="h-48 w-full rounded-2xl flex-grow" /> {/* Unassigned list */}
      </div>
      <div className="lg:col-span-3">
        <Skeleton className="h-[calc(100vh-200px)] md:h-[calc(100vh-180px)] min-h-[400px] lg:min-h-full w-full rounded-2xl" />
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';

    