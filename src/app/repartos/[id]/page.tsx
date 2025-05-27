
"use client";

import * as React from 'react'; // Ensure React is fully imported
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building, CalendarIcon as IconCalendar, CheckCircle, ClipboardEdit, Edit, Info, Loader2, MapPin, Package, Play, PowerOff, RefreshCw, Route, Truck, User, XCircle } from "lucide-react";
import { getRepartoByIdAction, updateRepartoEstadoAction, updateParadaEstadoAction, reorderParadasAction } from '@/actions/reparto-actions';
import type { RepartoConDetalles, ParadaConDetalles, EstadoReparto, EstadoEnvio, EnvioConDetalles, Empresa } from '@/lib/schemas';
import { EstadoRepartoEnum, EstadoEnvioEnum } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { RepartoMapComponent } from '@/components/reparto-map-component';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface RepartoDetallePageProps {
  params: { id: string };
}

export default function RepartoDetallePage({ params: paramsProp }: RepartoDetallePageProps) {
  const { toast } = useToast();
  const router = useRouter();
  
  const resolvedParams = React.use(paramsProp); // Use React.use to resolve params
  const repartoId = resolvedParams.id;

  const [reparto, setReparto] = React.useState<(RepartoConDetalles & { paradas: ParadaConDetalles[] }) | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [paradasEdit, setParadasEdit] = React.useState<ParadaConDetalles[]>([]);

  const fetchRepartoDetails = React.useCallback(async () => {
    setIsLoading(true);
    const { reparto: data, error } = await getRepartoByIdAction(repartoId);
    if (error || !data) {
      toast({ title: "Error al Cargar Reparto", description: error || "Reparto no encontrado.", variant: "destructive" });
      router.push('/repartos');
      return;
    }
    const sortedParadas = data.paradas ? [...data.paradas].sort((a, b) => (a.orden_visita || Infinity) - (b.orden_visita || Infinity)) : [];
    
    // Ensure fecha_reparto is a Date object
    let repartoDataWithDate = { ...data };
    if (data.fecha_reparto && typeof data.fecha_reparto === 'string') {
      const parsedDate = parseISO(data.fecha_reparto); // Supabase DATE is YYYY-MM-DD
      if (isValid(parsedDate)) {
        repartoDataWithDate.fecha_reparto = parsedDate;
      } else {
        console.warn("Invalid date received for fecha_reparto:", data.fecha_reparto);
        // Keep original string or set to null/undefined if critical for display
      }
    }

    setReparto({...repartoDataWithDate, paradas: sortedParadas});
    setParadasEdit(sortedParadas);
    setIsLoading(false);
  }, [repartoId, toast, router]);

  React.useEffect(() => {
    fetchRepartoDetails();
  }, [fetchRepartoDetails]);
  
  const handleRepartoEstadoChange = async (nuevoEstado: EstadoReparto) => {
    setIsUpdating(true);
    const result = await updateRepartoEstadoAction(repartoId, nuevoEstado);
    if (result.success) {
      toast({ title: "Estado del Reparto Actualizado", description: `El reparto ahora está ${getEstadoDisplayName(nuevoEstado)}.` });
      fetchRepartoDetails(); 
    } else {
      toast({ title: "Error al Actualizar Estado", description: result.error, variant: "destructive" });
    }
    setIsUpdating(false);
  };

  const handleParadaEstadoChange = async (paradaId: string, nuevoEstado: EstadoEnvio, envioId: string | null) => {
    setIsUpdating(true);
    const result = await updateParadaEstadoAction(paradaId, nuevoEstado, envioId);
    if (result.success) {
      toast({ title: "Estado de Parada Actualizado", description: `La parada ahora está ${getEstadoDisplayName(nuevoEstado)}.` });
      fetchRepartoDetails(); 
    } else {
      toast({ title: "Error al Actualizar Parada", description: result.error, variant: "destructive" });
    }
    setIsUpdating(false);
  };
  
  const handleOrdenChange = (paradaId: string, nuevoOrden: string) => {
    const ordenNum = parseInt(nuevoOrden, 10);
    setParadasEdit(prev => 
      prev.map(p => p.id === paradaId ? { ...p, orden_visita: isNaN(ordenNum) ? null : ordenNum } : p)
    );
  };

  const handleSaveOrden = async () => {
    if (!reparto) return;
    setIsUpdating(true);
    const orderedParadaIds = paradasEdit
      .slice() 
      .sort((a, b) => (a.orden_visita || Infinity) - (b.orden_visita || Infinity))
      .map(p => p.id!);
    
    const result = await reorderParadasAction(repartoId, orderedParadaIds);
    if (result.success) {
      toast({ title: "Orden de Paradas Actualizado", description: "El orden de las paradas ha sido guardado." });
      fetchRepartoDetails();
    } else {
      toast({ title: "Error al Guardar Orden", description: result.error, variant: "destructive" });
    }
    setIsUpdating(false);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!reparto) {
    return <p className="text-center text-destructive">Reparto no encontrado.</p>;
  }

  const getEstadoDisplayName = (estadoValue?: EstadoReparto | EstadoEnvio | null) => {
    if (!estadoValue) return 'N/A';
    return estadoValue.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }
  
  const getEstadoBadgeVariant = (estado: EstadoReparto | EstadoEnvio | null | undefined) => {
    switch (estado) {
      case 'entregado':
      case 'completado':
        return 'bg-green-500 hover:bg-green-600';
      case 'planificado':
      case 'pendiente_asignacion':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'asignado':
      case 'en_curso':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'no_entregado':
      case 'cancelado':
        return 'bg-red-500 hover:bg-red-600 text-white';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const paradas = paradasEdit;
  const resumen = {
    total: paradas.length,
    pendientes: paradas.filter(p => p.estado_parada === 'asignado' || p.estado_parada === 'pendiente_asignacion').length,
    entregadas: paradas.filter(p => p.estado_parada === 'entregado').length,
    noEntregadas: paradas.filter(p => p.estado_parada === 'no_entregado').length,
    canceladas: paradas.filter(p => p.estado_parada === 'cancelado').length,
  };

  const empresaOrigenParaMapa = reparto.empresa_asociada_id && reparto.empresas 
    ? {
        latitud: reparto.empresas.latitud,
        longitud: reparto.empresas.longitud,
        nombre: reparto.empresas.nombre,
        direccion: reparto.empresas.direccion,
      }
    : undefined;


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild><Link href="/repartos"><ArrowLeft /></Link></Button>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <ClipboardEdit size={32} /> Detalle del Reparto
          </h1>
        </div>
         <Button onClick={fetchRepartoDetails} variant="outline" size="sm" disabled={isUpdating || isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading || isUpdating ? 'animate-spin' : ''}`} /> Refrescar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                    <CardTitle>ID Reparto: {reparto.id?.substring(0, 8)}...</CardTitle>
                    <CardDescription>
                        Fecha: {reparto.fecha_reparto && isValid(new Date(reparto.fecha_reparto)) ? format(new Date(reparto.fecha_reparto), "PPP", { locale: es }) : 'N/A'}
                    </CardDescription>
                    </div>
                    <Badge variant="default" className={cn("text-sm", getEstadoBadgeVariant(reparto.estado))}>
                    {getEstadoDisplayName(reparto.estado)}
                    </Badge>
                </div>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <p><strong className="flex items-center gap-1"><Truck size={16}/>Repartidor:</strong> {reparto.repartidores?.nombre || 'N/A'}</p>
                    <p><strong className="flex items-center gap-1"><Building size={16}/>Empresa:</strong> {reparto.empresas?.nombre || 'Individual / Varios'}</p>
                </div>
                {reparto.notas && <p><strong>Notas del Reparto:</strong> {reparto.notas}</p>}
                <div className="flex gap-2 flex-wrap">
                    {reparto.estado === 'planificado' && 
                    <Button onClick={() => handleRepartoEstadoChange('en_curso')} disabled={isUpdating} className="bg-blue-500 hover:bg-blue-600">
                        {isUpdating ? <Loader2 className="animate-spin mr-2"/> : <Play size={16} className="mr-2"/>} Iniciar Reparto
                    </Button>}
                    {reparto.estado === 'en_curso' && 
                    <Button onClick={() => handleRepartoEstadoChange('completado')} disabled={isUpdating} className="bg-green-500 hover:bg-green-600">
                        {isUpdating ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle size={16} className="mr-2"/>} Finalizar Reparto
                    </Button>}
                    {(reparto.estado === 'planificado' || reparto.estado === 'en_curso') &&
                    <Button onClick={() => handleRepartoEstadoChange('cancelado')} variant="destructive" disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="animate-spin mr-2"/> : <XCircle size={16} className="mr-2"/>} Cancelar Reparto
                    </Button>}
                </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Route size={20} /> Mapa del Reparto</CardTitle>
                    <CardDescription>Visualización de las paradas y la ruta estimada.</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] md:h-[500px]">
                   <RepartoMapComponent 
                        paradas={paradas} 
                        empresaOrigen={empresaOrigenParaMapa}
                        repartoId={repartoId}
                    />
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Paradas ({resumen.total})</CardTitle>
                    <Button onClick={handleSaveOrden} disabled={isUpdating || reparto.estado === 'completado' || reparto.estado === 'cancelado'} size="sm">
                    {isUpdating ? <Loader2 className="animate-spin mr-1"/> : <ClipboardEdit size={14} className="mr-1"/>} Guardar Orden
                    </Button>
                </div>
                <CardDescription>Gestiona el orden y estado de cada parada.</CardDescription>
                 <div className="mt-2 text-xs grid grid-cols-2 gap-x-4 gap-y-1">
                    <span><strong>Entregadas:</strong> {resumen.entregadas}</span>
                    <span><strong>Pendientes:</strong> {resumen.pendientes}</span>
                    <span><strong>No Entregadas:</strong> {resumen.noEntregadas}</span>
                    <span><strong>Canceladas:</strong> {resumen.canceladas}</span>
                </div>
                </CardHeader>
                <CardContent>
                {paradas.length === 0 ? (
                    <p className="text-muted-foreground">Este reparto no tiene paradas asignadas.</p>
                ) : (
                    <ScrollArea className="max-h-[600px] lg:max-h-[calc(100vh-20rem)] pr-3">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]">Orden</TableHead>
                            <TableHead>Destino/Descripción</TableHead>
                            <TableHead className="w-[180px]">Estado Parada</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {paradas.map((parada) => (
                            <TableRow key={parada.id}>
                            <TableCell>
                                <Input 
                                type="number"
                                value={parada.orden_visita ?? ""}
                                onChange={(e) => handleOrdenChange(parada.id!, e.target.value)}
                                className="w-14 h-8 text-center px-1"
                                disabled={isUpdating || reparto.estado === 'completado' || reparto.estado === 'cancelado'}
                                />
                            </TableCell>
                            <TableCell>
                                <div className="flex items-start gap-1">
                                <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0"/> 
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm leading-tight">
                                        {parada.envio_id ? (parada.envios as EnvioConDetalles)?.direccion_destino : parada.descripcion_parada}
                                    </span>
                                    {parada.envio_id && (
                                        <span className="text-xs text-muted-foreground">
                                        ID Envío: {parada.envio_id.substring(0,8)}... | 
                                        Cliente: {(parada.envios as EnvioConDetalles)?.clientes?.nombre ? 
                                            `${(parada.envios as EnvioConDetalles)?.clientes?.apellido}, ${(parada.envios as EnvioConDetalles)?.clientes?.nombre}` :
                                            (parada.envios as EnvioConDetalles)?.cliente_temporal_nombre || 'N/A'
                                        } |
                                        Paq: {(parada.envios as EnvioConDetalles)?.tipos_paquete?.nombre || 'N/A'}
                                        </span>
                                    )}
                                     {parada.notas_parada && <span className="text-xs text-blue-600">Nota P.: {parada.notas_parada}</span>}
                                     {parada.envio_id && (parada.envios as EnvioConDetalles)?.notas_conductor && <span className="text-xs text-orange-600">Nota E.: {(parada.envios as EnvioConDetalles)?.notas_conductor}</span>}
                                </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Select
                                value={parada.estado_parada || undefined}
                                onValueChange={(value) => handleParadaEstadoChange(parada.id!, value as EstadoEnvio, parada.envio_id || null)}
                                disabled={isUpdating || reparto.estado === 'completado' || reparto.estado === 'cancelado'}
                                >
                                <SelectTrigger className={cn("h-9 text-xs", getEstadoBadgeVariant(parada.estado_parada))}>
                                    <SelectValue placeholder="Estado..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {EstadoEnvioEnum.options.filter(e => e !== 'pendiente_asignacion').map(estado => (
                                    <SelectItem key={estado} value={estado} className="text-xs">{getEstadoDisplayName(estado)}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
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
      </div>
    </div>
  );
}

    