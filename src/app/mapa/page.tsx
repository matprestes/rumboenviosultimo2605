
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapIcon } from "lucide-react";

export default function MapaPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <MapIcon size={32} />
          Mapa de Envíos
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualiza los envíos asignados y no asignados en Mar del Plata.
        </p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Visualización Geográfica</CardTitle>
          <CardDescription>
            Integración con Google Maps para mostrar la ubicación de los envíos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <MapIcon className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              El mapa interactivo de envíos se implementará aquí.
            </p>
            <img src="https://placehold.co/400x200.png" alt="Placeholder de mapa" data-ai-hint="map placeholder" className="mt-4 rounded opacity-80"/>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
