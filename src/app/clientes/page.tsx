
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Users, PlusCircle, Loader2 } from "lucide-react";
import { ClienteForm } from "@/components/forms/cliente-form";
import type { ClienteFormValues } from '@/lib/schemas';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmpresaOption {
  id: string;
  nombre: string;
}

export default function ClientesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [empresas, setEmpresas] = React.useState<EmpresaOption[]>([]);
  const [isLoadingEmpresas, setIsLoadingEmpresas] = React.useState(true);

  React.useEffect(() => {
    const fetchEmpresas = async () => {
      setIsLoadingEmpresas(true);
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre')
        .eq('estado', 'activo'); // Fetch only active empresas

      if (error) {
        console.error("Error fetching empresas:", error);
        toast({
          title: "Error al Cargar Empresas",
          description: "No se pudieron cargar las empresas para el formulario.",
          variant: "destructive",
        });
        setEmpresas([]);
      } else {
        setEmpresas(data || []);
      }
      setIsLoadingEmpresas(false);
    };
    fetchEmpresas();
  }, [toast]);

  const handleClienteSubmit = async (data: ClienteFormValues & { latitud?: number | null; longitud?: number | null }) => {
    setIsSubmitting(true);
    try {
      const clienteData = {
        nombre: data.nombre,
        apellido: data.apellido,
        direccion: data.direccion,
        latitud: data.latitud,
        longitud: data.longitud,
        telefono: data.telefono,
        email: data.email,
        empresa_id: data.empresa_id === 'no_empresa' ? null : data.empresa_id, // Handle "Ninguna" option
        notas: data.notas,
        estado: data.estado,
      };

      const { error } = await supabase.from('clientes').insert([clienteData]);

      if (error) {
        throw error;
      }

      toast({
        title: "Cliente Creado",
        description: `El cliente "${data.nombre} ${data.apellido}" ha sido creado exitosamente.`,
        variant: "default",
      });
      setIsDialogOpen(false); // Close dialog on success
      // Here you would typically refresh the list of clientes
    } catch (error: any) {
      console.error("Error creating cliente:", error);
      toast({
        title: "Error al Crear Cliente",
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
            <Users size={32} />
            Gestión de Clientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra los clientes de Rumbos Envíos.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={isLoadingEmpresas}>
              {isLoadingEmpresas ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Cliente</DialogTitle>
              <DialogDescription>
                Complete los detalles del nuevo cliente. Haga clic en guardar cuando haya terminado.
              </DialogDescription>
            </DialogHeader>
            {isLoadingEmpresas ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" /> 
                <p className="ml-2">Cargando datos de empresas...</p>
              </div>
            ) : (
              <ClienteForm 
                onSubmit={handleClienteSubmit} 
                empresas={empresas}
                isSubmitting={isSubmitting}
                submitButtonText="Guardar Cliente"
              />
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting || isLoadingEmpresas}>
                    Cancelar
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Clientes</CardTitle>
          <CardDescription>
            Aquí podrás ver, crear, editar y eliminar clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <Users className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              El listado de clientes se implementará aquí.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
