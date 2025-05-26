
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Truck } from "lucide-react";

export default function RepartidoresPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Truck size={32} />
          Gestión de Repartidores
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra los repartidores de Rumbos Envíos.
        </p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Repartidores</CardTitle>
          <CardDescription>
            Aquí podrás ver, crear, editar y eliminar repartidores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <Truck className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              La funcionalidad de gestión de repartidores se implementará aquí.
            </p>
             <p className="text-sm text-muted-foreground">
              (CRUD con nombre y estado)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
