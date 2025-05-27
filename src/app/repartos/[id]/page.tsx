
"use client";

import * as React from 'react'; 
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building, CalendarIcon as IconCalendar, CheckCircle, ClipboardEdit, Edit, Info, Loader2, MapPin, Package, Play, PowerOff, RefreshCw, Route, Truck, User, XCircle, InfoIcon, Sparkles } from "lucide-react";
import { getRepartoByIdAction, updateRepartoEstadoAction, updateParadaEstadoAction, reorderParadasAction } from '@/actions/reparto-actions';
import type { RepartoConDetalles, ParadaConDetalles, EstadoReparto, EstadoEnvio, EnvioConDetalles, Empresa, MappableStop } from '@/lib/schemas';
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
import { getGoogleMapsApi, optimizeDeliveryRoute } from '@/services/google-maps-service';


interface RepartoDetallePageProps {
  params: { id: string } | Promise<{ id: string }>;
}

export default function RepartoDetallePage({ params: paramsProp }: RepartoDetallePageProps) {
  const { toast } = useToast();
  const router = useRouter();
  
  const resolvedParams = React.use(paramsProp); 
  const repartoId = resolvedParams.id;

  const [reparto, setReparto] = React.useState<(RepartoConDetalles & { paradas: ParadaConDetalles[] }) | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [paradasEdit, setParadasEdit] = React.useState<ParadaConDetalles[]>([]);
  const [totalDistance, setTotalDistance] = React.useState<number | null>(null);
  const [googleMapsApi, setGoogleMapsApi] = React.useState<typeof google | null>(null);
  const [isMapsApiReady, setIsMapsApiReady] = React.useState(false);
  const [isOptimizingRoute, setIsOptimizingRoute] = React.useState(false);


  React.useEffect(() => {
    getGoogleMapsApi()
      .then((api) => {
        setGoogleMapsApi(api);
        setIsMapsApiReady(true);
      })
      .catch((error) => {
        console.error("Error loading Google Maps API for distance calculation:", error);
        toast({ title: "Error de Mapa", description: "No se pudo cargar Google Maps para calcular distancias.", variant: "destructive" });
      });
  }, [toast]);


  const fetchRepartoDetails = React.useCallback(async () => {
    if (!repartoId) return;
    setIsLoading(true);
    const { reparto: data, error } = await getRepartoByIdAction(repartoId);
    if (error || !data) {
      toast({ title: "Error al Cargar Reparto", description: error || "Reparto no encontrado.", variant: "destructive" });
      router.push('/repartos');
      return;
    }
    
    let repartoDataWithDate = { ...data };
    if (data.fecha_reparto && typeof data.fecha_reparto === 'string') {
      const parsedDate = parseISO(data.fecha_reparto); 
      if (isValid(parsedDate)) {
        repartoDataWithDate.fecha_reparto = parsedDate;
      } else {
        console.warn("Invalid date received for fecha_reparto:", data.fecha_reparto);
      }
    }
    
    const sortedParadas = (repartoDataWithDate.paradas_reparto || [])
        .map(p => ({...p, orden_visita: p.orden_visita === null ? Infinity : p.orden_visita})) 
        .sort((a, b) => (a.orden_visita!) - (b.orden_visita!))
        .map(p => ({...p, orden_visita: p.orden_visita === Infinity ? null : p.orden_visita})); 

    setReparto({...repartoDataWithDate, paradas: sortedParadas});
    setParadasEdit(sortedParadas);
    setIsLoading(false);
  }, [repartoId, toast, router]);

  React.useEffect(() => {
    fetchRepartoDetails();
  }, [fetchRepartoDetails]);

  const calculateTotalDistance = React.useCallback(() => {
    if (!isMapsApiReady || !googleMapsApi || !reparto || paradasEdit.length === 0) {
      setTotalDistance(null);
      return;
    }

    let distance = 0;
    const pointsToCalculate: google.maps.LatLngLiteral[] = [];
    const paradasSorted = [...paradasEdit].sort((a,b) => (a.orden_visita || Infinity) - (b.orden_visita || Infinity));

    const empresaOrigenParaMapa = reparto.empresa_asociada_id && reparto.empresas 
    ? {
        latitud: reparto.empresas.latitud,
        longitud: reparto.empresas.longitud,
      }
    : null;

    let firstStopIsExplicitPickup = false;
    if (paradasSorted.length > 0 && !paradasSorted[0].envio_id && paradasSorted[0].descripcion_parada?.toLowerCase().includes('retiro')) {
       if (empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
            pointsToCalculate.push({ lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud });
            firstStopIsExplicitPickup = true;
       }
    } else if (empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
        pointsToCalculate.push({ lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud });
    }


    paradasSorted.forEach(parada => {
      if (parada.envio_id && parada.envios?.latitud_destino != null && parada.envios?.longitud_destino != null) {
        pointsToCalculate.push({ lat: parada.envios.latitud_destino, lng: parada.envios.longitud_destino });
      }
    });

    if (pointsToCalculate.length < 2) {
      setTotalDistance(0);
      return;
    }

    for (let i = 0; i < pointsToCalculate.length - 1; i++) {
      const from = new googleMapsApi.maps.LatLng(pointsToCalculate[i]);
      const to = new googleMapsApi.maps.LatLng(pointsToCalculate[i + 1]);
      distance += googleMapsApi.maps.geometry.spherical.computeDistanceBetween(from, to);
    }
    setTotalDistance(distance / 1000); 
  }, [isMapsApiReady, googleMapsApi, reparto, paradasEdit]);

  React.useEffect(() => {
    calculateTotalDistance();
  }, [calculateTotalDistance]);
  
  const handleRepartoEstadoChange = async (nuevoEstado: EstadoReparto) => {
    if (!repartoId) return;
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
    if (!repartoId) return;
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
  
  const handleOrdenChange = (paradaId: string, nuevoOrdenStr: string) => {
    const nuevoOrden = nuevoOrdenStr === '' ? null : parseInt(nuevoOrdenStr, 10); 
    setParadasEdit(prev => 
      prev.map(p => p.id === paradaId ? { ...p, orden_visita: (nuevoOrden !== null && !isNaN(nuevoOrden)) ? nuevoOrden : null } : p)
    );
  };

  const handleSaveOrden = async () => {
    if (!reparto || !repartoId) return;

    const orderNumbers = paradasEdit.map(p => p.orden_visita).filter(o => o !== null && o !== undefined);
    const hasDuplicates = new Set(orderNumbers).size !== orderNumbers.length;
    if (hasDuplicates) {
      toast({ title: "Error de Orden", description: "Los números de orden de visita deben ser únicos y no pueden estar vacíos.", variant: "destructive"});
      return;
    }
    if (paradasEdit.some(p => p.orden_visita === null || p.orden_visita === undefined || p.orden_visita <= 0)) {
      toast({ title: "Error de Orden", description: "Todos los números de orden deben ser positivos.", variant: "destructive"});
      return;
    }
    
    const sortedParadaIds = paradasEdit
      .slice() 
      .sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity))
      .map(p => p.id!);
    
    setIsUpdating(true);
    const result = await reorderParadasAction(repartoId, sortedParadaIds);
    if (result.success) {
      toast({ title: "Orden de Paradas Actualizado", description: "El orden de las paradas ha sido guardado." });
      fetchRepartoDetails();
    } else {
      toast({ title: "Error al Guardar Orden", description: result.error, variant: "destructive" });
    }
    setIsUpdating(false);
  };

  const handleOptimizeRoute = async () => {
    if (!reparto || !isMapsApiReady || paradasEdit.length === 0) {
      toast({ title: "No se puede optimizar", description: "No hay paradas suficientes o la API de mapas no está lista.", variant: "warning" });
      return;
    }
    setIsOptimizingRoute(true);

    const pointsToOptimize: MappableStop[] = [];
    const empresaOrigen = reparto.empresas;
    const explicitPickupStop = paradasEdit.find(p => !p.envio_id && p.descripcion_parada?.toLowerCase().includes('retiro'));

    // Define Origin
    if (explicitPickupStop && empresaOrigen?.latitud != null && empresaOrigen?.longitud != null) {
      pointsToOptimize.push({ id: explicitPickupStop.id!, location: { lat: empresaOrigen.latitud, lng: empresaOrigen.longitud } });
    } else if (empresaOrigen?.latitud != null && empresaOrigen?.longitud != null) {
      pointsToOptimize.push({ id: 'ORIGIN_EMPRESA_ANCHOR', location: { lat: empresaOrigen.latitud, lng: empresaOrigen.longitud } });
    }

    // Add Delivery Stops as Waypoints
    paradasEdit.forEach(parada => {
      if (parada.envio_id && parada.envios?.latitud_destino != null && parada.envios?.longitud_destino != null) {
         if (!explicitPickupStop || parada.id !== explicitPickupStop.id) { // Avoid duplicating the pickup if it's also in paradasEdit
            pointsToOptimize.push({ id: parada.id!, location: { lat: parada.envios.latitud_destino, lng: parada.envios.longitud_destino } });
         }
      }
    });
    
    if (pointsToOptimize.length < 2) {
      toast({ title: "Optimización no posible", description: "Se necesitan al menos un origen y un destino con coordenadas válidas.", variant: "warning" });
      setIsOptimizingRoute(false);
      return;
    }

    try {
      const optimizedRoutePoints = await optimizeDeliveryRoute(pointsToOptimize);
      if (optimizedRoutePoints) {
        const originalParadasMap = new Map(paradasEdit.map(p => [p.id, p]));
        const newOrderedParadas: ParadaConDetalles[] = [];
        let orderCounter = 1;

        optimizedRoutePoints.forEach(optimizedStop => {
          if (optimizedStop.id === 'ORIGIN_EMPRESA_ANCHOR') {
            // This was a placeholder for company origin if no explicit pickup stop.
            // If an explicit pickup stop exists, it should have been the first in pointsToOptimize.
            // We need to ensure the explicit pickup stop is handled correctly.
            const actualPickupStop = paradasEdit.find(p => !p.envio_id && p.descripcion_parada?.toLowerCase().includes('retiro'));
            if (actualPickupStop && !newOrderedParadas.find(p=>p.id === actualPickupStop.id)) {
              newOrderedParadas.push({ ...actualPickupStop, orden_visita: orderCounter++ });
            }
          } else {
            const originalParada = originalParadasMap.get(optimizedStop.id);
            if (originalParada && !newOrderedParadas.find(p=>p.id === originalParada.id)) {
              newOrderedParadas.push({ ...originalParada, orden_visita: orderCounter++ });
            }
          }
        });
        
        // Ensure all original paradas are included, preserving non-optimized ones if any were excluded
        // This might be needed if some paradas had no coords and were skipped in pointsToOptimize
        paradasEdit.forEach(originalP => {
            if (!newOrderedParadas.find(p => p.id === originalP.id)) {
                newOrderedParadas.push({...originalP, orden_visita: originalP.orden_visita || orderCounter++ }); // Keep original order or append
            }
        });
        // Final sort by the newly assigned (or preserved) orden_visita
        newOrderedParadas.sort((a,b) => (a.orden_visita || Infinity) - (b.orden_visita || Infinity));
        // Re-assign sequential order_visita based on the final sorted list
        const finalReorderedParadas = newOrderedParadas.map((p, index) => ({...p, orden_visita: index + 1}));


        setParadasEdit(finalReorderedParadas);
        toast({ title: "Ruta Optimizada", description: "El orden de las paradas ha sido optimizado. Guarde los cambios." });
      } else {
        toast({ title: "Error de Optimización", description: "No se pudo optimizar la ruta.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error de Optimización", description: error.message || "Ocurrió un error desconocido.", variant: "destructive" });
    } finally {
      setIsOptimizingRoute(false);
    }
  };


  if (isLoading || !repartoId) {
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
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'planificado':
      case 'pendiente_asignacion': // Should not happen for parada_estado, but good to cover
        return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'asignado':
      case 'en_camino':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'no_entregado':
      case 'cancelado':
        return 'bg-red-500 hover:bg-red-600 text-white';
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };

  const paradas = paradasEdit;
  const resumenParadas = {
    total: paradas.length,
    pendientes: paradas.filter(p => p.estado_parada === 'asignado' || p.estado_parada === 'pendiente_asignacion').length,
    entregadas: paradas.filter(p => p.estado_parada === 'entregado').length,
    noEntregadas: paradas.filter(p => p.estado_parada === 'no_entregado').length,
    canceladas: paradas.filter(p => p.estado_parada === 'cancelado').length,
  };

  const empresaOrigenParaMapa = reparto.empresa_asociada_id && reparto.empresas 
    ? {
        id: reparto.empresas.id, // Pass ID for MappableStop
        latitud: reparto.empresas.latitud,
        longitud: reparto.empresas.longitud,
        nombre: reparto.empresas.nombre,
        direccion: reparto.empresas.direccion,
      }
    : undefined;

  const isRepartoFinalizado = reparto.estado === 'completado' || reparto.estado === 'cancelado';


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild><Link href="/repartos"><ArrowLeft className="h-4 w-4"/></Link></Button>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <ClipboardEdit size={32} /> Detalle del Reparto
          </h1>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={handleOptimizeRoute} variant="outline" size="sm" disabled={isRepartoFinalizado || isLoading || isUpdating || isOptimizingRoute || !isMapsApiReady}>
                {isOptimizingRoute ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Sparkles size={14} className="mr-2"/>} Optimizar Ruta (IA)
            </Button>
            <Button onClick={fetchRepartoDetails} variant="outline" size="sm" disabled={isLoading || isUpdating || isOptimizingRoute}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading || isUpdating || isOptimizingRoute ? 'animate-spin' : ''}`} /> Refrescar
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-xl shadow-md">
                <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                    <CardTitle className="text-primary">ID Reparto: {reparto.id?.substring(0, 8)}...</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                        Fecha: {reparto.fecha_reparto && isValid(new Date(reparto.fecha_reparto)) ? format(new Date(reparto.fecha_reparto), "PPP", { locale: es }) : 'N/A'}
                    </CardDescription>
                    </div>
                    <Badge variant="default" className={cn("text-sm font-semibold", getEstadoBadgeVariant(reparto.estado))}>
                    {getEstadoDisplayName(reparto.estado)}
                    </Badge>
                </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <p className="flex items-center gap-1.5"><Truck size={16} className="text-muted-foreground"/><strong>Repartidor:</strong> {reparto.repartidores?.nombre || 'N/A'}</p>
                    <p className="flex items-center gap-1.5"><Building size={16} className="text-muted-foreground"/><strong>Empresa:</strong> {reparto.empresas?.nombre || 'Individual / Varios'}</p>
                  </div>
                  {reparto.notas && <p className="flex items-start gap-1.5"><InfoIcon size={16} className="text-muted-foreground mt-0.5"/><strong>Notas del Reparto:</strong> <span className="text-muted-foreground">{reparto.notas}</span></p>}
                
                  {!isRepartoFinalizado && (
                    <div className="flex gap-2 flex-wrap pt-2">
                        {reparto.estado === 'planificado' && 
                        <Button onClick={() => handleRepartoEstadoChange('en_curso')} disabled={isUpdating} className="bg-blue-500 hover:bg-blue-600 text-white">
                            {isUpdating ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Play size={16} className="mr-2"/>} Iniciar Reparto
                        </Button>}
                        {reparto.estado === 'en_curso' && 
                        <Button onClick={() => handleRepartoEstadoChange('completado')} disabled={isUpdating} className="bg-green-500 hover:bg-green-600 text-white">
                            {isUpdating ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <CheckCircle size={16} className="mr-2"/>} Finalizar Reparto
                        </Button>}
                        {(reparto.estado === 'planificado' || reparto.estado === 'en_curso') &&
                        <Button onClick={() => handleRepartoEstadoChange('cancelado')} variant="destructive" disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <XCircle size={16} className="mr-2"/>} Cancelar Reparto
                        </Button>}
                    </div>
                  )}
                </CardContent>
            </Card>

            <Card className="rounded-xl shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-primary"><Route size={20} /> Mapa del Reparto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="h-[350px] md:h-[450px] rounded-md overflow-hidden border">
                       <RepartoMapComponent 
                            paradas={paradas} 
                            empresaOrigen={empresaOrigenParaMapa}
                            repartoId={repartoId!}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm p-3 bg-muted/50 rounded-lg">
                        <p><strong>Total Paradas:</strong> {resumenParadas.total}</p>
                        <p><strong>Distancia Estimada:</strong> {totalDistance !== null ? `${totalDistance.toFixed(2)} km` : (isMapsApiReady ? 'Calculando...' : 'Mapa no disp.')}</p>
                        <p><strong>Tiempo Estimado:</strong> <span className="text-muted-foreground">N/A</span></p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1">
            <Card className="rounded-xl shadow-md h-full flex flex-col">
                <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-primary">Paradas ({resumenParadas.total})</CardTitle>
                    {!isRepartoFinalizado && (
                      <Button onClick={handleSaveOrden} disabled={isUpdating || isOptimizingRoute} size="sm">
                        {(isUpdating || isOptimizingRoute) ? <Loader2 className="animate-spin mr-1 h-4 w-4"/> : <ClipboardEdit size={14} className="mr-1"/>} Guardar Orden
                      </Button>
                    )}
                </div>
                <CardDescription>Gestiona el orden y estado de cada parada.</CardDescription>
                 <div className="mt-2 text-xs grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-muted-foreground">
                    <span>Entregadas: {resumenParadas.entregadas}</span>
                    <span>Pendientes: {resumenParadas.pendientes}</span>
                    <span>No Ent.: {resumenParadas.noEntregadas}</span>
                    <span>Cancel.: {resumenParadas.canceladas}</span>
                </div>
                </CardHeader>
                <CardContent className="flex-grow overflow-hidden p-0">
                {paradas.length === 0 ? (
                    <p className="text-muted-foreground text-center py-10 px-4">Este reparto no tiene paradas asignadas.</p>
                ) : (
                    <ScrollArea className="h-[calc(100vh-12rem)] sm:h-auto lg:max-h-[calc(100vh-20rem)]"> {/* Adjusted height for scroll area */}
                    <Table className="text-xs sm:text-sm">
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px] px-2 py-2">Orden</TableHead>
                            <TableHead className="px-2 py-2">Destino/Descripción</TableHead>
                            <TableHead className="w-[160px] px-2 py-2">Estado Parada</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {paradas.map((parada) => (
                            <TableRow key={parada.id}>
                            <TableCell className="px-2 py-2">
                                <Input 
                                type="number"
                                value={parada.orden_visita ?? ""}
                                onChange={(e) => handleOrdenChange(parada.id!, e.target.value)}
                                className="w-12 h-8 text-center px-1 text-xs"
                                disabled={isUpdating || isRepartoFinalizado || isOptimizingRoute}
                                min="1"
                                />
                            </TableCell>
                            <TableCell className="px-2 py-2">
                                <div className="flex items-start gap-1">
                                <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0"/> 
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm leading-tight">
                                        {parada.envio_id ? (parada.envios as EnvioConDetalles)?.direccion_destino : parada.descripcion_parada}
                                    </span>
                                    {parada.envio_id && (
                                        <>
                                          <span className="text-xs text-muted-foreground">
                                            ID: {parada.envio_id.substring(0,8)}... | 
                                            Cliente: {(parada.envios as EnvioConDetalles)?.clientes?.nombre ? 
                                                `${(parada.envios as EnvioConDetalles)?.clientes?.apellido}, ${(parada.envios as EnvioConDetalles)?.clientes?.nombre}` :
                                                (parada.envios as EnvioConDetalles)?.cliente_temporal_nombre || 'N/A'
                                            }
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            Paq: {(parada.envios as EnvioConDetalles)?.tipos_paquete?.nombre || 'N/A'}
                                          </span>
                                        </>
                                    )}
                                     {parada.notas_parada && <span className="text-xs text-blue-600">Nota P.: {parada.notas_parada}</span>}
                                     {parada.envio_id && (parada.envios as EnvioConDetalles)?.notas_conductor && <span className="text-xs text-orange-600">Nota E.: {(parada.envios as EnvioConDetalles)?.notas_conductor}</span>}
                                </div>
                                </div>
                            </TableCell>
                            <TableCell className="px-2 py-2">
                                <Select
                                value={parada.estado_parada || undefined}
                                onValueChange={(value) => handleParadaEstadoChange(parada.id!, value as EstadoEnvio, parada.envio_id || null)}
                                disabled={isUpdating || isRepartoFinalizado || isOptimizingRoute}
                                >
                                <SelectTrigger className={cn("h-8 text-xs", getEstadoBadgeVariant(parada.estado_parada))}>
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
