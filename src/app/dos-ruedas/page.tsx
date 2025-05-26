
"use client";

import * as React from 'react';
import { DosRuedasEnvioForm } from '@/components/forms/dos-ruedas-envio-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShipWheel } from 'lucide-react';
import { createEnvioAction, getClientesForSelect } from '@/actions/envio-actions';
import type { DosRuedasEnvioFormValues, Cliente } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; // Corrected import

export default function DosRuedasPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [clientes, setClientes] = React.useState<Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'telefono' | 'latitud' | 'longitud'>[]>([]);

  React.useEffect(() => {
    async function loadInitialData() {
      setIsLoadingData(true);
      try {
        const clientesData = await getClientesForSelect();
        // For this form, we need more client details than just name/id for auto-population
        const { data: fullClientesData, error } = await supabase
            .from('clientes')
            .select('id, nombre, apellido, direccion, telefono, latitud, longitud')
            .eq('estado', 'activo')
            .order('apellido')
            .order('nombre');

        if (error) throw error;
        setClientes(fullClientesData || []);

      } catch (error) {
        console.error("Error loading initial data for Dos Ruedas form:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los clientes.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    }
    loadInitialData();
  }, [toast]);

  const handleCreateDosRuedasEnvio = async (formData: DosRuedasEnvioFormValues) => {
    setIsSubmitting(true); // Ensure isSubmitting is managed by this page
    const result = await createEnvioAction(formData as any); // Cast as any for now, action will be updated
    setIsSubmitting(false);
    if (result.success && result.data) {
      toast({ title: "Pedido Recibido", description: `Tu pedido ID ${result.data.id?.substring(0,8)}... ha sido creado. Un operador se contactará.` });
      // Optionally redirect or clear form
      // router.push('/'); 
      // form.reset(); // If form instance was available here
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
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Nuevo Pedido</CardTitle>
          <CardDescription>Completa los datos para realizar tu envío.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Cargando clientes...</p>
            </div>
          ) : (
            <DosRuedasEnvioForm
              onSubmit={handleCreateDosRuedasEnvio}
              clientes={clientes}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
            />
          )}
           <p className="text-sm text-muted-foreground mt-6 text-center">
            Una vez recibido el pedido, un operador se comunicará vía WhatsApp para informar valor y compartir el seguimiento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
