
"use client";

import * as React from 'react';
import { EnvioForm } from '@/components/forms/envio-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PackagePlus, ArrowLeft, Loader2 } from 'lucide-react'; // Added Loader2 here
import { createEnvioAction, getClientesForSelect, getEmpresasForSelect, getTiposPaqueteForSelect, getTiposServicioForSelect } from '@/actions/envio-actions';
import type { Cliente, Empresa, Envio, TipoPaquete, TipoServicio } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NuevoEnvioPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const [clientes, setClientes] = React.useState<Pick<Cliente, 'id' | 'nombre' | 'apellido'>[]>([]);
  const [empresas, setEmpresas] = React.useState<Pick<Empresa, 'id' | 'nombre'>[]>([]);
  const [tiposPaquete, setTiposPaquete] = React.useState<TipoPaquete[]>([]);
  const [tiposServicio, setTiposServicio] = React.useState<TipoServicio[]>([]);

  React.useEffect(() => {
    async function loadInitialData() {
      setIsLoadingData(true);
      try {
        const [clientesData, empresasData, tiposPaqueteData, tiposServicioData] = await Promise.all([
          getClientesForSelect(),
          getEmpresasForSelect(),
          getTiposPaqueteForSelect(),
          getTiposServicioForSelect(),
        ]);
        setClientes(clientesData);
        setEmpresas(empresasData);
        setTiposPaquete(tiposPaqueteData);
        setTiposServicio(tiposServicioData);
      } catch (error) {
        console.error("Error loading initial data for envio form:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos necesarios para el formulario.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    }
    loadInitialData();
  }, [toast]);

  const handleCreateEnvio = async (formData: Envio) => {
    setIsSubmitting(true);
    const result = await createEnvioAction(formData);
    setIsSubmitting(false);
    if (result.success && result.data) {
      toast({ title: "Envío Creado", description: `El envío ID ${result.data.id?.substring(0,8)}... ha sido creado exitosamente.` });
      router.push('/envios');
    } else {
      toast({ title: "Error al Crear Envío", description: result.error || "Ocurrió un error inesperado.", variant: "destructive" });
    }
    return result; // Return result for form to handle
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild>
                <Link href="/envios"><ArrowLeft /></Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                <PackagePlus size={32} />
                Crear Nuevo Envío
            </h1>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Detalles del Nuevo Envío</CardTitle>
          <CardDescription>Complete la información a continuación para registrar un nuevo envío.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" /> 
              <p className="ml-2">Cargando datos del formulario...</p>
            </div>
          ) : (
            <EnvioForm
              onSubmit={handleCreateEnvio}
              clientes={clientes}
              empresas={empresas}
              tiposPaquete={tiposPaquete}
              tiposServicio={tiposServicio}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
              submitButtonText="Crear Envío"
              formType="create"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    
