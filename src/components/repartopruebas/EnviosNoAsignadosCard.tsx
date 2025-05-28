// src/components/repartopruebas/EnviosNoAsignadosCard.tsx
"use client";

import type { EnvioMapa } from "@/app/repartoprueba/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PackageSearch, MapPin, Box, Weight, UserCircle2 } from "lucide-react";
import { EstadoEnvioEnum } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface EnviosNoAsignadosCardProps {
  envios: EnvioMapa[];
}

function getEstadoEnvioBadgeClass(estado: string | null): string {
    if (!estado) return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600';
    switch (estado) {
        case EstadoEnvioEnum.Values.pendiente_asignacion: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100 border-yellow-300 dark:border-yellow-600';
        // Add other specific states if they appear in "unassigned" context, though typically they shouldn't
        default: return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600';
    }
}

export function EnviosNoAsignadosCard({ envios }: EnviosNoAsignadosCardProps) {

  if (!envios || envios.length === 0) {
    // Don't render the card if there are no unassigned envios, the summary can handle the global count.
    // This component is specifically for listing them if they exist and are relevant to the current filter.
    return null; 
  }

  return (
    <Card className="rounded-2xl shadow-md flex flex-col flex-grow min-h-0"> {/* min-h-0 allows flex-grow to work properly */}
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <PackageSearch size={18} className="text-primary flex-shrink-0" />
            Envíos No Asignados ({envios.length})
        </CardTitle>
        <CardDescription className="text-xs">Listado de envíos pendientes de asignación a un reparto.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-hidden"> {/* Remove direct padding, ScrollArea will handle it */}
        <ScrollArea className="h-full"> {/* h-full makes ScrollArea fill its parent */}
          <div className="p-4 space-y-2"> {/* Add padding to the content inside ScrollArea */}
            {envios.map((envio) => (
              <div key={envio.id} className="p-3 border rounded-lg bg-card hover:bg-muted/50 transition-shadow cursor-pointer shadow-sm">
                <div className="flex justify-between items-start mb-1.5">
                  <h4 className="font-medium text-sm flex items-center gap-1.5 text-foreground">
                    <UserCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{envio.nombre_cliente || "Destinatario Temporal"}</span>
                  </h4>
                  <Badge variant="outline" className={cn("capitalize text-xs px-2 py-0.5", getEstadoEnvioBadgeClass(envio.status))}>
                    {envio.status ? envio.status.replace(/_/g, ' ') : 'N/A'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1 truncate">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  {envio.client_location || "Dirección no especificada"}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Box className="h-3.5 w-3.5 flex-shrink-0" /> {envio.tipo_paquete_nombre || '-'}
                    </span>
                    <span className="flex items-center gap-1">
                        <Weight className="h-3.5 w-3.5 flex-shrink-0" /> {envio.package_weight != null ? `${envio.package_weight}kg` : '-'}
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
