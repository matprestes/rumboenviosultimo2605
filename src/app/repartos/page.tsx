
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function RepartosPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <ClipboardList size={32} />
          Gestión de Repartos
        </h1>
        <p className="text-muted-foreground mt-1">
          Asigna envíos a repartidores y gestiona las hojas de ruta.
        </p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Repartos</CardTitle>
          <CardDescription>
            Aquí podrás ver, crear, editar y eliminar repartos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <ClipboardList className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              La funcionalidad de gestión de repartos se implementará aquí.
            </p>
            <p className="text-sm text-muted-foreground">
              (Asignación de envíos a repartidores, fechas, individuales o por empresa)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
