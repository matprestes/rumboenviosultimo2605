
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Settings size={32} />
          Configuración del Sistema
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra tarifas, tipos de servicio y tipos de paquete.
        </p>
      </header>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tarifas por Kilómetro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Gestión de tarifas para servicios express y lowcost.</p>
            <div className="mt-4 flex items-center justify-center h-32 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground">Contenido de tarifas...</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Servicio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">CRUD de tipos de servicio y precios base.</p>
             <div className="mt-4 flex items-center justify-center h-32 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground">Contenido de servicios...</p>
            </div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Tipos de Paquete</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">CRUD de tipos de paquete.</p>
             <div className="mt-4 flex items-center justify-center h-32 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground">Contenido de paquetes...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
