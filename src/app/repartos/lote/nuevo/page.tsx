
"use client";

import * as React from 'react';
import { RepartoLoteForm } from '@/components/forms/reparto-lote-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layers, ArrowLeft, Loader2 } from 'lucide-react'; // Layers icon for batch
import { 
    createRepartoLoteAction, 
    getRepartidoresForSelectAction, 
    getEmpresasForSelectAction,
} from '@/actions/reparto-actions';
import { getTiposServicioForSelect } from '@/actions/envio-actions'; // For individual assignment
import type { Repartidor, Empresa, RepartoLoteFormValues, TipoServicio } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NuevoRepartoLotePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const [empresas, setEmpresas] = React.useState<Pick<Empresa, 'id' | 'nombre'>[]>([]);
  const [repartidores, setRepartidores] = React.useState<Pick<Repartidor, 'id' | 'nombre'>[]>([]);
  const [tiposServicio, setTiposServicio] = React.useState<TipoServicio[]>([]);

  React.useEffect(() => {
    async function loadInitialData() {
      setIsLoadingData(true);
      try {
        const [empresasData, repartidoresData, tiposServicioData] = await Promise.all([
          getEmpresasForSelectAction(),
          getRepartidoresForSelectAction(),
          getTiposServicioForSelect(),
        ]);
        setEmpresas(empresasData);
        setRepartidores(repartidoresData);
        setTiposServicio(tiposServicioData);
      } catch (error) {
        console.error("Error loading initial data for reparto lote form:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos necesarios para el formulario.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    }
    loadInitialData();
  }, [toast]);

  const handleCreateRepartoLote = async (formData: RepartoLoteFormValues) => {
    // setIsSubmitting is handled by the form component now
    const result = await createRepartoLoteAction(formData);
    if (result.success && result.data) {
      toast({ title: "Reparto por Lote Creado", description: `El reparto para ${formData.empresa_id} en fecha ${formData.fecha_reparto.toLocaleDateString()} ha sido creado.` });
      router.push('/repartos');
    } else {
      toast({ title: "Error al Crear Reparto por Lote", description: result.error || "Ocurrió un error inesperado.", variant: "destructive" });
      if (result.errors) {
        // Optionally iterate through result.errors.fieldErrors for more specific messages
        // For now, the general error message from result.error is shown.
        console.error("Validation errors passed to page:", result.errors);
      }
    }
    return result; // Return result for form to handle
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild>
                <Link href="/repartos"><ArrowLeft /></Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                <Layers size={32} />
                Nuevo Reparto por Lote (Viaje por Empresa)
            </h1>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Planificar Viaje por Empresa</CardTitle>
          <CardDescription>Seleccione una empresa y configure los envíos para sus clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <RepartoLoteForm
            onSubmit={handleCreateRepartoLote}
            empresas={empresas}
            repartidores={repartidores}
            tiposServicio={tiposServicio}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
