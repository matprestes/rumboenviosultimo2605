
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
import { Truck, PlusCircle, Loader2, Edit, Trash2, DollarSignIcon as IconDollarSign, Settings } from "lucide-react";
import type { TipoServicio } from '@/lib/schemas';
import { getTiposServicioAction, deleteTipoServicioAction } from '@/actions/tipos-servicio.actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TiposServicioPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [tiposServicio, setTiposServicio] = React.useState<TipoServicio[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<TipoServicio | null>(null);

  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    const { tiposServicio: data, error } = await getTiposServicioAction();
    if (error) {
      toast({ title: "Error al Cargar Tipos de Servicio", description: error, variant: "destructive" });
      setTiposServicio([]);
    } else {
      setTiposServicio(data || []);
    }
    setIsLoading(false);
  }, [toast]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !itemToDelete.id) return;
    setIsDeleting(true);
    const result = await deleteTipoServicioAction(itemToDelete.id);
    setIsDeleting(false);
    if (result.success) {
      toast({ title: "Tipo de Servicio Eliminado", description: `"${itemToDelete.nombre}" ha sido eliminado.` });
      setItemToDelete(null);
      fetchItems();
    } else {
      toast({ title: "Error al Eliminar", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Truck size={32} />
            Gestión de Tipos de Servicio
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra los servicios ofrecidos, sus precios base y precios extra por KM.
          </p>
        </div>
        <Button asChild>
          <Link href="/configuracion/tipos-servicio/nuevo">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Tipo de Servicio
          </Link>
        </Button>
      </header>
      
      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{itemToDelete?.nombre}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente este tipo de servicio.
              Asegúrese de que no esté siendo utilizado en envíos existentes o tenga tarifas asociadas.
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

      <Card className="rounded-2xl shadow-md">
        <CardHeader className="p-6">
          <CardTitle>Listado de Tipos de Servicio</CardTitle>
          <CardDescription>
            Visualiza, crea, edita, elimina y configura tarifas para los tipos de servicio.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64 p-6">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          ) : tiposServicio.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20 m-6">
              <Truck className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay tipos de servicio registrados.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh] md:max-h-none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden md:table-cell">Descripción</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Precio Base</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Precio Extra/KM</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiposServicio.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nombre}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{item.descripcion || '-'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-right">
                        {item.precio_base !== null && item.precio_base !== undefined 
                          ? `$${Number(item.precio_base).toFixed(2)}` 
                          : '-'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-right">
                        {item.precio_extra_km_default !== null && item.precio_extra_km_default !== undefined 
                          ? `$${Number(item.precio_extra_km_default).toFixed(2)}` 
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="outline" size="sm" asChild className="h-8">
                          <Link href={`/configuracion/tipos-servicio/${item.id}/tarifas`}>
                            <IconDollarSign className="mr-1.5 h-3.5 w-3.5" /> Tarifas
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild title="Editar">
                          <Link href={`/configuracion/tipos-servicio/${item.id}/editar`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)} title="Eliminar">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
