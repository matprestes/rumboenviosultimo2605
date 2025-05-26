
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, PlusCircle } from "lucide-react";
// import { EmpresaForm } from "@/components/forms/empresa-form"; // Example import

export default function EmpresasPage() {
  // const handleEmpresaSubmit = async (data: any) => { // Replace 'any' with EmpresaFormValues
  //   console.log("Empresa data:", data);
  //   // Here you would call your Supabase client to save the data
  //   // await supabase.from('empresas').insert([data]);
  //   // Add error handling and success notifications
  // };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Building2 size={32} />
            Gestión de Empresas
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra las empresas asociadas a Rumbos Envíos.
          </p>
        </div>
        <Button> {/* This button would typically open a Dialog with the EmpresaForm */}
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Empresa
        </Button>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Empresas</CardTitle>
          <CardDescription>
            Aquí podrás ver, crear, editar y eliminar empresas.
            {/* Example usage of the form, likely within a Dialog or on a separate page */}
            {/* <EmpresaForm onSubmit={handleEmpresaSubmit} /> */}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              El listado de empresas se implementará aquí.
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
