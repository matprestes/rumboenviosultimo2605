
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
import { Building2, PlusCircle, Loader2, Edit, Trash2, MapPinIcon } from "lucide-react";
import { EmpresaForm } from "@/components/forms/empresa-form";
import type { Empresa } from '@/lib/schemas';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function EmpresasPage() {
  const { toast } = useToast();
  const [empresas, setEmpresas] = React.useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingEmpresa, setEditingEmpresa] = React.useState<Empresa | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [empresaToDelete, setEmpresaToDelete] = React.useState<Empresa | null>(null);

  const fetchEmpresas = React.useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error("Error fetching empresas:", error);
      toast({
        title: "Error al Cargar Empresas",
        description: "No se pudieron cargar las empresas.",
        variant: "destructive",
      });
      setEmpresas([]);
    } else {
      setEmpresas(data || []);
    }
    setIsLoading(false);
  }, [toast]);

  React.useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  const handleFormSubmit = async (formData: Empresa) => {
    setIsSubmitting(true);
    try {
      let error;
      let successMessage;

      if (editingEmpresa && editingEmpresa.id) {
        // Update existing empresa
        const { error: updateError } = await supabase
          .from('empresas')
          .update({
            nombre: formData.nombre,
            direccion: formData.direccion,
            latitud: formData.latitud,
            longitud: formData.longitud,
            telefono: formData.telefono,
            email: formData.email,
            notas: formData.notas,
            estado: formData.estado,
          })
          .eq('id', editingEmpresa.id);
        error = updateError;
        successMessage = `La empresa "${formData.nombre}" ha sido actualizada exitosamente.`;
      } else {
        // Create new empresa
        const { error: insertError } = await supabase.from('empresas').insert([
          {
            nombre: formData.nombre,
            direccion: formData.direccion,
            latitud: formData.latitud,
            longitud: formData.longitud,
            telefono: formData.telefono,
            email: formData.email,
            notas: formData.notas,
            estado: formData.estado,
          }
        ]);
        error = insertError;
        successMessage = `La empresa "${formData.nombre}" ha sido creada exitosamente.`;
      }

      if (error) throw error;

      toast({
        title: editingEmpresa ? "Empresa Actualizada" : "Empresa Creada",
        description: successMessage,
        variant: "default",
      });
      setIsDialogOpen(false);
      setEditingEmpresa(null);
      fetchEmpresas(); // Refresh the list
    } catch (error: any) {
      console.error("Error saving empresa:", error);
      toast({
        title: `Error al ${editingEmpresa ? 'Actualizar' : 'Crear'} Empresa`,
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setIsDialogOpen(true);
  };

  const openNewEmpresaDialog = () => {
    setEditingEmpresa(null); // Clear editing state for new empresa
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!empresaToDelete || !empresaToDelete.id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', empresaToDelete.id);

      if (error) throw error;

      toast({
        title: "Empresa Eliminada",
        description: `La empresa "${empresaToDelete.nombre}" ha sido eliminada.`,
      });
      setEmpresaToDelete(null);
      fetchEmpresas(); // Refresh list
    } catch (error: any) {
      toast({
        title: "Error al Eliminar Empresa",
        description: error.message || "Ocurrió un error al intentar eliminar la empresa. Verifique que no tenga clientes asociados.",
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
        <Button onClick={openNewEmpresaDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Empresa
        </Button>
      </header>
      
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) setEditingEmpresa(null); // Reset editing state when dialog closes
      }}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{editingEmpresa ? "Editar Empresa" : "Crear Nueva Empresa"}</DialogTitle>
            <DialogDescription>
              {editingEmpresa ? "Modifique los detalles de la empresa." : "Complete los detalles de la nueva empresa."} Haga clic en guardar cuando haya terminado.
            </DialogDescription>
          </DialogHeader>
          <EmpresaForm 
            key={editingEmpresa ? editingEmpresa.id : 'new'} // Ensures form resets with new defaultValues
            onSubmit={handleFormSubmit}
            defaultValues={editingEmpresa || undefined}
            isSubmitting={isSubmitting} 
            submitButtonText={editingEmpresa ? "Actualizar Empresa" : "Guardar Empresa"}
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

      <AlertDialog open={!!empresaToDelete} onOpenChange={(isOpen) => !isOpen && setEmpresaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar esta empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la empresa "{empresaToDelete?.nombre}".
              Asegúrese de que no tenga clientes asociados antes de eliminar.
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
          <CardTitle>Listado de Empresas</CardTitle>
          <CardDescription>
            Aquí podrás ver, crear, editar y eliminar empresas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          ) : empresas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No hay empresas registradas. ¡Crea la primera!
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresas.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell className="font-medium">{empresa.nombre}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                         {empresa.direccion}
                         {empresa.latitud && empresa.longitud && <MapPinIcon className="h-4 w-4 text-green-500" title={`Lat: ${empresa.latitud}, Lng: ${empresa.longitud}`} />}
                      </div>
                    </TableCell>
                    <TableCell>{empresa.telefono || '-'}</TableCell>
                    <TableCell>{empresa.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={empresa.estado === 'activo' ? 'default' : 'secondary'} className={empresa.estado === 'activo' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}>
                        {empresa.estado.charAt(0).toUpperCase() + empresa.estado.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(empresa)} title="Editar">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEmpresaToDelete(empresa)} title="Eliminar">
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
