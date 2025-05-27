
"use client";

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TipoServicioForm } from '@/components/forms/tipo-servicio-form';
import type { TipoServicioFormValues } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { createTipoServicioAction } from '@/actions/tipos-servicio.actions';
import { Truck, ArrowLeft } from 'lucide-react';

export default function NuevoTipoServicioPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleCreate = async (formData: TipoServicioFormValues) => {
    setIsSubmitting(true);
    const result = await createTipoServicioAction(formData);
    setIsSubmitting(false);

    if (result.success && result.data) {
      toast({
        title: "Tipo de Servicio Creado",
        description: `El tipo de servicio "${result.data.nombre}" ha sido creado.`,
      });
      router.push('/configuracion/tipos-servicio');
    } else {
      toast({
        title: "Error al Crear",
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
            <Link href="/configuracion/tipos-servicio"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Truck size={32} />
            Crear Nuevo Tipo de Servicio
          </h1>
        </div>
      </div>
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Detalles del Nuevo Tipo de Servicio</CardTitle>
          <CardDescription>Complete la información a continuación.</CardDescription>
        </CardHeader>
        <CardContent>
          <TipoServicioForm
            onSubmit={handleCreate}
            isSubmitting={isSubmitting}
            submitButtonText="Crear Tipo de Servicio"
          />
        </CardContent>
      </Card>
    </div>
  );
}

    