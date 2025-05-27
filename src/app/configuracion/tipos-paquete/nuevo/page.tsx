
"use client";

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TipoPaqueteForm } from '@/components/forms/tipo-paquete-form';
import type { TipoPaqueteFormValues } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { createTipoPaqueteAction } from '@/actions/tipos-paquete.actions';
import { Box, ArrowLeft } from 'lucide-react';

export default function NuevoTipoPaquetePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleCreate = async (formData: TipoPaqueteFormValues) => {
    setIsSubmitting(true);
    const result = await createTipoPaqueteAction(formData);
    setIsSubmitting(false);

    if (result.success && result.data) {
      toast({
        title: "Tipo de Paquete Creado",
        description: `El tipo de paquete "${result.data.nombre}" ha sido creado exitosamente.`,
      });
      router.push('/configuracion/tipos-paquete');
    } else {
      toast({
        title: "Error al Crear Tipo de Paquete",
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
            <Link href="/configuracion/tipos-paquete"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Box size={32} />
            Crear Nuevo Tipo de Paquete
          </h1>
        </div>
      </div>
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Detalles del Nuevo Tipo de Paquete</CardTitle>
          <CardDescription>Complete la información a continuación.</CardDescription>
        </CardHeader>
        <CardContent>
          <TipoPaqueteForm
            onSubmit={handleCreate}
            isSubmitting={isSubmitting}
            submitButtonText="Crear Tipo de Paquete"
          />
        </CardContent>
      </Card>
    </div>
  );
}

    