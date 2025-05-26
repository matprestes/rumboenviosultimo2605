
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogDescription, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  // AlertDialogTrigger, // Removed
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, PlusCircle, Loader2, Edit, Trash2 } from "lucide-react";
import { RepartidorForm } from "@/components/forms/repartidor-form";
import type { Repartidor } from '@/lib/schemas';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function RepartidoresPage() {
  const { toast } = useToast();
  const [repartidores, setRepartidores] = React.useState<Repartidor[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingRepartidor, setEditingRepartidor] = React.useState<Repartidor | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [repartidorToDelete, setRepartidorToDelete] = React.useState<Repartidor | null>(null);

  const fetchRepartidores = React.useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('repartidores')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error("Error fetching repartidores:", error);
      toast({
        title: "Error al Cargar Repartidores",
        description: "No se pudieron cargar los repartidores.",
        variant: "destructive",
      });
      setRepartidores([]);
    } else {
      setRepartidores(data || []);
    }
    setIsLoading(false);
  }, [toast]);

  React.useEffect(() => {
    fetchRepartidores();
  }, [fetchRepartidores]);

  const handleFormSubmit = async (formData: Repartidor) => {
    setIsSubmitting(true);
    try {
      let error;
      let successMessage;

      if (editingRepartidor && editingRepartidor.id) {
        // Update
        const { error: updateError } = await supabase
          .from('repartidores')
          .update({
            nombre: formData.nombre,
            estado: formData.estado,
          })
          .eq('id', editingRepartidor.id);
        error = updateError;
        successMessage = `El repartidor "${formData.nombre}" ha sido actualizado.`;
      } else {
        // Create
        const { error: insertError } = await supabase.from('repartidores').insert([
          {
            nombre: formData.nombre,
            estado: formData.estado,
          }
        ]);
        error = insertError;
        successMessage = `El repartidor "${formData.nombre}" ha sido creado.`;
      }

      if (error) throw error;

      toast({
        title: editingRepartidor ? "Repartidor Actualizado" : "Repartidor Creado",
        description: successMessage,
      });
      setIsDialogOpen(false);
      setEditingRepartidor(null);
      fetchRepartidores();
    } catch (error: any) {
      console.error("Error saving repartidor:", error);
      toast({
        title: `Error al ${editingRepartidor ? 'Actualizar' : 'Crear'} Repartidor`,
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (repartidor: Repartidor) => {
    setEditingRepartidor(repartidor);
    setIsDialogOpen(true);
  };
  
  const openNewRepartidorDialog = () => {
    setEditingRepartidor(null);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!repartidorToDelete || !repartidorToDelete.id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('repartidores')
        .delete()
        .eq('id', repartidorToDelete.id);

      if (error) throw error;

      toast({
        title: "Repartidor Eliminado",
        description: `El repartidor "${repartidorToDelete.nombre}" ha sido eliminado.`,
      });
      setRepartidorToDelete(null);
      fetchRepartidores();
    } catch (error: any) {
      toast({
        title: "Error al Eliminar Repartidor",
        description: error.message || "Ocurrió un error al intentar eliminar el repartidor.",
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
        <Button onClick={openNewRepartidorDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Repartidor
        </Button>
      </header>
      
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) setEditingRepartidor(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingRepartidor ? "Editar Repartidor" : "Crear Nuevo Repartidor"}</DialogTitle>
            <DialogDescription>
              {editingRepartidor ? "Modifique los detalles del repartidor." : "Complete los detalles del nuevo repartidor."} Haga clic en guardar cuando haya terminado.
            </DialogDescription>
          </DialogHeader>
          <RepartidorForm 
            key={editingRepartidor ? editingRepartidor.id : 'new'}
            onSubmit={handleFormSubmit} 
            defaultValues={editingRepartidor || undefined}
            isSubmitting={isSubmitting}
            submitButtonText={editingRepartidor ? "Actualizar Repartidor" : "Guardar Repartidor"}
          />
          <DialogFooter>
              <DialogClose asChild>
                  <Button variant="outline" disabled={isSubmitting}>
                      Cancelar
                  </Button>
              </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!repartidorToDelete} onOpenChange={(isOpen) => !isOpen && setRepartidorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este repartidor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al repartidor "{repartidorToDelete?.nombre}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Repartidores</CardTitle>
          <CardDescription>
            Aquí podrás ver, crear, editar y eliminar repartidores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          ) : repartidores.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <Truck className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No hay repartidores registrados. ¡Crea el primero!
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repartidores.map((repartidor) => (
                  <TableRow key={repartidor.id}>
                    <TableCell className="font-medium">{repartidor.nombre}</TableCell>
                    <TableCell>
                       <Badge variant={repartidor.estado === 'activo' ? 'default' : 'secondary'} className={repartidor.estado === 'activo' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}>
                        {repartidor.estado.charAt(0).toUpperCase() + repartidor.estado.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(repartidor)} title="Editar">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setRepartidorToDelete(repartidor)} title="Eliminar">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
