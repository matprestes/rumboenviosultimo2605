
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Truck, PlusCircle } from "lucide-react";
import { RepartidorForm } from "@/components/forms/repartidor-form";
import type { RepartidorFormValues } from '@/lib/schemas';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function RepartidoresPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleRepartidorSubmit = async (data: RepartidorFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('repartidores').insert([
        {
          nombre: data.nombre,
          estado: data.estado,
        }
      ]);

      if (error) {
        throw error;
      }

      toast({
        title: "Repartidor Creado",
        description: `El repartidor "${data.nombre}" ha sido creado exitosamente.`,
        variant: "default",
      });
      setIsDialogOpen(false); // Close dialog on success
      // Here you would typically refresh the list of repartidores
    } catch (error: any) {
      console.error("Error creating repartidor:", error);
      toast({
        title: "Error al Crear Repartidor",
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
            <Truck size={32} />
            Gestión de Repartidores
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra los repartidores de Rumbos Envíos.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Repartidor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Repartidor</DialogTitle>
              <DialogDescription>
                Complete los detalles del nuevo repartidor. Haga clic en guardar cuando haya terminado.
              </DialogDescription>
            </DialogHeader>
            <RepartidorForm 
              onSubmit={handleRepartidorSubmit} 
              isSubmitting={isSubmitting}
              submitButtonText="Guardar Repartidor"
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
          <CardTitle>Listado de Repartidores</CardTitle>
          <CardDescription>
            Aquí podrás ver, crear, editar y eliminar repartidores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <Truck className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              El listado de repartidores se implementará aquí.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
