
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
import { Users, PlusCircle, Loader2, Edit, Trash2, MapPinIcon } from "lucide-react";
import { ClienteForm } from "@/components/forms/cliente-form";
import type { Cliente, Empresa } from '@/lib/schemas'; // Import Empresa type
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface EmpresaOption {
  id: string;
  nombre: string;
}

export default function ClientesPage() {
  const { toast } = useToast();
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [empresas, setEmpresas] = React.useState<EmpresaOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingEmpresas, setIsLoadingEmpresas] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingCliente, setEditingCliente] = React.useState<Cliente | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [clienteToDelete, setClienteToDelete] = React.useState<Cliente | null>(null);


  const fetchClientes = React.useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select(`
        *,
        empresas (
          id,
          nombre
        )
      `)
      .order('apellido', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      console.error("Error fetching clientes:", error);
      toast({
        title: "Error al Cargar Clientes",
        description: "No se pudieron cargar los clientes.",
        variant: "destructive",
      });
      setClientes([]);
    } else {
      setClientes(data || []);
    }
    setIsLoading(false);
  }, [toast]);

  const fetchEmpresas = React.useCallback(async () => {
    setIsLoadingEmpresas(true);
    const { data, error } = await supabase
      .from('empresas')
      .select('id, nombre')
      .eq('estado', 'activo');

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
  }, [toast]);

  React.useEffect(() => {
    fetchClientes();
    fetchEmpresas();
  }, [fetchClientes, fetchEmpresas]);

  const handleFormSubmit = async (formData: Cliente) => {
    setIsSubmitting(true);
    try {
      let error;
      let successMessage;
      
      const dataToUpsert = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        direccion: formData.direccion,
        latitud: formData.latitud,
        longitud: formData.longitud,
        telefono: formData.telefono,
        email: formData.email,
        empresa_id: formData.empresa_id === 'no_empresa' ? null : formData.empresa_id,
        notas: formData.notas,
        estado: formData.estado,
      };

      if (editingCliente && editingCliente.id) {
        // Update
        const { error: updateError } = await supabase
          .from('clientes')
          .update(dataToUpsert)
          .eq('id', editingCliente.id);
        error = updateError;
        successMessage = `El cliente "${formData.nombre} ${formData.apellido}" ha sido actualizado.`;
      } else {
        // Create
        const { error: insertError } = await supabase.from('clientes').insert([dataToUpsert]);
        error = insertError;
        successMessage = `El cliente "${formData.nombre} ${formData.apellido}" ha sido creado.`;
      }

      if (error) throw error;

      toast({
        title: editingCliente ? "Cliente Actualizado" : "Cliente Creado",
        description: successMessage,
      });
      setIsDialogOpen(false);
      setEditingCliente(null);
      fetchClientes();
    } catch (error: any) {
      console.error("Error saving cliente:", error);
      toast({
        title: `Error al ${editingCliente ? 'Actualizar' : 'Crear'} Cliente`,
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setIsDialogOpen(true);
  };

  const openNewClienteDialog = () => {
    setEditingCliente(null);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clienteToDelete || !clienteToDelete.id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clienteToDelete.id);

      if (error) throw error;

      toast({
        title: "Cliente Eliminado",
        description: `El cliente "${clienteToDelete.nombre} ${clienteToDelete.apellido}" ha sido eliminado.`,
      });
      setClienteToDelete(null);
      fetchClientes();
    } catch (error: any) {
      toast({
        title: "Error al Eliminar Cliente",
        description: error.message || "Ocurrió un error al intentar eliminar el cliente.",
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
        <Button onClick={openNewClienteDialog} disabled={isLoadingEmpresas}>
          {isLoadingEmpresas ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          Nuevo Cliente
        </Button>
      </header>
      
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) setEditingCliente(null);
      }}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{editingCliente ? "Editar Cliente" : "Crear Nuevo Cliente"}</DialogTitle>
            <DialogDescription>
              {editingCliente ? "Modifique los detalles del cliente." : "Complete los detalles del nuevo cliente."} Haga clic en guardar cuando haya terminado.
            </DialogDescription>
          </DialogHeader>
          {isLoadingEmpresas && !editingCliente ? ( // Show loader only for new client form if empresas are loading
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" /> 
              <p className="ml-2">Cargando datos de empresas...</p>
            </div>
          ) : (
            <ClienteForm 
              key={editingCliente ? editingCliente.id : 'new'}
              onSubmit={handleFormSubmit}
              defaultValues={editingCliente || undefined}
              empresas={empresas}
              isSubmitting={isSubmitting}
              submitButtonText={editingCliente ? "Actualizar Cliente" : "Guardar Cliente"}
            />
          )}
          <DialogFooter>
              <DialogClose asChild>
                  <Button variant="outline" disabled={isSubmitting || (isLoadingEmpresas && !editingCliente)}>
                      Cancelar
                  </Button>
              </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!clienteToDelete} onOpenChange={(isOpen) => !isOpen && setClienteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al cliente "{clienteToDelete?.nombre} {clienteToDelete?.apellido}".
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
          <CardTitle>Listado de Clientes</CardTitle>
          <CardDescription>
            Aquí podrás ver, crear, editar y eliminar clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          ) : clientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <Users className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No hay clientes registrados. ¡Crea el primero!
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => {
                  const empresaAsociada = cliente.empresas as unknown as EmpresaOption | null; // Type assertion
                  return (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nombre} {cliente.apellido}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {cliente.direccion}
                          {cliente.latitud && cliente.longitud && <MapPinIcon className="h-4 w-4 text-green-500" title={`Lat: ${cliente.latitud}, Lng: ${cliente.longitud}`} />}
                        </div>
                      </TableCell>
                      <TableCell>{cliente.telefono || '-'}</TableCell>
                      <TableCell>{empresaAsociada?.nombre || 'Particular'}</TableCell>
                      <TableCell>
                        <Badge variant={cliente.estado === 'activo' ? 'default' : 'secondary'} className={cliente.estado === 'activo' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}>
                          {cliente.estado.charAt(0).toUpperCase() + cliente.estado.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(cliente)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setClienteToDelete(cliente)} title="Eliminar">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
