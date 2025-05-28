
// src/app/repartoprueba/page.tsx
import { MapaEnviosView } from "@/components/repartopruebas/MapaEnviosView"; // Corrected path
import { getEnviosGeolocalizadosAction, getRepartosForMapFilterAction, getEnviosNoAsignadosGeolocalizadosAction } from "./actions";
import { RepartoMapFilter } from "@/components/repartopruebas/RepartoMapFilter"; // Corrected path
import { EnviosNoAsignadosCard } from "@/components/repartopruebas/EnviosNoAsignadosCard"; // Corrected path
import { MapaEnviosSummary } from "@/components/repartopruebas/MapaEnviosSummary"; // Corrected path
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Route } from "lucide-react";
import type { RepartoParaFiltro, EnvioMapa } from "@/types/supabase";
import { PageHeader } from "@/components/ui/page-header"; // Use the new PageHeader

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
  
  // Determine what to fetch for the main map view based on selectedRepartoId
  let enviosParaMapa: EnvioMapa[] = [];
  let errorMapa: string | null = null;

  if (selectedRepartoId === "unassigned") {
    enviosParaMapa = initialUnassignedEnviosData; // Already fetched
  } else {
    const { data, error } = await getEnviosGeolocalizadosAction(selectedRepartoId); // 'all' or specific ID
    if (error) {
      errorMapa = error;
    } else {
      enviosParaMapa = data || [];
    }
  }

  if (errorMapa) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-400px)] border-2 border-dashed border-destructive/30 rounded-lg bg-card shadow p-8 text-center">
        <AlertTriangle className="w-20 h-20 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error al Cargar Envíos del Mapa</h2>
        <p className="text-destructive/80 max-w-md">{errorMapa}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Por favor, verifique su conexión o si hay envíos geolocalizados para el filtro seleccionado.
        </p>
      </div>
    );
  }
  
  const isFilteredBySpecificReparto = !!selectedRepartoId && selectedRepartoId !== "all" && selectedRepartoId !== "unassigned";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
      {/* Left Column: Filters and Summaries */}
      <div className="lg:col-span-1 space-y-4 flex flex-col">
        <RepartoMapFilter repartos={repartosParaFiltro} currentRepartoId={selectedRepartoId} />
        <MapaEnviosSummary 
            displayedEnvios={enviosParaMapa || []} 
            unassignedEnviosCount={initialUnassignedEnviosCount}
            selectedRepartoId={selectedRepartoId}
            repartosList={repartosParaFiltro}
        />
        {/* Only show EnviosNoAsignadosCard if not specifically filtering for unassigned OR if showing all */}
        {(selectedRepartoId === "all" || !selectedRepartoId) && initialUnassignedEnviosCount > 0 && (
            <EnviosNoAsignadosCard envios={initialUnassignedEnviosData} />
        )}
        {selectedRepartoId === "unassigned" && (
             <EnviosNoAsignadosCard envios={initialUnassignedEnviosData} />
        )}
      </div>
      {/* Right Column: Map View */}
      <div className="lg:col-span-3 h-[calc(100vh-230px)] min-h-[450px] lg:min-h-0 rounded-lg overflow-hidden shadow-md">
         <MapaEnviosView 
            envios={enviosParaMapa || []} 
            isFilteredByReparto={isFilteredBySpecificReparto} 
            selectedEnvioIdForPopup={null} // This page doesn't seem to have logic to externally trigger info windows yet
        />
      </div>
    </div>
  );
}

export default async function MapaEnviosMainPage({ searchParams }: { searchParams?: { repartoId?: string; }}) {
  // Normalize repartoId: 'all', 'unassigned', or a specific UUID
  let rawRepartoId = searchParams?.repartoId || "all";
  if (rawRepartoId && rawRepartoId !== "all" && rawRepartoId !== "unassigned") {
    rawRepartoId = rawRepartoId.split('?')[0]; // Clean up potential query params if any
  }
  const selectedRepartoId = rawRepartoId;
  
  // Fetch data for filters and initial unassigned list concurrently
  const [repartosFilterResult, enviosNoAsignadosResult] = await Promise.all([
    getRepartosForMapFilterAction(),
    getEnviosNoAsignadosGeolocalizadosAction()
  ]);

  const repartosParaFiltro = repartosFilterResult.data || [];
  const initialUnassignedEnviosData = enviosNoAsignadosResult.data || [];
  const initialUnassignedEnviosCount = enviosNoAsignadosResult.count || 0;

  // Log errors if any, but allow the page to render with available data
  if (repartosFilterResult.error) {
     console.error("Error fetching repartos for filter (MapaEnviosMainPage):", repartosFilterResult.error);
  }
  if (enviosNoAsignadosResult.error) {
    console.error("Error fetching initial unassigned envios (MapaEnviosMainPage):", enviosNoAsignadosResult.error);
  }

  return (
    <div className="flex flex-col h-full">
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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
      <div className="lg:col-span-1 space-y-4">
        <Skeleton className="h-20 w-full rounded-lg" /> {/* Filter Card Placeholder */}
        <Skeleton className="h-28 w-full rounded-lg" /> {/* Summary Card Placeholder */}
        <Skeleton className="h-48 w-full rounded-lg flex-grow" /> {/* Unassigned Card Placeholder */}
      </div>
      <div className="lg:col-span-3">
        <Skeleton className="h-[calc(100vh-230px)] min-h-[450px] w-full rounded-lg" /> {/* Map Placeholder */}
      </div>
    </div>
  );
}

// This page uses searchParams, so it should be dynamic.
export const dynamic = 'force-dynamic';
