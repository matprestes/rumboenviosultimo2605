
// src/app/repartoprueba/page.tsx
import { Suspense } from "react";
import { Loader2, AlertTriangle, Route } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { 
    getEnviosGeolocalizadosAction, 
    getRepartosForMapFilterAction, 
    getEnviosNoAsignadosGeolocalizadosAction,
    type RepartoParaFiltro, // Import types from where they are now defined
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

  if (selectedRepartoId === "unassigned") {
    enviosParaMapa = initialUnassignedEnviosData; 
  } else {
    const { data, error } = await getEnviosGeolocalizadosAction(selectedRepartoId); 
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
      <div className="lg:col-span-1 space-y-4 flex flex-col">
        <RepartoMapFilter repartos={repartosParaFiltro} currentRepartoId={selectedRepartoId} />
        <MapaEnviosSummary 
            displayedEnvios={enviosParaMapa || []} 
            unassignedEnviosCount={initialUnassignedEnviosCount}
            selectedRepartoId={selectedRepartoId}
            repartosList={repartosParaFiltro}
        />
        {(selectedRepartoId === "all" || !selectedRepartoId) && initialUnassignedEnviosCount > 0 && (
            <EnviosNoAsignadosCard envios={initialUnassignedEnviosData} />
        )}
        {selectedRepartoId === "unassigned" && (
             <EnviosNoAsignadosCard envios={initialUnassignedEnviosData} />
        )}
      </div>
      <div className="lg:col-span-3 h-[calc(100vh-230px)] min-h-[450px] lg:min-h-0 rounded-lg overflow-hidden shadow-md">
         <MapaEnviosView 
            envios={enviosParaMapa || []} 
            isFilteredByReparto={isFilteredBySpecificReparto} 
            selectedEnvioIdForPopup={null} 
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
        <Skeleton className="h-20 w-full rounded-lg" /> 
        <Skeleton className="h-28 w-full rounded-lg" /> 
        <Skeleton className="h-48 w-full rounded-lg flex-grow" /> 
      </div>
      <div className="lg:col-span-3">
        <Skeleton className="h-[calc(100vh-230px)] min-h-[450px] w-full rounded-lg" />
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
