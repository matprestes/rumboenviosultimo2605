
"use client";

import * as React from 'react';
import { RepartoForm } from '@/components/forms/reparto-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardPlus, ArrowLeft, Loader2 } from 'lucide-react';
import { 
    createRepartoAction, 
    getRepartidoresForSelectAction, 
    getEmpresasForSelectAction,
    getEnviosPendientesAction
} from '@/actions/reparto-actions';
import type { Repartidor, Empresa, EnvioConDetalles, RepartoFormValues } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NuevoRepartoPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const [repartidores, setRepartidores] = React.useState<Pick<Repartidor, 'id' | 'nombre'>[]>([]);
  const [empresas, setEmpresas] = React.useState<Pick<Empresa, 'id' | 'nombre'>[]>([]);
  const [enviosPendientes, setEnviosPendientes] = React.useState<EnvioConDetalles[]>([]);

  React.useEffect(() => {
    async function loadInitialData() {
      setIsLoadingData(true);
      try {
        const [repartidoresData, empresasData, enviosData] = await Promise.all([
          getRepartidoresForSelectAction(),
          getEmpresasForSelectAction(),
          getEnviosPendientesAction() // Initial load with no empresa filter
        ]);
        setRepartidores(repartidoresData);
        setEmpresas(empresasData);
        setEnviosPendientes(enviosData);
      } catch (error) {
        console.error("Error loading initial data for reparto form:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    }
    loadInitialData();
  }, [toast]);

  const handleCreateReparto = async (formData: RepartoFormValues) => {
    setIsSubmitting(true);
    const result = await createRepartoAction(formData);
    setIsSubmitting(false); // Handled by form itself now
    if (result.success && result.data) {
      toast({ title: "Reparto Creado", description: `El reparto para ${formData.fecha_reparto.toLocaleDateString()} ha sido creado.` });
      router.push('/repartos');
    } else {
      toast({ title: "Error al Crear Reparto", description: result.error || "Ocurrió un error inesperado.", variant: "destructive" });
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
                <ClipboardPlus size={32} />
                Crear Nuevo Reparto
            </h1>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Detalles del Nuevo Reparto</CardTitle>
          <CardDescription>Complete la información para planificar un nuevo reparto.</CardDescription>
        </CardHeader>
        <CardContent>
          <RepartoForm
            onSubmit={handleCreateReparto}
            repartidores={repartidores}
            empresas={empresas}
            initialEnviosPendientes={enviosPendientes}
            fetchEnviosPendientes={getEnviosPendientesAction}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
