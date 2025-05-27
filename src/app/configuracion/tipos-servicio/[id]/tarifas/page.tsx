
"use client";

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, DollarSign, PlusCircle, Loader2, Edit, Trash2 } from "lucide-react";
import type { TipoServicio, TarifaDistanciaCalculadora, TarifaDistanciaFormValues } from '@/lib/schemas';
import { getTipoServicioByIdAction, getTarifasByTipoServicioAction, createTarifaDistanciaAction, updateTarifaDistanciaAction, deleteTarifaDistanciaAction } from '@/actions/tipos-servicio.actions';
import { useToast } from '@/hooks/use-toast';
import { TarifaDistanciaForm } from '@/components/forms/tarifa-distancia-form';

interface TipoServicioTarifasPageProps {
  params: { id: string };
}

export default function TipoServicioTarifasPage({ params: paramsProp }: TipoServicioTarifasPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const resolvedParams = React.use(paramsProp);
  const tipoServicioId = resolvedParams.id;

  const [tipoServicio, setTipoServicio] = React.useState<TipoServicio | null>(null);
  const [tarifas, setTarifas] = React.useState<TarifaDistanciaCalculadora[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isTarifaFormOpen, setIsTarifaFormOpen] = React.useState(false);
  const [editingTarifa, setEditingTarifa] = React.useState<TarifaDistanciaCalculadora | null>(null);
  const [tarifaToDelete, setTarifaToDelete] = React.useState<TarifaDistanciaCalculadora | null>(null);

  const fetchTarifasData = React.useCallback(async () => {
    if (!tipoServicioId) return;
    setIsLoading(true);
    try {
      const [tsData, tarifasData] = await Promise.all([
        getTipoServicioByIdAction(tipoServicioId),
        getTarifasByTipoServicioAction(tipoServicioId)
      ]);

      if (tsData.error || !tsData.tipoServicio) {
        toast({ title: "Error", description: tsData.error || "Tipo de servicio no encontrado.", variant: "destructive" });
        router.push('/configuracion/tipos-servicio');
        return;
      }
      setTipoServicio(tsData.tipoServicio);

      if (tarifasData.error) {
        toast({ title: "Error al cargar tarifas", description: tarifasData.error, variant: "destructive" });
        setTarifas([]);
      } else {
        setTarifas(tarifasData.tarifas || []);
      }
    } catch (error) {
      toast({ title: "Error", description: "Ocurrió un error al cargar los datos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [tipoServicioId, toast, router]);

  React.useEffect(() => {
    fetchTarifasData();
  }, [fetchTarifasData]);

  const handleTarifaFormSubmit = async (formData: TarifaDistanciaFormValues) => {
    if (!tipoServicioId) return;
    setIsSubmitting(true);
    
    const dataToSend = { ...formData, tipo_servicio_id: tipoServicioId };

    let result;
    if (editingTarifa && editingTarifa.id) {
      result = await updateTarifaDistanciaAction(editingTarifa.id, dataToSend);
    } else {
      result = await createTarifaDistanciaAction(dataToSend);
    }
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: editingTarifa ? "Tarifa Actualizada" : "Tarifa Creada", description: "La tarifa ha sido guardada." });
      setIsTarifaFormOpen(false);
      setEditingTarifa(null);
      fetchTarifasData();
    } else {
      toast({ title: "Error al Guardar Tarifa", description: result.error || "Ocurrió un error.", variant: "destructive" });
    }
  };
  
  const openNewTarifaDialog = () => {
    setEditingTarifa(null);
    setIsTarifaFormOpen(true);
  };
  
  const openEditTarifaDialog = (tarifa: TarifaDistanciaCalculadora) => {
    setEditingTarifa(tarifa);
    setIsTarifaFormOpen(true);
  };

  const handleDeleteTarifaConfirm = async () => {
    if (!tarifaToDelete || !tarifaToDelete.id || !tipoServicioId) return;
    setIsSubmitting(true);
    const result = await deleteTarifaDistanciaAction(tarifaToDelete.id, tipoServicioId);
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "Tarifa Eliminada", description: "La tarifa ha sido eliminada." });
      setTarifaToDelete(null);
      fetchTarifasData();
    } else {
      toast({ title: "Error al Eliminar Tarifa", description: result.error, variant: "destructive" });
    }
  };


  if (isLoading || !tipoServicio) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/configuracion/tipos-servicio"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <DollarSign size={32} />
              Tarifas por Distancia
            </h1>
            <p className="text-muted-foreground">Servicio: {tipoServicio.nombre}</p>
          </div>
        </div>
        <Dialog open={isTarifaFormOpen} onOpenChange={(isOpen) => {
            setIsTarifaFormOpen(isOpen);
            if (!isOpen) setEditingTarifa(null);
        }}>
            <DialogTrigger asChild>
                <Button onClick={openNewTarifaDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nueva Tarifa
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                <DialogTitle>{editingTarifa ? "Editar Tarifa" : "Nueva Tarifa por Distancia"}</DialogTitle>
                <DialogDescription>
                    {editingTarifa ? "Modifique los detalles de la tarifa." : "Complete los detalles para la nueva tarifa."}
                </DialogDescription>
                </DialogHeader>
                <TarifaDistanciaForm
                    key={editingTarifa ? editingTarifa.id : 'new'}
                    onSubmit={handleTarifaFormSubmit}
                    defaultValues={editingTarifa || {}}
                    isSubmitting={isSubmitting}
                    submitButtonText={editingTarifa ? "Actualizar Tarifa" : "Crear Tarifa"}
                    tipoServicioId={tipoServicioId}
                />
            </DialogContent>
        </Dialog>
      </div>

       <AlertDialog open={!!tarifaToDelete} onOpenChange={(isOpen) => !isOpen && setTarifaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta tarifa?</AlertDialogTitle>
            <AlertDialogDescription>
              Rango: {tarifaToDelete?.distancia_min_km}km - {tarifaToDelete?.distancia_max_km}km. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
             <Button variant="destructive" onClick={handleDeleteTarifaConfirm} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Tarifas Definidas para "{tipoServicio.nombre}"</CardTitle>
          <CardDescription>
            Listado de rangos de distancia y sus precios asociados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tarifas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <DollarSign className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No hay tarifas definidas para este servicio.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dist. Mín (km)</TableHead>
                  <TableHead>Dist. Máx (km)</TableHead>
                  <TableHead>Precio Base</TableHead>
                  <TableHead>Precio x KM</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tarifas.map((tarifa) => (
                  <TableRow key={tarifa.id}>
                    <TableCell>{Number(tarifa.distancia_min_km).toFixed(2)}</TableCell>
                    <TableCell>{Number(tarifa.distancia_max_km).toFixed(2)}</TableCell>
                    <TableCell>
                      {tarifa.precio_base !== null && tarifa.precio_base !== undefined 
                        ? `$${Number(tarifa.precio_base).toFixed(2)}` 
                        : '-'}
                    </TableCell>
                    <TableCell>${Number(tarifa.precio_por_km).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditTarifaDialog(tarifa)} title="Editar Tarifa">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setTarifaToDelete(tarifa)} title="Eliminar Tarifa">
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

    