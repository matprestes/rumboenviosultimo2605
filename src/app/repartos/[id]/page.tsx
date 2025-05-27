
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
  const [googleMaps, setGoogleMaps] = React.useState<typeof google | null>(null);
  const [isMapsApiReady, setIsMapsApiReady] = React.useState(false);
  const [isOptimizingRoute, setIsOptimizingRoute] = React.useState(false);

  React.useEffect(() => {
    getGoogleMapsApi()
      .then((api) => {
        setGoogleMaps(api);
        setIsMapsApiReady(true);
      })
      .catch((error) => {
        console.error("Error loading Google Maps API for RepartoDetallePage:", error);
        toast({ title: "Error de Mapa", description: "No se pudo cargar Google Maps. Funcionalidades de mapa y optimización estarán limitadas.", variant: "destructive" });
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
    
    let rawParadas = repartoDataWithDate.paradas_reparto || [];
    let pickupStopFromData: ParadaConDetalles | undefined = rawParadas.find(p => !p.envio_id && p.descripcion_parada?.toLowerCase().includes('retiro'));
    
    // If no explicit pickup stop, but it's a lote reparto with company info, create/identify one.
    if (!pickupStopFromData && repartoDataWithDate.empresa_asociada_id && repartoDataWithDate.empresas) {
        // Check if a stop with orden_visita 0 already exists (could be an implicit pickup)
        const existingOrderZero = rawParadas.find(p => p.orden_visita === 0 && !p.envio_id);
        if (existingOrderZero) {
            pickupStopFromData = {
                ...existingOrderZero,
                descripcion_parada: existingOrderZero.descripcion_parada || `Retiro en ${repartoDataWithDate.empresas.nombre}`,
                orden_visita: 0
            };
        } else { // Create a conceptual pickup stop if none exists
            pickupStopFromData = {
                id: `pickup-${repartoDataWithDate.id}`, // Synthetic ID
                reparto_id: repartoDataWithDate.id!,
                envio_id: null,
                descripcion_parada: `Retiro en ${repartoDataWithDate.empresas.nombre}`,
                orden_visita: 0,
                estado_parada: 'asignado', // Or a suitable default
            };
            rawParadas = [pickupStopFromData, ...rawParadas];
        }
    } else if (pickupStopFromData) {
        pickupStopFromData.orden_visita = 0;
    }

    let deliveryStops = rawParadas.filter(p => p.id !== pickupStopFromData?.id && p.envio_id);
    deliveryStops.sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));
    
    const finalSortedParadas: ParadaConDetalles[] = [];
    if (pickupStopFromData) {
      finalSortedParadas.push({ ...pickupStopFromData, orden_visita: 0 });
    }
    deliveryStops.forEach((stop, index) => {
      finalSortedParadas.push({ ...stop, orden_visita: index + 1 });
    });

    setReparto({...repartoDataWithDate, paradas: finalSortedParadas});
    setParadasEdit(finalSortedParadas);
    setIsLoading(false);
  }, [repartoId, toast, router]);

  React.useEffect(() => {
    fetchRepartoDetails();
  }, [fetchRepartoDetails]);

  const calculateTotalDistance = React.useCallback(() => {
    if (!isMapsApiReady || !googleMaps || !reparto || paradasEdit.length === 0) {
      setTotalDistance(null);
      return;
    }

    let distance = 0;
    const pointsToCalculate: google.maps.LatLngLiteral[] = [];
    const paradasSortedForDistance = [...paradasEdit].sort((a,b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));

    const empresaOrigenCoordenadas = reparto.empresas?.latitud != null && reparto.empresas?.longitud != null
      ? { lat: reparto.empresas.latitud, lng: reparto.empresas.longitud }
      : null;

    const originStop = paradasSortedForDistance.find(p => p.orden_visita === 0);

    if (originStop && empresaOrigenCoordenadas) { // Explicit "Retiro" stop uses company coords
        pointsToCalculate.push(empresaOrigenCoordenadas);
    } else if (empresaOrigenCoordenadas) { // Lote reparto, company is implicit origin
        pointsToCalculate.push(empresaOrigenCoordenadas);
    }
    
    paradasSortedForDistance.forEach(parada => {
      if (parada.envio_id && parada.envios?.latitud_destino != null && parada.envios?.longitud_destino != null) {
         // Only add if it's not the origin stop that might have also been a delivery (unlikely scenario)
         if (!originStop || parada.id !== originStop.id) {
            pointsToCalculate.push({ lat: parada.envios.latitud_destino, lng: parada.envios.longitud_destino });
         }
      }
    });

    if (pointsToCalculate.length < 2) {
      setTotalDistance(0);
      return;
    }

    for (let i = 0; i < pointsToCalculate.length - 1; i++) {
      const from = new googleMaps.maps.LatLng(pointsToCalculate[i]);
      const to = new googleMaps.maps.LatLng(pointsToCalculate[i + 1]);
      distance += googleMaps.maps.geometry.spherical.computeDistanceBetween(from, to);
    }
    setTotalDistance(distance / 1000); 
  }, [isMapsApiReady, googleMaps, reparto, paradasEdit]);


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
      prev.map(p => {
        if (p.id === paradaId && p.envio_id && p.orden_visita !== 0) { 
          return { ...p, orden_visita: (nuevoOrden !== null && !isNaN(nuevoOrden)) ? nuevoOrden : null };
        }
        return p;
      })
    );
  };

  const handleSaveOrden = async () => {
    if (!reparto || !repartoId) return;

    const deliveryParadas = paradasEdit.filter(p => p.envio_id && p.orden_visita !== 0);
    const orderNumbers = deliveryParadas.map(p => p.orden_visita).filter(o => o !== null && o !== undefined);
    
    if (deliveryParadas.some(p => p.orden_visita === null || p.orden_visita === undefined || p.orden_visita <= 0)) {
      toast({ title: "Error de Orden", description: "Todas las paradas de entrega deben tener un número de orden positivo.", variant: "destructive"});
      return;
    }
    const hasDuplicates = new Set(orderNumbers).size !== orderNumbers.length;
    if (hasDuplicates) {
      toast({ title: "Error de Orden", description: "Los números de orden de las paradas de entrega deben ser únicos.", variant: "destructive"});
      return;
    }
    
    const sortedDeliveryParadaIds = deliveryParadas
      .slice() 
      .sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity))
      .map(p => p.id!);
    
    setIsUpdating(true);
    const result = await reorderParadasAction(repartoId, sortedDeliveryParadaIds);
    if (result.success) {
      toast({ title: "Orden de Paradas Actualizado", description: "El orden de las paradas de entrega ha sido guardado." });
      fetchRepartoDetails();
    } else {
      toast({ title: "Error al Guardar Orden", description: result.error, variant: "destructive" });
    }
    setIsUpdating(false);
  };

  const handleOptimizeRoute = async () => {
    if (!reparto || !isMapsApiReady || !googleMaps) {
      toast({ title: "No se puede optimizar", description: "El mapa o los datos del reparto no están listos.", variant: "default" });
      return;
    }
    setIsOptimizingRoute(true);

    const empresaOrigenCoords = reparto.empresas?.latitud != null && reparto.empresas?.longitud != null 
        ? { lat: reparto.empresas.latitud, lng: reparto.empresas.longitud } 
        : null;

    const fixedPickupStop = paradasEdit.find(p => p.orden_visita === 0 && !p.envio_id);
    let originMappableStop: MappableStop | null = null;

    if (fixedPickupStop && empresaOrigenCoords) {
        originMappableStop = { id: fixedPickupStop.id!, location: empresaOrigenCoords };
    } else if (empresaOrigenCoords) { // Fallback for lote reparto if no explicit order 0 stop object found yet
        originMappableStop = { id: 'ORIGIN_EMPRESA_ANCHOR', location: empresaOrigenCoords };
    }

    if (!originMappableStop) {
      toast({ title: "Optimización Fallida", description: "No se puede optimizar sin una parada de empresa (origen) válida con coordenadas.", variant: "destructive" });
      setIsOptimizingRoute(false);
      return;
    }

    // Filter for optimizable delivery stops associated with the reparto's main empresa (if defined)
    const optimizableDeliveryParadas = paradasEdit.filter(p => {
        const isDelivery = p.envio_id && p.envios?.latitud_destino != null && p.envios?.longitud_destino != null;
        if (!isDelivery) return false;
        if (p.id === fixedPickupStop?.id) return false; // Exclude the pickup stop itself

        // If reparto is associated with an empresa, only optimize deliveries for that empresa's clients/origins
        if (reparto.empresa_asociada_id) {
            // Check if envio's origin empresa or remitente cliente's empresa matches reparto's empresa
            return p.envios?.empresa_origen_id === reparto.empresa_asociada_id || 
                   (p.envios?.clientes && p.envios.clientes.empresa_id === reparto.empresa_asociada_id);
        }
        return true; // If no empresa_asociada_id on reparto, optimize all valid delivery stops
    });
    
    if (optimizableDeliveryParadas.length < 2) {
      toast({ title: "Optimización no necesaria", description: "Se necesitan al menos dos paradas de cliente válidas y asociadas (además del origen) para optimizar.", variant: "default" });
      setIsOptimizingRoute(false);
      return;
    }

    const pointsForGoogleApi: MappableStop[] = [
      originMappableStop,
      ...optimizableDeliveryParadas.map(p => ({
        id: p.id!,
        location: { lat: p.envios!.latitud_destino!, lng: p.envios!.longitud_destino! }
      }))
    ];

    try {
      const optimizedStopsFromApi = await optimizeDeliveryRoute(pointsForGoogleApi);
      
      if (optimizedStopsFromApi && optimizedStopsFromApi.length > 0) {
        const originalParadasMap = new Map(paradasEdit.map(p => [p.id!, p]));
        let newOrderedParadas: ParadaConDetalles[] = [];
        let deliveryOrderCounter = 1;

        // 1. Add the fixed origin/pickup stop (orden_visita = 0)
        const actualPickupStop = paradasEdit.find(p => p.orden_visita === 0 && !p.envio_id);
        if (actualPickupStop) {
          newOrderedParadas.push({ ...actualPickupStop, orden_visita: 0 });
        } else if (originMappableStop.id === 'ORIGIN_EMPRESA_ANCHOR' && empresaOrigenParaMapa && reparto) {
            // Create a temporary visual for the origin if it was an anchor
            newOrderedParadas.push({
                id: 'pickup-' + reparto.id,
                reparto_id: reparto.id!,
                envio_id: null,
                descripcion_parada: `Retiro en ${empresaOrigenParaMapa.nombre}`,
                orden_visita: 0,
                estado_parada: 'asignado',
            });
        }


        // 2. Add optimized delivery stops, skipping the Google API's origin point
        for (let i = 0; i < optimizedStopsFromApi.length; i++) {
          const optimizedStopApiItem = optimizedStopsFromApi[i];
          // Skip if it's the anchor ID used for origin, or if it's the actual pickup stop's ID (already added)
          if (optimizedStopApiItem.id === 'ORIGIN_EMPRESA_ANCHOR' || optimizedStopApiItem.id === actualPickupStop?.id) continue;

          const originalParada = originalParadasMap.get(optimizedStopApiItem.id);
          if (originalParada && originalParada.envio_id) { 
            newOrderedParadas.push({ ...originalParada, orden_visita: deliveryOrderCounter++ });
          }
        }
        
        // 3. Add any remaining paradas from paradasEdit that were not part of optimization
        const currentIdsInOptimizedList = new Set(newOrderedParadas.map(p => p.id));
        paradasEdit.forEach(originalParada => {
          if (!currentIdsInOptimizedList.has(originalParada.id)) {
            if (originalParada.envio_id) { // Only add remaining delivery stops
                newOrderedParadas.push({ ...originalParada, orden_visita: deliveryOrderCounter++ });
            } else if (originalParada.id !== actualPickupStop?.id) { // Non-delivery, non-pickup stops (should not exist based on logic)
                newOrderedParadas.push({ ...originalParada, orden_visita: null }); // Or handle appropriately
            }
          }
        });

        setParadasEdit(newOrderedParadas);
        toast({ title: "Ruta Optimizada", description: "El orden de las paradas de entrega ha sido actualizado. Revise y guarde los cambios." });
      } else {
        toast({ title: "Error de Optimización", description: "No se pudo obtener una ruta optimizada desde Google Maps.", variant: "destructive" });
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
      case 'pendiente_asignacion':
        return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'asignado':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'en_camino':
          return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'no_entregado':
      case 'cancelado':
        return 'bg-red-500 hover:bg-red-600 text-white';
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };

  const paradas = paradasEdit;
  const resumenParadas = {
    total: paradas.filter(p => p.envio_id).length, 
    pendientes: paradas.filter(p => p.envio_id && (p.estado_parada === 'asignado' || p.estado_parada === 'pendiente_asignacion')).length,
    entregadas: paradas.filter(p => p.envio_id && p.estado_parada === 'entregado').length,
    noEntregadas: paradas.filter(p => p.envio_id && p.estado_parada === 'no_entregado').length,
    canceladas: paradas.filter(p => p.envio_id && p.estado_parada === 'cancelado').length,
  };

  const empresaOrigenParaMapa = reparto.empresa_asociada_id && reparto.empresas 
    ? {
        id: reparto.empresas.id,
        latitud: reparto.empresas.latitud,
        longitud: reparto.empresas.longitud,
        nombre: reparto.empresas.nombre,
        direccion: reparto.empresas.direccion,
      }
    : undefined;

  const isRepartoFinalizado = reparto.estado === 'completado' || reparto.estado === 'cancelado';
  
  const pickupStopForOptimizationCheck = paradasEdit.find(p => p.orden_visita === 0 && !p.envio_id);
  const canOptimize = !isRepartoFinalizado && 
                      ( (pickupStopForOptimizationCheck && empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) || (empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) ) &&
                      paradasEdit.filter(p => 
                        p.envio_id && 
                        p.envios?.latitud_destino != null && 
                        p.envios?.longitud_destino != null &&
                        (!reparto.empresa_asociada_id || (p.envios?.empresas_origen?.id === reparto.empresa_asociada_id) || (p.envios?.clientes?.empresa_id === reparto.empresa_asociada_id))
                      ).length >= 2;


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
            <Button onClick={handleOptimizeRoute} variant="outline" size="sm" disabled={!canOptimize || isLoading || isUpdating || isOptimizingRoute || !isMapsApiReady}>
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
                            paradas={paradasEdit} 
                            empresaOrigen={empresaOrigenParaMapa}
                            repartoId={repartoId!}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm p-3 bg-muted/50 rounded-lg">
                        <p><strong>Total Entregas:</strong> {resumenParadas.total}</p>
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
                    <CardTitle className="text-primary">Paradas ({paradas.filter(p => p.envio_id || p.orden_visita === 0).length})</CardTitle> {/* Count includes origin */}
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
                    <ScrollArea className="h-[calc(100vh-12rem)] sm:h-auto lg:max-h-[calc(100vh-20rem)]">
                    <Table className="text-xs sm:text-sm">
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px] px-2 py-2">Orden</TableHead>
                            <TableHead className="px-2 py-2">Destino/Descripción</TableHead>
                            <TableHead className="w-[160px] px-2 py-2">Estado Parada</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {paradasEdit.map((parada) => (
                            <TableRow key={parada.id}>
                            <TableCell className="px-2 py-2">
                                {parada.orden_visita === 0 && !parada.envio_id ? (
                                    <span className="font-semibold text-muted-foreground text-center block w-12">Origen</span>
                                ) : (
                                    <Input 
                                        type="number"
                                        value={parada.orden_visita ?? ""}
                                        onChange={(e) => handleOrdenChange(parada.id!, e.target.value)}
                                        className="w-12 h-8 text-center px-1 text-xs"
                                        disabled={isUpdating || isRepartoFinalizado || isOptimizingRoute || parada.orden_visita === 0}
                                        min="1"
                                    />
                                )}
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
                                disabled={isUpdating || isRepartoFinalizado || isOptimizingRoute || !parada.envio_id}
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

    