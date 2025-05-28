
"use client";

import type { EnvioMapa } from "@/types/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PackageSearch, MapPin, Box, Weight, UserCircle } from "lucide-react"; // Changed Package to Box
import { estadoEnvioEnum } from "@/lib/schemas";

interface EnviosNoAsignadosCardProps {
  envios: EnvioMapa[];
}

function getEstadoEnvioBadgeColor(estado: string | null): string {
    if (!estado) return 'bg-gray-400 text-white';
    switch (estado) {
      case estadoEnvioEnum.Values.pending: return 'bg-yellow-500 text-black';
      case estadoEnvioEnum.Values.suggested: return 'bg-purple-500 text-white';
      default: return 'bg-gray-500 text-white'; 
    }
  }

export function EnviosNoAsignadosCard({ envios }: EnviosNoAsignadosCardProps) {
  if (!envios || envios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-muted-foreground" />
            Envíos No Asignados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay envíos geolocalizados sin asignar actualmente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-primary" />
            Envíos No Asignados ({envios.length})
        </CardTitle>
        <CardDescription>Envíos geolocalizados que aún no pertenecen a ningún reparto.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-3">
          <div className="space-y-3">
            {envios.map((envio) => (
              <div key={envio.id} className="p-3 border rounded-md bg-muted/30 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                    {envio.nombre_cliente || "Destinatario Temporal"}
                  </h4>
                  <Badge className={`${getEstadoEnvioBadgeColor(envio.status)} capitalize text-xs`}>
                    {envio.status ? envio.status.replace(/_/g, ' ') : 'Desconocido'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {envio.client_location}
                </p>
                <div className="text-xs text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <Box className="h-3.5 w-3.5" /> {envio.tipo_paquete_nombre || '-'}
                    </span>
                    <span className="flex items-center gap-1">
                        <Weight className="h-3.5 w-3.5" /> {envio.package_weight != null ? `${envio.package_weight}kg` : '-'}
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

    