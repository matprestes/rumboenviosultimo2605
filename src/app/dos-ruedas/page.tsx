
"use client";

import * as React from 'react';
import { DosRuedasEnvioForm } from '@/components/forms/dos-ruedas-envio-form';
import { DosRuedasEnvioSummary } from '@/components/dos-ruedas-envio-summary'; // Import the summary component
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShipWheel, PackageSearch } from 'lucide-react'; 
import { createEnvioAction, getClientesForSelect, getTiposServicioForSelect } from '@/actions/envio-actions';
import type { DosRuedasEnvioFormValues, Cliente, TipoServicio, DosRuedasCalculatedShipment } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; 

export default function DosRuedasPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [clientes, setClientes] = React.useState<Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'telefono' | 'latitud' | 'longitud'>[]>([]);
  const [tiposServicio, setTiposServicio] = React.useState<TipoServicio[]>([]);
  const [calculatedShipment, setCalculatedShipment] = React.useState<DosRuedasCalculatedShipment | null>(null); // State for summary

  React.useEffect(() => {
    async function loadInitialData() {
      setIsLoadingData(true);
      try {
        // Use Promise.all for concurrent fetching
        const [clientesData, serviciosData] = await Promise.all([
          getClientesForSelect(), // This already fetches all necessary fields
          getTiposServicioForSelect()
        ]);
        
        setClientes(clientesData || []); // Ensure it's an array even if data is null/undefined
        setTiposServicio(serviciosData || []);

      } catch (error: any) {
        console.error("Error loading initial data for Dos Ruedas form:", error);
        toast({ 
            title: "Error al Cargar Datos", 
            description: error.message || "No se pudieron cargar los datos necesarios para el formulario.", 
            variant: "destructive" 
        });
        setClientes([]); // Default to empty array on error
        setTiposServicio([]); // Default to empty array on error
      } finally {
        setIsLoadingData(false);
      }
    }
    loadInitialData();
  }, [toast]);

  const handleCreateDosRuedasEnvio = async (formData: DosRuedasEnvioFormValues) => {
    setIsSubmitting(true);
    const result = await createEnvioAction(formData as any); // Cast as any for now, will be refined by schema matching
    setIsSubmitting(false);
    if (result.success && result.data) {
      toast({ title: "Pedido Recibido", description: `Tu pedido ID ${result.data.id?.substring(0,8)}... ha sido creado. Un operador se contactará.` });
      setCalculatedShipment(null); // Clear summary on successful submission
    } else {
      toast({ title: "Error al Crear Pedido", description: result.error || "Ocurrió un error inesperado.", variant: "destructive" });
    }
    return result;
  };

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4"> {/* Increased max-width for summary */}
      <div className="text-center mb-8">
        <ShipWheel className="h-16 w-16 text-primary mx-auto mb-2" />
        <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
          Mensajería Envíos DosRuedas
        </h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6"> {/* Changed to 1 col for now, can adjust later */}
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
                onShipmentCalculated={setCalculatedShipment} // Pass the setter
              />
            )}
          </CardContent>
        </Card>

        {calculatedShipment && (
          <DosRuedasEnvioSummary data={calculatedShipment} />
        )}

        {!calculatedShipment && !isLoadingData && (
             <p className="text-sm text-muted-foreground mt-6 text-center col-span-1 md:col-span-1">
                Una vez calculado el precio, verás un resumen detallado aquí.
             </p>
        )}
      </div>
    </div>
  );
}

