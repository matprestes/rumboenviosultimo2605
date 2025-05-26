
"use client";

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, PlusCircle, Loader2, Eye, Trash2, CalendarIcon, Filter, TruckIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { getRepartosAction, deleteRepartoAction, getRepartidoresForSelectAction } from '@/actions/reparto-actions';
import type { RepartoConDetalles, EstadoReparto, Repartidor } from '@/lib/schemas';
import { EstadoRepartoEnum } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;
const ALL_FILTER_OPTION_VALUE = "_all_";

export default function RepartosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [repartos, setRepartos] = React.useState<RepartoConDetalles[]>([]);
  const [repartidores, setRepartidores] = React.useState<Pick<Repartidor, 'id' | 'nombre'>[]>([]);
  const [totalRepartos, setTotalRepartos] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [repartoToDelete, setRepartoToDelete] = React.useState<RepartoConDetalles | null>(null);

  // Initialize state from URL search params
  const [repartidorFilter, setRepartidorFilter] = React.useState(() => searchParams.get('repartidor') || '');
  const [fechaFilter, setFechaFilter] = React.useState<Date | undefined>(() => {
    const fechaParam = searchParams.get('fecha');
    return fechaParam ? new Date(fechaParam + "T00:00:00") : undefined; // Ensure local timezone by adding T00:00:00
  });
  const [estadoFilter, setEstadoFilter] = React.useState<EstadoReparto | ''>(() => searchParams.get('estado') as EstadoReparto || '');
  const [currentPage, setCurrentPage] = React.useState(() => Number(searchParams.get('page')) || 1);
  
  const fetchRepartidoresList = React.useCallback(async () => {
    const data = await getRepartidoresForSelectAction();
    setRepartidores(data);
  }, []);
  
  React.useEffect(() => {
    fetchRepartidoresList();
  }, [fetchRepartidoresList]);

  const fetchRepartos = React.useCallback(async (page: number, currentFilters: {repartidorId?: string, fecha?: string, estado?: string}) => {
    setIsLoading(true);
    const { repartos: data, count, error } = await getRepartosAction(currentFilters, page, ITEMS_PER_PAGE);

    if (error) {
      toast({ title: "Error al Cargar Repartos", description: error, variant: "destructive" });
      setRepartos([]);
      setTotalRepartos(0);
    } else {
      setRepartos(data);
      setTotalRepartos(count);
    }
    setIsLoading(false);
  }, [toast]);
  
  // Effect to react to changes in searchParams (e.g., browser back/forward, direct URL change)
  React.useEffect(() => {
    const newPage = Number(searchParams.get('page')) || 1;
    const newRepartidor = searchParams.get('repartidor') || '';
    const newFechaStr = searchParams.get('fecha');
    const newFecha = newFechaStr ? new Date(newFechaStr + "T00:00:00") : undefined;
    const newEstado = (searchParams.get('estado') as EstadoReparto) || '';

    setCurrentPage(newPage);
    setRepartidorFilter(newRepartidor);
    setFechaFilter(newFecha);
    setEstadoFilter(newEstado);

    const currentFilters = {
      repartidorId: newRepartidor || undefined,
      fecha: newFecha ? format(newFecha, 'yyyy-MM-dd') : undefined,
      estado: newEstado || undefined,
    };
    fetchRepartos(newPage, currentFilters);

  }, [searchParams, fetchRepartos]);


  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (repartidorFilter) params.set('repartidor', repartidorFilter);
    if (fechaFilter) params.set('fecha', format(fechaFilter, 'yyyy-MM-dd'));
    if (estadoFilter) params.set('estado', estadoFilter);
    params.set('page', '1'); // Reset to page 1 when filters are applied
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    // The useEffect listening to searchParams will handle the state update and data fetch
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
     // The useEffect listening to searchParams will handle the state update and data fetch
  };
  
  const handleDeleteConfirm = async () => {
    if (!repartoToDelete || !repartoToDelete.id) return;
    setIsDeleting(true);
    const { success, error } = await deleteRepartoAction(repartoToDelete.id);
    if (success) {
      toast({ title: "Reparto Eliminado", description: `El reparto ID ${repartoToDelete.id.substring(0,8)}... ha sido eliminado.` });
      // Refetch with current page and filters
      const currentFilters = {
        repartidorId: repartidorFilter || undefined,
        fecha: fechaFilter ? format(fechaFilter, 'yyyy-MM-dd') : undefined,
        estado: estadoFilter || undefined,
      };
      fetchRepartos(currentPage, currentFilters); 
    } else {
      toast({ title: "Error al Eliminar", description: error, variant: "destructive" });
    }
    setRepartoToDelete(null);
    setIsDeleting(false);
  };

  const totalPages = Math.ceil(totalRepartos / ITEMS_PER_PAGE);

  const getEstadoRepartoDisplayName = (estadoValue?: EstadoReparto | null) => {
    if (!estadoValue) return 'N/A';
    return estadoValue.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <ClipboardList size={32} />
            Gestión de Repartos
          </h1>
          <p className="text-muted-foreground mt-1">
            Asigna envíos a repartidores y gestiona las hojas de ruta.
          </p>
        </div>
        <Button asChild>
          <Link href="/repartos/nuevo">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Reparto
          </Link>
        </Button>
      </header>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter size={20}/> Filtros de Repartos</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4 items-end">
            <Select 
              value={repartidorFilter || ALL_FILTER_OPTION_VALUE} 
              onValueChange={(value) => setRepartidorFilter(value === ALL_FILTER_OPTION_VALUE ? '' : value)}
            >
              <SelectTrigger><div className="flex items-center gap-1"><TruckIcon size={16}/> <SelectValue placeholder="Repartidor..." /></div></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_OPTION_VALUE}>Todos</SelectItem>
                {repartidores.map(r => <SelectItem key={r.id} value={r.id!}>{r.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fechaFilter && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaFilter ? format(fechaFilter, "PPP", { locale: es }) : <span>Fecha Reparto</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fechaFilter} onSelect={setFechaFilter} initialFocus locale={es}/></PopoverContent>
            </Popover>
            <Select 
              value={estadoFilter || ALL_FILTER_OPTION_VALUE} 
              onValueChange={(value) => setEstadoFilter(value === ALL_FILTER_OPTION_VALUE ? '' : value as EstadoReparto | '')}
            >
              <SelectTrigger><SelectValue placeholder="Estado..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_OPTION_VALUE}>Todos</SelectItem>
                {EstadoRepartoEnum.options.map(e => <SelectItem key={e} value={e}>{getEstadoRepartoDisplayName(e)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleApplyFilters} className="w-full">Aplicar Filtros</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
          ) : repartos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <ClipboardList className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No se encontraron repartos con los filtros actuales.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Reparto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Repartidor</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Paradas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repartos.map((reparto) => (
                    <TableRow key={reparto.id}>
                      <TableCell className="font-mono text-xs">{reparto.id?.substring(0, 8)}...</TableCell>
                      <TableCell>{reparto.fecha_reparto ? format(new Date(reparto.fecha_reparto), "dd/MM/yyyy", { locale: es }) : '-'}</TableCell>
                      <TableCell>{reparto.repartidores?.nombre || 'N/A'}</TableCell>
                      <TableCell>{reparto.empresas?.nombre || 'Individual'}</TableCell>
                      <TableCell>{reparto.paradas_count}</TableCell>
                      <TableCell>
                        <Badge variant={reparto.estado === 'completado' ? 'default' : (reparto.estado === 'cancelado' ? 'destructive' : 'secondary')}
                               className={
                                 reparto.estado === 'completado' ? 'bg-green-500 hover:bg-green-600' : 
                                 reparto.estado === 'planificado' ? 'bg-yellow-500 hover:bg-yellow-600' :
                                 reparto.estado === 'en_curso' ? 'bg-blue-500 hover:bg-blue-600' :
                                 'bg-gray-500 hover:bg-gray-600'
                               }
                        >
                          {getEstadoRepartoDisplayName(reparto.estado)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild title="Ver Detalle">
                          <Link href={`/repartos/${reparto.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setRepartoToDelete(reparto)} title="Eliminar">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                  <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || isLoading}>Anterior</Button>
                  <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
                  <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || isLoading}>Siguiente</Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!repartoToDelete} onOpenChange={(isOpen) => !isOpen && setRepartoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este reparto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el reparto y sus paradas. Los envíos asociados volverán al estado 'pendiente_asignacion'.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    