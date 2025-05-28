
// src/components/repartopruebas/EnviosNoAsignadosCard.tsx
"use client";

import type { EnvioMapa } from "@/app/repartoprueba/actions"; // Adjusted import path
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PackageSearch, MapPin, Box, Weight, UserCircle2 } from "lucide-react";
import { estadoEnvioEnum } from "@/lib/schemas"; // Import from schemas.ts

interface EnviosNoAsignadosCardProps {
  envios: EnvioMapa[];
}

function getEstadoEnvioBadgeClass(estado: string | null): string {
    if (!estado) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300';
    // Ensure we use the enum values for comparison
    if (estado === estadoEnvioEnum.Values.pendiente_asignacion) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100 border-yellow-300';
    // Add other states if they can appear here
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300'; 
}

export function EnviosNoAsignadosCard({ envios }: EnviosNoAsignadosCardProps) {

  if (!envios || envios.length === 0) {
    return (
      <Card className="shadow-sm flex-grow">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-md font-semibold flex items-center gap-2">
            <PackageSearch size={18} className="text-primary" />
            Envíos No Asignados
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-muted-foreground">No hay envíos geolocalizados sin asignar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm flex-grow flex flex-col">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-md font-semibold flex items-center gap-2">
            <PackageSearch size={18} className="text-primary" />
            Envíos No Asignados ({envios.length})
        </CardTitle>
        <CardDescription className="text-xs">Listado de envíos pendientes de asignación a un reparto.</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex-grow overflow-hidden">
        <ScrollArea className="h-full max-h-[calc(100vh-450px)] md:max-h-[calc(100vh-350px)] pr-3 -mr-3"> 
          <div className="space-y-2">
            {envios.map((envio) => (
              <div key={envio.id} className="p-2.5 border rounded-lg bg-card hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium text-xs flex items-center gap-1.5 text-foreground">
                    <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    {envio.nombre_cliente || "Destinatario Temporal"}
                  </h4>
                  <Badge variant="outline" className={`${getEstadoEnvioBadgeClass(envio.status)} capitalize text-xs px-1.5 py-0.5`}>
                    {envio.status ? envio.status.replace(/_/g, ' ') : 'Desconocido'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5 truncate">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {envio.client_location}
                </p>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="flex items-center gap-0.5">
                        <Box className="h-3 w-3 flex-shrink-0" /> {envio.tipo_paquete_nombre || '-'}
                    </span>
                    <span className="flex items-center gap-0.5">
                        <Weight className="h-3 w-3 flex-shrink-0" /> {envio.package_weight != null ? `${envio.package_weight}kg` : '-'}
                    </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
