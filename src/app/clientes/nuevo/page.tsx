
"use client";

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClienteForm } from '@/components/forms/cliente-form';
import type { ClienteFormValues } from '@/lib/schemas'; // Empresa type is not needed here
import { useToast } from '@/hooks/use-toast';
import { createClienteAction } from '@/actions/cliente-actions';
import { getEmpresasForSelect } from '@/actions/envio-actions'; // Reusing this action
import { UserPlus, ArrowLeft, Loader2 } from 'lucide-react';

interface EmpresaOption {
  id: string;
  nombre: string;
}

export default function NuevoClientePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [empresas, setEmpresas] = React.useState<EmpresaOption[]>([]);
  const [isLoadingEmpresas, setIsLoadingEmpresas] = React.useState(true);

  React.useEffect(() => {
    async function loadEmpresas() {
      setIsLoadingEmpresas(true);
      try {
        const empresasData = await getEmpresasForSelect();
        setEmpresas(empresasData);
      } catch (error) {
        console.error("Error fetching empresas for ClienteForm:", error);
        toast({
          title: "Error al cargar empresas",
          description: "No se pudieron obtener las empresas para el formulario.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingEmpresas(false);
      }
    }
    loadEmpresas();
  }, [toast]);

  const handleCreateCliente = async (formData: ClienteFormValues) => {
    setIsSubmitting(true);
    const result = await createClienteAction(formData);
    setIsSubmitting(false);

    if (result.success && result.data) {
      toast({
        title: "Cliente Creado",
        description: `El cliente "${result.data.nombre} ${result.data.apellido}" ha sido creado exitosamente.`,
      });
      router.push('/clientes');
    } else {
      toast({
        title: "Error al Crear Cliente",
        description: result.error || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/clientes"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <UserPlus size={32} />
            Crear Nuevo Cliente
          </h1>
        </div>
      </div>
      <Card className="rounded-2xl shadow-md">
        <CardHeader className="p-6">
          <CardTitle>Detalles del Nuevo Cliente</CardTitle>
          <CardDescription>Complete la información a continuación para registrar un nuevo cliente.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoadingEmpresas ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" /> 
              <p className="ml-2">Cargando datos de empresas...</p>
            </div>
          ) : (
            <ClienteForm
              onSubmit={handleCreateCliente}
              empresas={empresas}
              isSubmitting={isSubmitting}
              submitButtonText="Crear Cliente"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
