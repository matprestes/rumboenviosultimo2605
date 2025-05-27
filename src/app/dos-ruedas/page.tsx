
"use client";

import * as React from 'react';
import { DosRuedasEnvioForm } from '@/components/forms/dos-ruedas-envio-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShipWheel, PackageSearch } from 'lucide-react'; // Changed PackageQuestion to PackageSearch
import { createEnvioAction, getClientesForSelect, getTiposServicioForSelect } from '@/actions/envio-actions';
import type { DosRuedasEnvioFormValues, Cliente, TipoServicio } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; 

export default function DosRuedasPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [clientes, setClientes] = React.useState<Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'telefono' | 'latitud' | 'longitud'>[]>([]);
  const [tiposServicio, setTiposServicio] = React.useState<TipoServicio[]>([]);

  React.useEffect(() => {
    async function loadInitialData() {
      setIsLoadingData(true);
      try {
        const [clientesData, serviciosData] = await Promise.all([
          getClientesForSelect(),
          getTiposServicioForSelect()
        ]);
        
        setClientes(clientesData || []);
        setTiposServicio(serviciosData || []);

      } catch (error: any) {
        console.error("Error loading initial data for Dos Ruedas form:", error);
        toast({ 
            title: "Error al Cargar Datos", 
            description: error.message || "No se pudieron cargar los datos necesarios para el formulario.", 
            variant: "destructive" 
        });
        setClientes([]); 
        setTiposServicio([]);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadInitialData();
  }, [toast]);

  const handleCreateDosRuedasEnvio = async (formData: DosRuedasEnvioFormValues) => {
    setIsSubmitting(true);
    const result = await createEnvioAction(formData as any); 
    setIsSubmitting(false);
    if (result.success && result.data) {
      toast({ title: "Pedido Recibido", description: `Tu pedido ID ${result.data.id?.substring(0,8)}... ha sido creado. Un operador se contactará.` });
      // Form reset is handled within DosRuedasEnvioForm if needed or can be triggered here
    } else {
      toast({ title: "Error al Crear Pedido", description: result.error || "Ocurrió un error inesperado.", variant: "destructive" });
    }
    return result;
  };

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="text-center mb-8">
        <ShipWheel className="h-16 w-16 text-primary mx-auto mb-2" />
        <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
          Mensajería Envíos DosRuedas
        </h1>
      </div>
      <Card className="shadow-xl rounded-2xl">
        <CardHeader>
          <CardTitle>Nuevo Pedido</CardTitle>
          <CardDescription>Completa los datos para realizar tu envío.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Cargando datos del formulario...</p>
            </div>
          ) : (
            <DosRuedasEnvioForm
              onSubmit={handleCreateDosRuedasEnvio}
              clientes={clientes}
              tiposServicio={tiposServicio}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
            />
          )}
           <p className="text-sm text-muted-foreground mt-6 text-center">
            Una vez recibido el pedido, un operador se comunicará vía WhatsApp para informar valor y compartir el seguimiento. El precio final se calculará en base al servicio y distancia.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
