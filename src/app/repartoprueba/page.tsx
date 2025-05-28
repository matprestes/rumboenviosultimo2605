
// src/app/repartoprueba/page.tsx
import * as React from 'react';
import { Suspense } from "react";
import { Loader2, Route } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
    getRepartosForMapFilterAction,
    getEnviosNoAsignadosGeolocalizadosAction,
    type RepartoParaFiltro,
    type EnvioMapa
} from "./actions";
import MapaEnviosPageContent from "@/components/repartopruebas/mapa-envios-page-content"; // Import the new client component
import { Skeleton } from "@/components/ui/skeleton";

function MapaEnviosSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 xl:gap-6 flex-grow h-full">
      <div className="lg:col-span-1 space-y-4 xl:space-y-6 flex flex-col">
        <Skeleton className="h-20 w-full rounded-2xl" /> {/* Filter */}
        <Skeleton className="h-36 w-full rounded-2xl" /> {/* Summary */}
        <Skeleton className="h-48 w-full rounded-2xl flex-grow" /> {/* Unassigned list */}
      </div>
      <div className="lg:col-span-3">
        <Skeleton className="h-[50vh] md:h-[60vh] lg:h-full min-h-[400px] w-full rounded-2xl" />
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

  // Fetch data that doesn't depend on client-side interaction here
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

export const dynamic = 'force-dynamic';
