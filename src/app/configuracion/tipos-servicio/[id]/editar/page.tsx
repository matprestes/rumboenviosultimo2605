
"use client";

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TipoServicioForm } from '@/components/forms/tipo-servicio-form';
import type { TipoServicio, TipoServicioFormValues } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { getTipoServicioByIdAction, updateTipoServicioAction } from '@/actions/tipos-servicio.actions';
import { Truck, ArrowLeft, Loader2 } from 'lucide-react';

interface EditarTipoServicioPageProps {
  params: { id: string };
}

export default function EditarTipoServicioPage({ params: paramsProp }: EditarTipoServicioPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const resolvedParams = React.use(paramsProp);
  const tipoServicioId = resolvedParams.id;

  const [tipoServicio, setTipoServicio] = React.useState<TipoServicio | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!tipoServicioId) return;
    async function fetchTipoServicio() {
      setIsLoading(true);
      const { tipoServicio: data, error } = await getTipoServicioByIdAction(tipoServicioId);
      if (error || !data) {
        toast({ title: "Error", description: error || "Tipo de servicio no encontrado.", variant: "destructive" });
        router.push('/configuracion/tipos-servicio');
        return;
      }
      setTipoServicio(data);
      setIsLoading(false);
    }
    fetchTipoServicio();
  }, [tipoServicioId, toast, router]);

  const handleUpdate = async (formData: TipoServicioFormValues) => {
    if (!tipoServicioId) return;
    setIsSubmitting(true);
    const result = await updateTipoServicioAction(tipoServicioId, formData);
    setIsSubmitting(false);

    if (result.success && result.data) {
      toast({
        title: "Tipo de Servicio Actualizado",
        description: `El tipo de servicio "${result.data.nombre}" ha sido actualizado.`,
      });
      router.push('/configuracion/tipos-servicio');
    } else {
      toast({
        title: "Error al Actualizar",
        description: result.error || "Ocurrió un error.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!tipoServicio) {
    return <p className="text-center text-destructive">Tipo de servicio no encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/configuracion/tipos-servicio"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Truck size={32} />
            Editar Tipo de Servicio
          </h1>
        </div>
      </div>
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Modificar: {tipoServicio.nombre}</CardTitle>
          <CardDescription>Actualice la información del tipo de servicio.</CardDescription>
        </CardHeader>
        <CardContent>
          <TipoServicioForm
            onSubmit={handleUpdate}
            defaultValues={tipoServicio}
            isSubmitting={isSubmitting}
            submitButtonText="Actualizar Tipo de Servicio"
          />
        </CardContent>
      </Card>
    </div>
  );
}

    