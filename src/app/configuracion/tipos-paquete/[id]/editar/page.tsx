
"use client";

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TipoPaqueteForm } from '@/components/forms/tipo-paquete-form';
import type { TipoPaquete, TipoPaqueteFormValues } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { getTipoPaqueteByIdAction, updateTipoPaqueteAction } from '@/actions/tipos-paquete.actions';
import { Box, ArrowLeft, Loader2 } from 'lucide-react';

interface EditarTipoPaquetePageProps {
  params: { id: string };
}

export default function EditarTipoPaquetePage({ params: paramsProp }: EditarTipoPaquetePageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const resolvedParams = React.use(paramsProp);
  const tipoPaqueteId = resolvedParams.id;

  const [tipoPaquete, setTipoPaquete] = React.useState<TipoPaquete | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!tipoPaqueteId) return;
    async function fetchTipoPaquete() {
      setIsLoading(true);
      const { tipoPaquete: data, error } = await getTipoPaqueteByIdAction(tipoPaqueteId);
      if (error || !data) {
        toast({ title: "Error", description: error || "Tipo de paquete no encontrado.", variant: "destructive" });
        router.push('/configuracion/tipos-paquete');
        return;
      }
      setTipoPaquete(data);
      setIsLoading(false);
    }
    fetchTipoPaquete();
  }, [tipoPaqueteId, toast, router]);

  const handleUpdate = async (formData: TipoPaqueteFormValues) => {
    if (!tipoPaqueteId) return;
    setIsSubmitting(true);
    const result = await updateTipoPaqueteAction(tipoPaqueteId, formData);
    setIsSubmitting(false);

    if (result.success && result.data) {
      toast({
        title: "Tipo de Paquete Actualizado",
        description: `El tipo de paquete "${result.data.nombre}" ha sido actualizado.`,
      });
      router.push('/configuracion/tipos-paquete');
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

  if (!tipoPaquete) {
    return <p className="text-center text-destructive">Tipo de paquete no encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/configuracion/tipos-paquete"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Box size={32} />
            Editar Tipo de Paquete
          </h1>
        </div>
      </div>
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Modificar: {tipoPaquete.nombre}</CardTitle>
          <CardDescription>Actualice la información del tipo de paquete.</CardDescription>
        </CardHeader>
        <CardContent>
          <TipoPaqueteForm
            onSubmit={handleUpdate}
            defaultValues={tipoPaquete}
            isSubmitting={isSubmitting}
            submitButtonText="Actualizar Tipo de Paquete"
          />
        </CardContent>
      </Card>
    </div>
  );
}

    