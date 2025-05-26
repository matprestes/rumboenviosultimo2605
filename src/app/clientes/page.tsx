
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Users size={32} />
          Gestión de Clientes
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra los clientes de Rumbos Envíos.
        </p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Clientes</CardTitle>
          <CardDescription>
            Aquí podrás ver, crear, editar y eliminar clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <Users className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              La funcionalidad de gestión de clientes se implementará aquí.
            </p>
            <p className="text-sm text-muted-foreground">
              (CRUD con nombre, apellido, dirección, geocodificación, teléfono, email, notas, empresa asociada, estado)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
