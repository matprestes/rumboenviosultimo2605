
"use client";

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmpresaForm } from '@/components/forms/empresa-form';
import type { EmpresaFormValues } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { createEmpresaAction } from '@/actions/empresa-actions';
import { Building2, ArrowLeft, Loader2 } from 'lucide-react';

export default function NuevaEmpresaPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleCreateEmpresa = async (formData: EmpresaFormValues) => {
    setIsSubmitting(true);
    const result = await createEmpresaAction(formData);
    setIsSubmitting(false);

    if (result.success && result.data) {
      toast({
        title: "Empresa Creada",
        description: `La empresa "${result.data.nombre}" ha sido creada exitosamente.`,
      });
      router.push('/empresas');
    } else {
      toast({
        title: "Error al Crear Empresa",
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
            <Link href="/empresas"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Building2 size={32} />
            Crear Nueva Empresa
          </h1>
        </div>
      </div>
      <Card className="rounded-2xl shadow-md">
        <CardHeader className="p-6">
          <CardTitle>Detalles de la Nueva Empresa</CardTitle>
          <CardDescription>Complete la información a continuación para registrar una nueva empresa.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <EmpresaForm
            onSubmit={handleCreateEmpresa}
            isSubmitting={isSubmitting}
            submitButtonText="Crear Empresa"
          />
        </CardContent>
      </Card>
    </div>
  );
}
