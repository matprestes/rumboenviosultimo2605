
"use client";

import * as React from 'react';
import Link from 'next/link'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, Loader2, Edit, Trash2, MapPinIcon } from "lucide-react";
import type { Cliente, Empresa as EmpresaType } from '@/lib/schemas';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation'; 

interface EmpresaOption { 
  id: string;
  nombre: string;
}

export default function ClientesPage() {
  const { toast } = useToast();
  const router = useRouter(); 
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false); 
  const [clienteToDelete, setClienteToDelete] = React.useState<Cliente | null>(null);


  const fetchClientes = React.useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select(
        '*, empresas (id, nombre)'
      )
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

  React.useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const handleEdit = (cliente: Cliente) => {
    // Placeholder for future navigation to an edit page
    // router.push(`/clientes/${cliente.id}/editar`);
    toast({ title: "Info", description: `La edición de "${cliente.nombre} ${cliente.apellido}" se implementará en una página dedicada.`});
  };

  const handleDeleteConfirm = async () => {
    if (!clienteToDelete || !clienteToDelete.id) return;
    setIsDeleting(true);
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
      setIsDeleting(false);
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
        <Button asChild> 
          <Link href="/clientes/nuevo">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Link>
        </Button>
      </header>
      
      <AlertDialog open={!!clienteToDelete} onOpenChange={(isOpen) => !isOpen && setClienteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al cliente "{clienteToDelete?.nombre} {clienteToDelete?.apellido}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={() => setClienteToDelete(null)}>Cancelar</AlertDialogCancel>
            <Button onClick={handleDeleteConfirm} disabled={isDeleting} variant="destructive">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Listado de Clientes</CardTitle>
          <CardDescription>
            Aquí podrás ver y eliminar clientes. La edición se hará en una página dedicada.
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
                  const empresaAsociada = cliente.empresas as unknown as EmpresaOption | null;
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
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(cliente)} title="Editar (Próximamente)">
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
