
"use client";

import * as React from 'react';
import { DosRuedasEnvioForm } from '@/components/forms/dos-ruedas-envio-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShipWheel } from 'lucide-react';
import { createEnvioAction, getClientesForSelect } from '@/actions/envio-actions';
import type { DosRuedasEnvioFormValues, Cliente } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; 
import { supabase } from '@/lib/supabase/client'; // Import supabase for direct calls if needed elsewhere, but not for this specific redundant call

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
        // getClientesForSelect already fetches all necessary client details
        const clientesData = await getClientesForSelect();
        
        if (!clientesData) { // Or check if it's an empty array and handle as needed
          throw new Error("No se pudieron cargar los datos de los clientes.");
        }
        setClientes(clientesData);

      } catch (error: any) {
        console.error("Error loading initial data for Dos Ruedas form:", error);
        toast({ 
            title: "Error al Cargar Datos", 
            description: error.message || "No se pudieron cargar los clientes para el formulario.", 
            variant: "destructive" 
        });
        setClientes([]); // Ensure clientes is an empty array on error
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
      // form.reset(); // This would need the form instance passed down or context
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
