
"use client";

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Box, PlusCircle, Loader2, Edit, Trash2 } from "lucide-react";
import type { TipoPaquete } from '@/lib/schemas';
import { getTiposPaqueteAction, deleteTipoPaqueteAction } from '@/actions/tipos-paquete.actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TiposPaquetePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [tiposPaquete, setTiposPaquete] = React.useState<TipoPaquete[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<TipoPaquete | null>(null);

  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    const { tiposPaquete: data, error } = await getTiposPaqueteAction();
    if (error) {
      toast({ title: "Error al Cargar Tipos de Paquete", description: error, variant: "destructive" });
      setTiposPaquete([]);
    } else {
      setTiposPaquete(data || []);
    }
    setIsLoading(false);
  }, [toast]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !itemToDelete.id) return;
    setIsDeleting(true);
    const result = await deleteTipoPaqueteAction(itemToDelete.id);
    setIsDeleting(false);
    if (result.success) {
      toast({ title: "Tipo de Paquete Eliminado", description: `"${itemToDelete.nombre}" ha sido eliminado.` });
      setItemToDelete(null);
      fetchItems();
    } else {
      toast({ title: "Error al Eliminar", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Box size={32} />
            Gestión de Tipos de Paquete
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra los diferentes tipos de paquetes que maneja Rumbos Envíos.
          </p>
        </div>
        <Button asChild>
          <Link href="/configuracion/tipos-paquete/nuevo">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Tipo de Paquete
          </Link>
        </Button>
      </header>
      
      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{itemToDelete?.nombre}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente este tipo de paquete.
              Asegúrese de que no esté siendo utilizado en envíos existentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <Button onClick={handleDeleteConfirm} disabled={isDeleting} variant="destructive">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Listado de Tipos de Paquete</CardTitle>
          <CardDescription>
            Visualiza, crea, edita y elimina los tipos de paquete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          ) : tiposPaquete.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <Box className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay tipos de paquete registrados.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiposPaquete.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{item.descripcion || '-'}</TableCell>
                    <TableCell>
                      {item.created_at ? format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: es }) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild title="Editar">
                        <Link href={`/configuracion/tipos-paquete/${item.id}/editar`}><Edit className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)} title="Eliminar">
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

    