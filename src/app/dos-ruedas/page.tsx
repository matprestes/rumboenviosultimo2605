
"use client";

import * as React from 'react';
import { DosRuedasEnvioForm, type DosRuedasEnvioFormRef } from '@/components/forms/dos-ruedas-envio-form'; // Import ref type
import { DosRuedasEnvioSummary } from '@/components/dos-ruedas-envio-summary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShipWheel, PackageSearch } from 'lucide-react'; 
import { createEnvioAction, getClientesForSelect, getTiposServicioForSelect } from '@/actions/envio-actions';
import type { DosRuedasEnvioFormValues, Cliente, TipoServicio, DosRuedasCalculatedShipment, Envio } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; 

export default function DosRuedasPage() {
  const { toast } = useToast();
  const router = useRouter();
  const formRef = React.useRef<DosRuedasEnvioFormRef>(null); // Ref for the form
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [clientes, setClientes] = React.useState<Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'telefono' | 'latitud' | 'longitud'>[]>([]);
  const [tiposServicio, setTiposServicio] = React.useState<TipoServicio[]>([]);
  const [calculatedShipment, setCalculatedShipment] = React.useState<DosRuedasCalculatedShipment | null>(null);

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

  // This is the actual function that calls the server action
  const handleActualSubmission = async (formData: DosRuedasEnvioFormValues) => {
    setIsSubmitting(true);
    const result = await createEnvioAction(formData as any); // Casting as 'any' might be needed if types don't perfectly align.
                                                            // Or ensure createEnvioAction can handle DosRuedasEnvioFormValues
    setIsSubmitting(false);
    if (result.success && result.data) {
      toast({ title: "Pedido Recibido", description: `Tu pedido ID ${result.data.id?.substring(0,8)}... ha sido creado. Un operador se contactará.` });
      setCalculatedShipment(null); // Clear summary on successful submission
      // Form reset should be handled inside DosRuedasEnvioForm if ref.current.resetForm() is called by onSubmit
      // Or if the form internally resets on successful onSubmit prop call.
      // For now, assume the form or its parent (this page after successful submit) handles reset.
    } else {
      toast({ title: "Error al Crear Pedido", description: result.error || "Ocurrió un error inesperado.", variant: "destructive" });
    }
    return result;
  };

  const handleConfirmAndSubmitSummary = () => {
    formRef.current?.triggerSubmit();
  };

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="text-center mb-8">
        <ShipWheel className="h-16 w-16 text-primary mx-auto mb-2" />
        <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
          Mensajería Envíos DosRuedas
        </h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <Card className="shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle>Nuevo Pedido</CardTitle>
            <CardDescription>Completa los datos para realizar tu envío. El precio se calculará automáticamente.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Cargando datos del formulario...</p>
              </div>
            ) : (
              <DosRuedasEnvioForm
                ref={formRef} // Assign the ref
                onSubmit={handleActualSubmission} // Pass the actual submission logic
                clientes={clientes}
                tiposServicio={tiposServicio}
                isSubmitting={isSubmitting} // This is for the form's internal loading states
                setIsSubmitting={setIsSubmitting} // This is for the final submission loading state
                onShipmentCalculated={setCalculatedShipment}
              />
            )}
          </CardContent>
        </Card>

        {calculatedShipment && (
          <DosRuedasEnvioSummary 
            data={calculatedShipment} 
            onConfirmAndSubmit={handleConfirmAndSubmitSummary}
            isSubmitting={isSubmitting} // Pass submitting state for the summary button
          />
        )}

        {!calculatedShipment && !isLoadingData && (
             <p className="text-sm text-muted-foreground mt-6 text-center col-span-1 md:col-span-1">
                Una vez calculado el precio, verás un resumen detallado aquí para confirmar tu pedido.
             </p>
        )}
      </div>
    </div>
  );
}
