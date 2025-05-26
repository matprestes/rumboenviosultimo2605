
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function EmpresasPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Building2 size={32} />
          Gestión de Empresas
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra las empresas asociadas a Rumbos Envíos.
        </p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Empresas</CardTitle>
          <CardDescription>
            Aquí podrás ver, crear, editar y eliminar empresas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              La funcionalidad de gestión de empresas se implementará aquí.
            </p>
            <p className="text-sm text-muted-foreground">
              (CRUD con nombre, dirección, geocodificación, teléfono, email, notas, estado)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
