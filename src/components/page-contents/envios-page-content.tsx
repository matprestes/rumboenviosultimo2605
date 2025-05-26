
"use client";

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, PlusCircle, Loader2, Edit, Trash2, Search, Calendar as CalendarIcon } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getEnviosAction, deleteEnvioAction } from '@/actions/envio-actions';
import type { EnvioConDetalles, EstadoEnvio } from '@/lib/schemas';
import { EstadoEnvioEnum } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;
const ALL_FILTER_OPTION_VALUE = "_all_";

export default function EnviosPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [envios, setEnvios] = React.useState<EnvioConDetalles[]>([]);
  const [totalEnvios, setTotalEnvios] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [envioToDelete, setEnvioToDelete] = React.useState<EnvioConDetalles | null>(null);

  const [searchTerm, setSearchTerm] = React.useState(() => searchParams.get('search') || '');
  const [estadoFilter, setEstadoFilter] = React.useState<EstadoEnvio | ''>(() => (searchParams.get('estado') as EstadoEnvio) || '');
  
  const [fechaDesdeFilter, setFechaDesdeFilter] = React.useState<Date | undefined>(() => {
    const desdeParam = searchParams.get('desde');
    if (desdeParam && /^\d{4}-\d{2}-\d{2}$/.test(desdeParam)) {
      const parsedDate = parseISO(desdeParam + "T00:00:00Z"); // Assume UTC for consistency
      if (isValid(parsedDate)) return parsedDate;
    }
    return undefined;
  });

  const [fechaHastaFilter, setFechaHastaFilter] = React.useState<Date | undefined>(() => {
    const hastaParam = searchParams.get('hasta');
    if (hastaParam && /^\d{4}-\d{2}-\d{2}$/.test(hastaParam)) {
      const parsedDate = parseISO(hastaParam + "T00:00:00Z");
      if (isValid(parsedDate)) return parsedDate;
    }
    return undefined;
  });
  
  const [currentPage, setCurrentPage] = React.useState(() => Number(searchParams.get('page')) || 1);

  const fetchEnvios = React.useCallback(async (page: number, currentFilters: { searchTerm?: string; estado?: string; fechaDesde?: string; fechaHasta?: string }) => {
    setIsLoading(true);
    const { envios: data, count, error } = await getEnviosAction(currentFilters, page, ITEMS_PER_PAGE);

    if (error) {
      toast({ title: "Error al Cargar Envíos", description: error, variant: "destructive" });
      setEnvios([]);
      setTotalEnvios(0);
    } else {
      setEnvios(data);
      setTotalEnvios(count);
    }
    setIsLoading(false);
  }, [toast]);

  React.useEffect(() => {
    const currentSearchTerm = searchParams.get('search') || '';
    const currentEstado = (searchParams.get('estado') as EstadoEnvio) || '';
    const currentDesdeStr = searchParams.get('desde');
    const currentHastaStr = searchParams.get('hasta');
    const newPage = Number(searchParams.get('page')) || 1;

    let currentDesde: Date | undefined = undefined;
    if (currentDesdeStr && /^\d{4}-\d{2}-\d{2}$/.test(currentDesdeStr)) {
      const parsed = parseISO(currentDesdeStr + "T00:00:00Z");
      if (isValid(parsed)) currentDesde = parsed;
    }

    let currentHasta: Date | undefined = undefined;
    if (currentHastaStr && /^\d{4}-\d{2}-\d{2}$/.test(currentHastaStr)) {
      const parsed = parseISO(currentHastaStr + "T00:00:00Z");
      if (isValid(parsed)) currentHasta = parsed;
    }
    
    setSearchTerm(currentSearchTerm);
    setEstadoFilter(currentEstado);
    setFechaDesdeFilter(currentDesde);
    setFechaHastaFilter(currentHasta);
    setCurrentPage(newPage);

    const filtersForFetch = {
      searchTerm: currentSearchTerm || undefined,
      estado: currentEstado || undefined,
      fechaDesde: currentDesde ? format(currentDesde, 'yyyy-MM-dd') : undefined,
      fechaHasta: currentHasta ? format(currentHasta, 'yyyy-MM-dd') : undefined,
    };
    fetchEnvios(newPage, filtersForFetch);
  }, [searchParams, fetchEnvios]);

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (estadoFilter) params.set('estado', estadoFilter);
    if (fechaDesdeFilter && isValid(fechaDesdeFilter)) params.set('desde', format(fechaDesdeFilter, 'yyyy-MM-dd'));
    if (fechaHastaFilter && isValid(fechaHastaFilter)) params.set('hasta', format(fechaHastaFilter, 'yyyy-MM-dd'));
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleDeleteConfirm = async () => {
    if (!envioToDelete || !envioToDelete.id) return;
    setIsDeleting(true);
    const { success, error } = await deleteEnvioAction(envioToDelete.id);
    if (success) {
      toast({ title: "Envío Eliminado", description: `El envío ID ${envioToDelete.id.substring(0,8)}... ha sido eliminado.` });
      const currentFilters = {
        searchTerm: searchTerm || undefined,
        estado: estadoFilter || undefined,
        fechaDesde: fechaDesdeFilter && isValid(fechaDesdeFilter) ? format(fechaDesdeFilter, 'yyyy-MM-dd') : undefined,
        fechaHasta: fechaHastaFilter && isValid(fechaHastaFilter) ? format(fechaHastaFilter, 'yyyy-MM-dd') : undefined,
      };
      fetchEnvios(currentPage, currentFilters);
    } else {
      toast({ title: "Error al Eliminar", description: error, variant: "destructive" });
    }
    setEnvioToDelete(null);
    setIsDeleting(false);
  };
  
  const totalPages = Math.ceil(totalEnvios / ITEMS_PER_PAGE);

  const getEstadoDisplayName = (estadoValue: EstadoEnvio) => {
    return estadoValue.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Package size={32} />
            Gestión de Envíos
          </h1>
          <p className="text-muted-foreground mt-1">
            Crea, visualiza y administra los envíos.
          </p>
        </div>
        <Button asChild>
          <Link href="/envios/nuevo">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Envío
          </Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filtros y Búsqueda</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 items-end">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por cliente, dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
            <Select 
              value={estadoFilter || ALL_FILTER_OPTION_VALUE} 
              onValueChange={(value) => setEstadoFilter(value === ALL_FILTER_OPTION_VALUE ? '' : value as EstadoEnvio | '')}
            >
              <SelectTrigger><SelectValue placeholder="Filtrar por estado..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_OPTION_VALUE}>Todos los Estados</SelectItem>
                {(Object.values(EstadoEnvioEnum.Values) as EstadoEnvio[]).map(estado => (
                  <SelectItem key={estado} value={estado}>{getEstadoDisplayName(estado)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fechaDesdeFilter && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaDesdeFilter && isValid(fechaDesdeFilter) ? format(fechaDesdeFilter, "PPP", { locale: es }) : <span>Fecha Desde</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fechaDesdeFilter} onSelect={setFechaDesdeFilter} initialFocus locale={es}/></PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fechaHastaFilter && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaHastaFilter && isValid(fechaHastaFilter) ? format(fechaHastaFilter, "PPP", { locale: es }) : <span>Fecha Hasta</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fechaHastaFilter} onSelect={setFechaHastaFilter} initialFocus locale={es}/></PopoverContent>
            </Popover>
             <Button onClick={handleApplyFilters} className="w-full lg:col-span-1 mt-4 sm:mt-0 self-end">Aplicar Filtros</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
          ) : envios.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <Package className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No se encontraron envíos con los filtros actuales.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Envío</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {envios.map((envio) => (
                    <TableRow key={envio.id}>
                      <TableCell className="font-mono text-xs">{envio.id?.substring(0, 8)}...</TableCell>
                      <TableCell>
                        {envio.remitente_cliente_id ? `${envio.clientes?.apellido}, ${envio.clientes?.nombre}` : (envio.cliente_temporal_nombre || 'N/A')}
                      </TableCell>
                      <TableCell>{envio.direccion_origen}</TableCell>
                      <TableCell>{envio.direccion_destino}</TableCell>
                      <TableCell>{envio.tipos_servicio?.nombre || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={envio.estado === 'entregado' ? 'default' : (envio.estado === 'cancelado' || envio.estado === 'no_entregado' ? 'destructive' : 'secondary')}
                               className={
                                 envio.estado === 'entregado' ? 'bg-green-500 hover:bg-green-600' : 
                                 envio.estado === 'pendiente_asignacion' ? 'bg-yellow-500 hover:bg-yellow-600' :
                                 envio.estado === 'asignado' ? 'bg-blue-500 hover:bg-blue-600' :
                                 envio.estado === 'en_camino' ? 'bg-orange-500 hover:bg-orange-600' :
                                 'bg-gray-500 hover:bg-gray-600'
                               }
                        >
                          {getEstadoDisplayName(envio.estado!)}
                        </Badge>
                      </TableCell>
                      <TableCell>{envio.created_at ? format(new Date(envio.created_at), "dd/MM/yy HH:mm", { locale: es }) : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild title="Editar">
                          <Link href={`/envios/${envio.id}/editar`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEnvioToDelete(envio)} title="Eliminar">
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

      <AlertDialog open={!!envioToDelete} onOpenChange={(isOpen) => !isOpen && setEnvioToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este envío?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el envío con ID {envioToDelete?.id?.substring(0,8)}...
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={() => setEnvioToDelete(null)}>Cancelar</AlertDialogCancel>
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

    