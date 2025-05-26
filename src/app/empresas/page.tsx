
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Building2, PlusCircle, Loader2 } from "lucide-react";
import { EmpresaForm } from "@/components/forms/empresa-form";
import type { EmpresaFormValues } from '@/lib/schemas';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function EmpresasPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleEmpresaSubmit = async (data: EmpresaFormValues & { latitud?: number | null; longitud?: number | null }) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('empresas').insert([
        {
          nombre: data.nombre,
          direccion: data.direccion,
          latitud: data.latitud,
          longitud: data.longitud,
          telefono: data.telefono,
          email: data.email,
          notas: data.notas,
          estado: data.estado,
        }
      ]);

      if (error) {
        throw error;
      }

      toast({
        title: "Empresa Creada",
        description: `La empresa "${data.nombre}" ha sido creada exitosamente.`,
        variant: "default",
      });
      setIsDialogOpen(false); // Close dialog on success
      // Here you would typically refresh the list of empresas
    } catch (error: any) {
      console.error("Error creating empresa:", error);
      toast({
        title: "Error al Crear Empresa",
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Building2 size={32} />
            Gestión de Empresas
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra las empresas asociadas a Rumbos Envíos.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Crear Nueva Empresa</DialogTitle>
              <DialogDescription>
                Complete los detalles de la nueva empresa. Haga clic en guardar cuando haya terminado.
              </DialogDescription>
            </DialogHeader>
            <EmpresaForm 
              onSubmit={handleEmpresaSubmit} 
              isSubmitting={isSubmitting} 
              submitButtonText="Guardar Empresa"
            />
             <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                    Cancelar
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Empresas</CardTitle>
          <CardDescription>
            Aquí podrás ver, crear, editar y eliminar empresas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              El listado de empresas se implementará aquí.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
