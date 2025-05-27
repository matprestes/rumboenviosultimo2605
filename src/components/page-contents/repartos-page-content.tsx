
"use client";

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, PlusCircle, Loader2, Eye, Trash2, CalendarIcon, Filter, TruckIcon, Layers } from "lucide-react";
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
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const ITEMS_PER_PAGE = 10;
const ALL_FILTER_OPTION_VALUE = "_all_";

export default function RepartosPageContent() {
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

  const [repartidorFilter, setRepartidorFilter] = React.useState(() => searchParams.get('repartidor') || '');
  const [fechaFilter, setFechaFilter] = React.useState<Date | undefined>(() => {
    const fechaParam = searchParams.get('fecha');
    if (fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) {
      const parsedDate = parseISO(fechaParam + "T00:00:00Z");
      if (isValid(parsedDate)) return parsedDate;
    }
    return undefined;
  });
  const [estadoFilter, setEstadoFilter] = React.useState<EstadoReparto | ''>(() => (searchParams.get('estado') as EstadoReparto) || '');
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
      setTotalRepartos(count || 0);
    }
    setIsLoading(false);
  }, [toast]);
  
  React.useEffect(() => {
    const newPage = Number(searchParams.get('page')) || 1;
    const newRepartidor = searchParams.get('repartidor') || '';
    const newFechaStr = searchParams.get('fecha');
    const newEstado = (searchParams.get('estado') as EstadoReparto) || '';
    
    let newFecha: Date | undefined = undefined;
    if (newFechaStr && /^\d{4}-\d{2}-\d{2}$/.test(newFechaStr)) {
      const parsed = parseISO(newFechaStr + "T00:00:00Z");
      if (isValid(parsed)) newFecha = parsed;
      else console.warn("Invalid date in URL for fecha:", newFechaStr);
    }

    setCurrentPage(newPage);
    setRepartidorFilter(newRepartidor);
    setFechaFilter(newFecha);
    setEstadoFilter(newEstado);

    const currentFilters = {
      repartidorId: newRepartidor || undefined,
      fecha: newFecha && isValid(newFecha) ? format(newFecha, 'yyyy-MM-dd') : undefined,
      estado: newEstado || undefined,
    };
    fetchRepartos(newPage, currentFilters);

  }, [searchParams, fetchRepartos]);

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (repartidorFilter) params.set('repartidor', repartidorFilter);
    if (fechaFilter && isValid(fechaFilter)) params.set('fecha', format(fechaFilter, 'yyyy-MM-dd'));
    if (estadoFilter) params.set('estado', estadoFilter);
    params.set('page', '1'); 
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  const handleDeleteConfirm = async () => {
    if (!repartoToDelete || !repartoToDelete.id) return;
    setIsDeleting(true);
    const { success, error } = await deleteRepartoAction(repartoToDelete.id);
    if (success) {
      toast({ title: "Reparto Eliminado", description: `El reparto ID ${repartoToDelete.id.substring(0,8)}... ha sido eliminado.` });
      const currentFilters = {
        repartidorId: repartidorFilter || undefined,
        fecha: fechaFilter && isValid(fechaFilter) ? format(fechaFilter, 'yyyy-MM-dd') : undefined,
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
  };

  const getEstadoBadgeVariantClass = (estado: EstadoReparto | null | undefined): string => {
    switch (estado) {
      case 'completado':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 border border-green-300 dark:border-green-600';
      case 'planificado':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100 border border-yellow-300 dark:border-yellow-600';
      case 'en_curso':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100 border border-blue-300 dark:border-blue-600';
      case 'cancelado':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 border border-red-300 dark:border-red-600';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600';
    }
  };

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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/repartos/lote/nuevo">
              <Layers className="mr-2 h-4 w-4" />
              Nuevo Reparto por Lote
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/repartos/nuevo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Reparto Individual
            </Link>
          </Button>
        </div>
      </header>

       <Card className="rounded-2xl shadow-md">
        <CardHeader className="p-6">
          <CardTitle className="flex items-center gap-2 text-xl"><Filter size={20}/> Filtros de Repartos</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 items-end">
            <Select 
              value={repartidorFilter || ALL_FILTER_OPTION_VALUE} 
              onValueChange={(value) => setRepartidorFilter(value === ALL_FILTER_OPTION_VALUE ? '' : value)}
            >
              <SelectTrigger><div className="flex items-center gap-2"><TruckIcon size={16} className="text-muted-foreground"/> <SelectValue placeholder="Repartidor..." /></div></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_OPTION_VALUE}>Todos los Repartidores</SelectItem>
                {repartidores.map(r => <SelectItem key={r.id} value={r.id!}>{r.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fechaFilter && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaFilter && isValid(fechaFilter) ? format(fechaFilter, "PPP", { locale: es }) : <span>Fecha Reparto</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaFilter} onSelect={setFechaFilter} initialFocus locale={es}/></PopoverContent>
            </Popover>
            <Select 
              value={estadoFilter || ALL_FILTER_OPTION_VALUE} 
              onValueChange={(value) => setEstadoFilter(value === ALL_FILTER_OPTION_VALUE ? '' : value as EstadoReparto | '')}
            >
              <SelectTrigger><SelectValue placeholder="Estado..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_OPTION_VALUE}>Todos los Estados</SelectItem>
                {EstadoRepartoEnum.options.map(e => <SelectItem key={e} value={e}>{getEstadoRepartoDisplayName(e)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleApplyFilters} className="w-full">
              <Filter className="mr-2 h-4 w-4"/>Aplicar Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64 p-6">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          ) : repartos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20 m-6">
              <ClipboardList className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No se encontraron repartos con los filtros actuales.</p>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[60vh] md:max-h-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID Reparto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Repartidor</TableHead>
                      <TableHead className="hidden sm:table-cell">Empresa</TableHead>
                      <TableHead className="text-center">Paradas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repartos.map((reparto) => (
                      <TableRow key={reparto.id}>
                        <TableCell className="font-mono text-xs">{reparto.id?.substring(0, 8)}...</TableCell>
                        <TableCell>{reparto.fecha_reparto ? format(parseISO(reparto.fecha_reparto), "dd/MM/yyyy", { locale: es }) : '-'}</TableCell>
                        <TableCell>{reparto.repartidores?.nombre || 'N/A'}</TableCell>
                        <TableCell className="hidden sm:table-cell">{reparto.empresas?.nombre || 'Individual'}</TableCell>
                        <TableCell className="text-center">{reparto.paradas_count || 0}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", getEstadoBadgeVariantClass(reparto.estado))}>
                            {getEstadoRepartoDisplayName(reparto.estado)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild title="Ver Detalle">
                            <Link href={`/repartos/${reparto.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setRepartoToDelete(reparto)} title="Eliminar" disabled={reparto.estado === 'en_curso' || reparto.estado === 'completado'}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6 p-6 pt-0 md:pt-6">
                  <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || isLoading} variant="outline" size="sm">Anterior</Button>
                  <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
                  <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || isLoading} variant="outline" size="sm">Siguiente</Button>
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
            <AlertDialogCancel disabled={isDeleting} onClick={() => setRepartoToDelete(null)}>Cancelar</AlertDialogCancel>
            <Button onClick={handleDeleteConfirm} disabled={isDeleting} variant="destructive">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
