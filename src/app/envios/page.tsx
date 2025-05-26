
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function EnviosPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Package size={32} />
          Gestión de Envíos
        </h1>
        <p className="text-muted-foreground mt-1">
          Crea y administra envíos individuales y por lote.
        </p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Envíos</CardTitle>
          <CardDescription>
            Aquí podrás ver, crear, editar y eliminar envíos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              La funcionalidad de gestión de envíos se implementará aquí.
            </p>
            <p className="text-sm text-muted-foreground">
              (Individuales y por lote, con todas sus propiedades)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
