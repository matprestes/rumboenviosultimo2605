
"use client";

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building, CheckCircle, ClipboardEdit, InfoIcon, Loader2, MapPin, Package, Play, RefreshCw, Route, Sparkles, Truck, User, XCircle, CalendarIcon as IconCalendar } from "lucide-react";
import { getRepartoByIdAction, updateRepartoEstadoAction, updateParadaEstadoAction, reorderParadasAction } from '@/actions/reparto-actions';
import type { RepartoConDetalles, ParadaConDetalles, EstadoReparto, EstadoEnvio, MappableStop, Empresa, EnvioConDetalles, Cliente } from '@/lib/schemas';
import { EstadoRepartoEnum, EstadoEnvioEnum, tipoParadaEnum } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid } from 'date-fns';
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
  
  // Use React.use to correctly handle params that might be a Promise
  const resolvedParams = React.use(paramsProp);
  const repartoId = resolvedParams.id;

  const [reparto, setReparto] = React.useState<(RepartoConDetalles & { paradas_reparto: ParadaConDetalles[] }) | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [paradasEdit, setParadasEdit] = React.useState<ParadaConDetalles[]>([]);
  const [totalDistance, setTotalDistance] = React.useState<number | null>(null);
  const [googleMaps, setGoogleMaps] = React.useState<typeof google | null>(null);
  const [isMapsApiReady, setIsMapsApiReady] = React.useState(false);
  const [isOptimizingRoute, setIsOptimizingRoute] = React.useState(false);

  const empresaOrigenParaMapa = React.useMemo(() => {
    if (!reparto || !reparto.empresas) return undefined;
    if (reparto.empresas.latitud != null && reparto.empresas.longitud != null) {
        return {
            id: reparto.empresas.id, // This is empresa_id, not a parada_id
            latitud: reparto.empresas.latitud,
            longitud: reparto.empresas.longitud,
            nombre: reparto.empresas.nombre,
            direccion: reparto.empresas.direccion,
        };
    }
    return undefined;
  }, [reparto]);


  const fetchRepartoDetails = React.useCallback(async () => {
    if (!repartoId) return;
    setIsLoading(true);
    try {
      const { reparto: data, error } = await getRepartoByIdAction(repartoId);
      if (error || !data) {
        toast({ title: "Error al Cargar Reparto", description: error || "Reparto no encontrado.", variant: "destructive" });
        router.push('/repartos');
        return;
      }
      
      let repartoDataWithDate = { ...data };
      if (data.fecha_reparto && typeof data.fecha_reparto === 'string') {
        const parsedDate = parseISO(data.fecha_reparto as string); 
        if (isValid(parsedDate)) {
          repartoDataWithDate.fecha_reparto = parsedDate;
        } else {
          console.warn("Invalid date string for fecha_reparto in fetchRepartoDetails:", data.fecha_reparto);
          repartoDataWithDate.fecha_reparto = new Date(); 
        }
      } else if (data.fecha_reparto && !isValid(new Date(data.fecha_reparto))) {
        console.warn("Invalid Date object received for fecha_reparto:", data.fecha_reparto);
        repartoDataWithDate.fecha_reparto = new Date();
      }
      
      let processedParadas = [...(repartoDataWithDate.paradas_reparto || [])];
      const isLote = !!repartoDataWithDate.empresa_asociada_id;
      const tempEmpresaOrigen = repartoDataWithDate.empresas?.latitud != null && repartoDataWithDate.empresas?.longitud != null ? {
        id: repartoDataWithDate.empresas.id, // Empresa ID
        latitud: repartoDataWithDate.empresas.latitud,
        longitud: repartoDataWithDate.empresas.longitud,
        nombre: repartoDataWithDate.empresas.nombre,
        direccion: repartoDataWithDate.empresas.direccion,
      } : undefined;

      let fixedPickupStopExists = processedParadas.some(p => !p.envio_id && p.descripcion_parada?.toLowerCase().includes('retiro'));
      let fixedPickupStop: ParadaConDetalles | undefined = processedParadas.find(p => !p.envio_id && p.descripcion_parada?.toLowerCase().includes('retiro'));

      if (isLote && !fixedPickupStop && tempEmpresaOrigen) {
          const virtualPickupStop: ParadaConDetalles = {
            id: `virtual-pickup-${repartoDataWithDate.id!}`, 
            reparto_id: repartoDataWithDate.id!,
            envio_id: null, 
            descripcion_parada: `Retiro en ${tempEmpresaOrigen.nombre || 'empresa asociada'}`,
            orden_visita: 0, // Explicitly set to 0 for the virtual/main pickup
            estado_parada: 'asignado',
            created_at: repartoDataWithDate.created_at || new Date().toISOString(),
            updated_at: repartoDataWithDate.updated_at || new Date().toISOString(),
            user_id: repartoDataWithDate.user_id || null,
            envios: null 
          };
          processedParadas.unshift(virtualPickupStop);
          fixedPickupStop = virtualPickupStop;
          fixedPickupStopExists = true;
      } else if (fixedPickupStop) {
        // Ensure existing pickup stop has orden_visita 0
        fixedPickupStop.orden_visita = 0;
      }
      
      let deliveryOrderCounter = 1;
      processedParadas = processedParadas.map(p => {
        if (p.id === fixedPickupStop?.id) { // If it's the fixed pickup stop
          return { ...p, orden_visita: 0 };
        }
        if (p.envio_id) { // Only re-number delivery stops
          return { ...p, orden_visita: deliveryOrderCounter++ };
        }
        return p; // Other non-delivery stops (if any in future) keep their order or are handled differently
      }).sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));
      
      setReparto({...repartoDataWithDate, paradas_reparto: processedParadas});
      setParadasEdit(processedParadas);

    } catch (err) {
        console.error("Error in fetchRepartoDetails: ", err);
        toast({title: "Error", description: "No se pudieron cargar los detalles del reparto.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }, [repartoId, toast, router]);

  React.useEffect(() => {
    getGoogleMapsApi()
      .then((api) => {
        setGoogleMaps(api);
        setIsMapsApiReady(true);
      })
      .catch((error) => {
        console.error("Error loading Google Maps API for RepartoDetallePage:", error);
        toast({ title: "Error de Mapa", description: `No se pudo cargar Google Maps. Funcionalidades de mapa y optimización estarán limitadas. Detalle: ${(error as Error).message}`, variant: "destructive" });
      });
  }, [toast]);

  React.useEffect(() => {
    if (repartoId) { 
      fetchRepartoDetails();
    }
  }, [repartoId, fetchRepartoDetails]);

  const calculateTotalDistance = React.useCallback(() => {
    if (!isMapsApiReady || !googleMaps || !reparto || paradasEdit.length === 0) {
      setTotalDistance(null);
      return;
    }
  
    let currentTotalDistance = 0;
    const pathPoints: google.maps.LatLngLiteral[] = [];
    const sortedParadasForDistance = [...paradasEdit].sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));
    const isLote = !!reparto.empresa_asociada_id;

    if (empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
      pathPoints.push({ lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud });
    }
  
    sortedParadasForDistance.forEach(parada => {
      if (parada.envio_id && parada.envios) { // Only delivery stops
        if (isLote) { // For Lote, path is from Empresa to Destino_N
             if (parada.envios.latitud_destino != null && parada.envios.longitud_destino != null) {
                pathPoints.push({ lat: parada.envios.latitud_destino, lng: parada.envios.longitud_destino });
            }
        } else { // For Individual, path is Origen_Envio_N -> Destino_Envio_N
            if (parada.envios.latitud_origen != null && parada.envios.longitud_origen != null) {
                pathPoints.push({ lat: parada.envios.latitud_origen, lng: parada.envios.longitud_origen });
            }
            if (parada.envios.latitud_destino != null && parada.envios.longitud_destino != null) {
                pathPoints.push({ lat: parada.envios.latitud_destino, lng: parada.envios.longitud_destino });
            }
        }
      }
    });
  
    const uniquePathPoints = pathPoints.filter((point, index, self) =>
        index === self.findIndex((p) => p.lat === point.lat && p.lng === point.lng)
    );

    if (uniquePathPoints.length < 2) {
      setTotalDistance(0);
      return;
    }
  
    for (let i = 0; i < uniquePathPoints.length - 1; i++) {
      const from = new googleMaps.maps.LatLng(uniquePathPoints[i]);
      const to = new googleMaps.maps.LatLng(uniquePathPoints[i + 1]);
      currentTotalDistance += googleMaps.maps.geometry.spherical.computeDistanceBetween(from, to);
    }
    setTotalDistance(currentTotalDistance / 1000); 
  }, [isMapsApiReady, googleMaps, reparto, paradasEdit, empresaOrigenParaMapa]);


  React.useEffect(() => {
    calculateTotalDistance();
  }, [paradasEdit, calculateTotalDistance]); 
  
  const getEstadoDisplayName = (estadoValue?: EstadoReparto | EstadoEnvio | null) => {
    if (!estadoValue) return 'N/A';
    return estadoValue.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }
  
  const getEstadoBadgeVariant = (estado: EstadoReparto | EstadoEnvio | null | undefined): string => {
    switch (estado) {
      case 'entregado':
      case 'completado':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 border border-green-300 dark:border-green-600';
      case 'planificado':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100 border border-yellow-300 dark:border-yellow-600';
      case 'asignado':
         return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100 border border-blue-300 dark:border-blue-600';
      case 'en_curso': 
      case 'en_camino':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-700 dark:text-orange-100 border border-orange-300 dark:border-orange-600';
      case 'no_entregado':
      case 'cancelado':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 border border-red-300 dark:border-red-600';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600';
    }
  };
  
  const handleRepartoEstadoChange = async (nuevoEstado: EstadoReparto) => {
    if (!repartoId || !reparto) return;
    if (reparto.estado === 'completado' || reparto.estado === 'cancelado') {
      toast({title: "Acción no permitida", description: "El reparto ya está finalizado o cancelado.", variant: "destructive"});
      return;
    }
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
    if (!repartoId || !reparto) return;
     if (reparto.estado === 'completado' || reparto.estado === 'cancelado') {
      toast({title: "Acción no permitida", description: "El reparto ya está finalizado o cancelado.", variant: "destructive"});
      return;
    }
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
        if (p.id === paradaId && p.envio_id && (nuevoOrden === null || (nuevoOrden >= 1))) { 
          return { ...p, orden_visita: nuevoOrden }; 
        }
        return p;
      })
    );
  };

  const handleSaveOrden = async () => {
    if (!reparto || !repartoId || isRepartoFinalizado) return;

    const deliveryStopsToReorder = paradasEdit.filter(p => 
        p.envio_id && p.id && !p.id.startsWith('virtual-pickup-') // Ensure it's a delivery and not virtual
    );
    
    if (deliveryStopsToReorder.some(p => p.orden_visita === null || p.orden_visita === undefined || p.orden_visita <= 0)) {
      toast({ title: "Error de Orden", description: "Todas las paradas de entrega deben tener un número de orden positivo.", variant: "destructive"});
      return;
    }
    const orderNumbers = deliveryStopsToReorder.map(p => p.orden_visita as number);
    const hasDuplicates = new Set(orderNumbers).size !== orderNumbers.length;

    if (hasDuplicates) {
      toast({ title: "Error de Orden", description: "Los números de orden de las paradas de entrega deben ser únicos y mayores a 0.", variant: "destructive"});
      return;
    }
    
    const idsForAction = deliveryStopsToReorder
      .sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity)) 
      .map(p => p.id!); 

    if (idsForAction.length === 0) {
      const hadAnyProcessableDeliveries = paradasEdit.some(p => p.envio_id && p.id && !p.id.startsWith('virtual-pickup-'));
      if (hadAnyProcessableDeliveries) {
         toast({ title: "Sin cambios válidos", description: "No hay paradas de entrega con orden válido para guardar.", variant: "default" });
      } else {
        toast({ title: "Sin paradas de entrega", description: "No hay envíos asignados a este reparto para ordenar.", variant: "default" });
      }
      return;
    }

    setIsUpdating(true);
    const result = await reorderParadasAction(repartoId, idsForAction); 
    if (result.success) {
      toast({ title: "Orden de Paradas Actualizado", description: "El orden de las paradas ha sido guardado." });
      fetchRepartoDetails();
    } else {
      toast({ title: "Error al Guardar Orden", description: result.error, variant: "destructive" });
    }
    setIsUpdating(false);
  };

  const handleOptimizeRoute = async () => {
    if (!isMapsApiReady || !googleMaps || !reparto || !repartoId || isRepartoFinalizado || isOptimizingRoute) {
        toast({ title: "No se puede optimizar", description: "Verifique el estado del reparto, la disponibilidad de la API de mapas o si ya se está optimizando.", variant: "default" });
        return;
    }
    setIsOptimizingRoute(true);

    const isLote = !!reparto.empresa_asociada_id;
    let originMappableStop: MappableStop | null = null;

    const fixedPickupStopInParadasEdit = paradasEdit.find(p => p.orden_visita === 0 && !p.envio_id && p.id?.startsWith('virtual-pickup-'));

    if (empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
        originMappableStop = {
            id: fixedPickupStopInParadasEdit?.id || 'ORIGIN_EMPRESA_ANCHOR', // Use real ID if virtual stop exists, else anchor
            originalParadaId: fixedPickupStopInParadasEdit?.id || 'ORIGIN_EMPRESA_ANCHOR',
            location: { lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud },
            type: 'pickup_empresa',
            displayName: `Retiro en ${empresaOrigenParaMapa.nombre || 'Empresa'}`
        };
    } else if (!isLote) { // Individual Reparto: try to find the first physical pickup
        const firstDeliveryStopWithOriginCoords = paradasEdit
            .filter(p => p.envio_id && p.envios?.latitud_origen != null && p.envios?.longitud_origen != null)
            .sort((a,b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity))[0];
        if (firstDeliveryStopWithOriginCoords && firstDeliveryStopWithOriginCoords.envios) {
             originMappableStop = {
                id: firstDeliveryStopWithOriginCoords.id! + '_pickup_as_origin',
                originalParadaId: firstDeliveryStopWithOriginCoords.id!,
                envioId: firstDeliveryStopWithOriginCoords.envio_id,
                type: 'pickup_envio',
                location: { lat: firstDeliveryStopWithOriginCoords.envios.latitud_origen!, lng: firstDeliveryStopWithOriginCoords.envios.longitud_origen! },
                displayName: `Origen para E${firstDeliveryStopWithOriginCoords.orden_visita}: ${firstDeliveryStopWithOriginCoords.envios.direccion_origen}`
            };
        }
    }
    
    if (!originMappableStop) {
      toast({ title: "Error de Origen", description: "No se puede optimizar sin una parada de empresa válida o un punto de inicio claro para el reparto.", variant: "destructive" });
      setIsOptimizingRoute(false);
      return;
    }

    let deliveryPointsToOptimize: MappableStop[] = [];
    if (isLote) {
      deliveryPointsToOptimize = paradasEdit
        .filter(p => p.envio_id && p.envios?.latitud_destino != null && p.envios?.longitud_destino != null && p.id !== fixedPickupStopInParadasEdit?.id)
        .map(p => ({
          id: p.id!,
          originalParadaId: p.id!,
          envioId: p.envio_id,
          type: 'delivery_envio',
          location: { lat: p.envios!.latitud_destino!, lng: p.envios!.longitud_destino! },
          displayName: `Entrega E${p.orden_visita}: ${p.envios!.direccion_destino}`
        }));
      if (deliveryPointsToOptimize.length < 1) { // Need at least 1 delivery for origin -> delivery
        toast({ title: "Pocas Paradas", description: "Se necesita al menos una parada de cliente con ubicación válida para optimizar (además del retiro en empresa).", variant: "default" });
        setIsOptimizingRoute(false);
        return;
      }
    } else { // Individual Reparto
        paradasEdit.forEach(p => {
            if (p.envio_id && p.envios) {
                // Only add as a point if it's not the one already chosen as originMappableStop
                if (p.envios.latitud_origen != null && p.envios.longitud_origen != null && p.id !== originMappableStop?.originalParadaId) {
                    deliveryPointsToOptimize.push({
                        id: p.id! + '_pickup', originalParadaId: p.id!, envioId: p.envio_id, type: 'pickup_envio',
                        location: { lat: p.envios.latitud_origen, lng: p.envios.longitud_origen },
                        displayName: `Retiro E${p.orden_visita}: ${p.envios.direccion_origen}`
                    });
                }
                if (p.envios.latitud_destino != null && p.envios.longitud_destino != null) {
                     deliveryPointsToOptimize.push({
                        id: p.id! + '_delivery', originalParadaId: p.id!, envioId: p.envio_id, type: 'delivery_envio',
                        location: { lat: p.envios.latitud_destino, lng: p.envios.longitud_destino },
                        displayName: `Entrega E${p.orden_visita}: ${p.envios.direccion_destino}`
                    });
                }
            }
        });
         if (deliveryPointsToOptimize.length < 1) { // After origin, need at least one more point
            toast({ title: "Pocas Paradas", description: "Se necesita al menos un envío completo (retiro y entrega) con ubicaciones válidas para optimizar.", variant: "default" });
            setIsOptimizingRoute(false);
            return;
        }
    }
    
    const pointsForGoogleApi = [originMappableStop, ...deliveryPointsToOptimize];
    if (pointsForGoogleApi.length < 2) {
      toast({ title: "Puntos Insuficientes", description: "No hay suficientes puntos para optimizar la ruta (mínimo 2: origen y un destino).", variant: "destructive" });
      setIsOptimizingRoute(false);
      return;
    }
    
    try {
      const optimizedStopsFromApi = await optimizeDeliveryRoute(pointsForGoogleApi);
      
      if (optimizedStopsFromApi && optimizedStopsFromApi.length > 0) {
        const originalParadasMap = new Map(paradasEdit.map(p => [p.id!, p]));
        let newOrderedParadasEdit: ParadaConDetalles[] = [];
        const processedParadaIdsInOptimizedOrder = new Set<string>();

        // Always add the identified fixed origin (if it's a real parada_reparto) first
        const identifiedFixedPickupStop = paradasEdit.find(p => p.id === originMappableStop?.originalParadaId && !p.envio_id);
        if (identifiedFixedPickupStop) {
            newOrderedParadasEdit.push({ ...identifiedFixedPickupStop, orden_visita: 0 });
            processedParadaIdsInOptimizedOrder.add(identifiedFixedPickupStop.id!);
        }


        optimizedStopsFromApi.forEach(optimizedPoint => {
            // Skip if it was the synthetic anchor for empresa origin or if it's the fixed pickup already added
            if (optimizedPoint.id === 'ORIGIN_EMPRESA_ANCHOR' || (identifiedFixedPickupStop && optimizedPoint.originalParadaId === identifiedFixedPickupStop.id)) {
                return;
            }

            const originalParada = originalParadasMap.get(optimizedPoint.originalParadaId);
            if (originalParada && !processedParadaIdsInOptimizedOrder.has(originalParada.id!)) {
                 if (isLote) { // For lote, we only care about delivery stops (envio_id present)
                    if (originalParada.envio_id) {
                        newOrderedParadasEdit.push({ ...originalParada });
                        processedParadaIdsInOptimizedOrder.add(originalParada.id!);
                    }
                 } else { // For individual, each optimizedPoint corresponds to a part of an envio. The order is of envios.
                     // We need to add the *entire* originalParada object once per envioId
                    if (originalParada.envio_id && !newOrderedParadasEdit.some(p => p.id === originalParada.id)) {
                         newOrderedParadasEdit.push({ ...originalParada });
                         processedParadaIdsInOptimizedOrder.add(originalParada.id!); // Mark this ParadaReparto as processed
                    }
                 }
            }
        });
        
        // Add any paradas from paradasEdit that were not part of the optimization (e.g., no coords, or not optimizable)
        // or weren't re-added from optimizedStops (shouldn't happen if logic above is correct for mapping back)
        paradasEdit.forEach(originalParada => {
            if (!processedParadaIdsInOptimizedOrder.has(originalParada.id!)) {
                if (!newOrderedParadasEdit.some(p => p.id === originalParada.id)) { // Ensure not already added by mistake
                    newOrderedParadasEdit.push({ ...originalParada });
                }
            }
        });
        
        let currentOrder = 0;
        const finalParadas = newOrderedParadasEdit.map(p => {
            const newOrder = (p.envio_id || p.id === identifiedFixedPickupStop?.id) ? currentOrder : null; // Keep non-delivery stops (if any other than fixed) with null order or handle differently
            if (p.envio_id || p.id === identifiedFixedPickupStop?.id) {
                currentOrder++;
            }
            return { ...p, orden_visita: newOrder };
        });


        setParadasEdit(finalParadas.sort((a,b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity)));
        toast({ title: "Ruta Optimizada", description: "El orden de las paradas ha sido actualizado. Revise y guarde los cambios." });
      } else {
        toast({ title: "Error de Optimización", description: "No se pudo obtener una ruta optimizada de Google Maps.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error en handleOptimizeRoute:", error);
      toast({ title: "Error de Optimización", description: error.message || "Ocurrió un error desconocido al optimizar.", variant: "destructive" });
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

  const displayParadas = [...paradasEdit].sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));
  const isLoteRepartoForUI = !!reparto.empresa_asociada_id;
  
  const deliveryParadasParaResumen = displayParadas.filter(p => p.envio_id && !p.id?.startsWith('virtual-pickup-'));
  const resumenParadas = {
    total: deliveryParadasParaResumen.length,
    pendientes: deliveryParadasParaResumen.filter(p => p.estado_parada === 'asignado' || p.estado_parada === 'pendiente_asignacion').length,
    entregadas: deliveryParadasParaResumen.filter(p => p.estado_parada === 'entregado').length,
    noEntregadas: deliveryParadasParaResumen.filter(p => p.estado_parada === 'no_entregado').length,
    canceladas: deliveryParadasParaResumen.filter(p => p.estado_parada === 'cancelado').length,
  };
  const isRepartoFinalizado = reparto.estado === 'completado' || reparto.estado === 'cancelado';
  
  let canOptimizeCheck = !isRepartoFinalizado && isMapsApiReady && googleMaps;
  if (canOptimizeCheck) {
    const validOriginExists = empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null;
    const optimizableDeliveries = paradasEdit.filter(p => 
        p.envio_id && 
        p.envios?.latitud_destino != null && 
        p.envios?.longitud_destino != null &&
        (!isLoteRepartoForUI || // If individual, no company check needed for this specific stop
            (isLoteRepartoForUI && reparto.empresa_asociada_id && 
            (p.envios?.empresa_origen_id === reparto.empresa_asociada_id || p.envios?.clientes?.empresa_id === reparto.empresa_asociada_id))
            )
    );
    
    if (isLoteRepartoForUI) {
        canOptimizeCheck = validOriginExists && optimizableDeliveries.length >= 2;
    } else { // Individual
        const allPoints = [];
        if (optimizableDeliveries.length > 0 && optimizableDeliveries[0].envios?.latitud_origen != null && optimizableDeliveries[0].envios?.longitud_origen != null){
            allPoints.push("origin_envio_1");
        }
        optimizableDeliveries.forEach(p => {
            if(p.envios?.latitud_origen != null && p.envios?.longitud_origen != null && p.id !== optimizableDeliveries[0]?.id) allPoints.push(`pickup_${p.id}`);
            if(p.envios?.latitud_destino != null && p.envios?.longitud_destino != null) allPoints.push(`delivery_${p.id}`);
        });
        // For Google's optimizeWaypoints to work, we need at least 3 points (origin, 1 waypoint, destination).
        // If only 1 envío, points = [pickup1, delivery1]. optimizeDeliveryRoute returns as is.
        // If 2 envíos, points = [pickup1, delivery1, pickup2, delivery2]. optimizeDeliveryRoute takes p1 as origin, d2 as dest, d1,p2 as waypoints.
        canOptimizeCheck = allPoints.length >= 3; 
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/repartos"><ArrowLeft className="h-5 w-5"/></Link>
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <ClipboardEdit size={32} /> Detalle del Reparto
          </h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button onClick={handleOptimizeRoute} variant="outline" size="sm" disabled={!canOptimizeCheck || isLoading || isUpdating || isOptimizingRoute} className="min-w-[160px]">
                {isOptimizingRoute ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Sparkles size={14} className="mr-2"/>} Optimizar Ruta (IA)
            </Button>
            <Button onClick={() => {setIsUpdating(true); fetchRepartoDetails().finally(() => setIsUpdating(false));}} variant="outline" size="sm" disabled={isLoading || isUpdating || isOptimizingRoute} className="min-w-[120px]">
                <RefreshCw className={`mr-2 h-4 w-4 ${(isLoading || isUpdating || isOptimizingRoute) ? 'animate-spin' : ''}`} /> Refrescar
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-xl shadow-lg border border-border/50">
                <CardHeader className="border-b border-border/50 p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div>
                    <CardTitle className="text-lg md:text-xl font-semibold text-primary">ID Reparto: {reparto.id?.substring(0, 8)}...</CardTitle>
                    <CardDescription className="text-xs md:text-sm text-muted-foreground mt-1">
                        Fecha: {reparto.fecha_reparto && isValid(new Date(reparto.fecha_reparto)) ? format(new Date(reparto.fecha_reparto), "PPP", { locale: es }) : 'N/A'}
                    </CardDescription>
                    </div>
                    <Badge variant="outline" className={cn("text-xs md:text-sm font-semibold px-2.5 py-1 self-start sm:self-center", getEstadoBadgeVariant(reparto.estado))}>
                    {getEstadoDisplayName(reparto.estado)}
                    </Badge>
                </div>
                </CardHeader>
                <CardContent className="pt-4 md:pt-6 p-4 md:p-6 space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <p className="flex items-center gap-2"><Truck size={18} className="text-muted-foreground"/><strong>Repartidor:</strong> {reparto.repartidores?.nombre || 'N/A'}</p>
                    <p className="flex items-center gap-2"><Building size={18} className="text-muted-foreground"/><strong>Empresa:</strong> {reparto.empresas?.nombre || (isLoteRepartoForUI ? 'Empresa no encontrada' : 'Individual / Varios')}</p>
                  </div>
                  {reparto.notas && <p className="flex items-start gap-2"><InfoIcon size={18} className="text-muted-foreground mt-0.5"/><strong>Notas del Reparto:</strong> <span className="text-muted-foreground">{reparto.notas}</span></p>}
                
                  {!isRepartoFinalizado && (
                    <div className="flex gap-2 flex-wrap pt-4 border-t border-border/50 mt-4">
                        {reparto.estado === 'planificado' && 
                        <Button onClick={() => handleRepartoEstadoChange('en_curso')} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isUpdating ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Play size={16} className="mr-2"/>} Iniciar Reparto
                        </Button>}
                        {reparto.estado === 'en_curso' && 
                        <Button onClick={() => handleRepartoEstadoChange('completado')} disabled={isUpdating} className="bg-green-600 hover:bg-green-700 text-white">
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

            <Card className="rounded-xl shadow-lg border border-border/50">
                <CardHeader className="border-b border-border/50 p-4 md:p-6">
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-semibold text-primary"><MapPin size={24} /> Mapa del Reparto</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4 p-4 md:p-6">
                    <div className="h-[350px] sm:h-[400px] md:h-[500px] rounded-md overflow-hidden border border-border shadow-inner bg-muted/30">
                       <RepartoMapComponent 
                            paradas={paradasEdit} 
                            empresaOrigen={empresaOrigenParaMapa}
                            repartoId={repartoId!}
                            isLoteReparto={isLoteRepartoForUI}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs md:text-sm p-3 md:p-4 bg-muted/70 rounded-lg border border-border/50">
                        <div className="text-center sm:text-left"><strong>Total Entregas:</strong> <span className="font-semibold text-primary">{reparto ? resumenParadas.total : 'N/A'}</span></div>
                        <div className="text-center sm:text-left"><strong>Distancia Estimada:</strong> <span className="font-semibold text-primary">{reparto && isMapsApiReady ? (totalDistance !== null ? `${totalDistance.toFixed(2)} km` : 'Calculando...') : 'Mapa no disp.'}</span></div>
                        <div className="text-center sm:text-left"><strong>Tiempo Estimado:</strong> <span className="font-semibold text-primary text-muted-foreground">N/A</span></div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1">
            <Card className="rounded-xl shadow-lg border border-border/50 h-full flex flex-col">
                <CardHeader className="border-b border-border/50 p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle className="text-lg md:text-xl font-semibold text-primary">Paradas ({deliveryParadasParaResumen.length} entregas)</CardTitle>
                    {!isRepartoFinalizado && (
                      <Button onClick={handleSaveOrden} disabled={isUpdating || isOptimizingRoute || isLoading} size="sm" className="w-full sm:w-auto">
                        {(isUpdating || isOptimizingRoute || isLoading) ? <Loader2 className="animate-spin mr-1 h-4 w-4"/> : <ClipboardEdit size={14} className="mr-1"/>} Guardar Orden
                      </Button>
                    )}
                </div>
                <CardDescription className="mt-1 text-xs md:text-sm">Gestiona el orden y estado de cada parada.</CardDescription>
                 <div className="mt-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-muted-foreground">
                    <span>Entregadas: {reparto ? resumenParadas.entregadas : 0}</span>
                    <span>Pendientes: {reparto ? resumenParadas.pendientes : 0}</span>
                    <span>No Ent.: {reparto ? resumenParadas.noEntregadas : 0}</span>
                    <span>Cancel.: {reparto ? resumenParadas.canceladas : 0}</span>
                </div>
                </CardHeader>
                <CardContent className="flex-grow overflow-hidden p-0">
                {displayParadas.length === 0 ? ( 
                    <p className="text-muted-foreground text-center py-10 px-4">Este reparto no tiene paradas asignadas.</p>
                ) : (
                    <ScrollArea className="h-[calc(100vh-12rem)] md:h-[calc(100vh-20rem)] lg:h-auto lg:max-h-[calc(100vh-22rem)]">
                    <Table className="text-xs sm:text-sm">
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px] px-2 py-2 text-center sticky top-0 bg-card z-10">Orden</TableHead>
                            <TableHead className="px-2 py-2 sticky top-0 bg-card z-10">Destino/Descripción</TableHead>
                            <TableHead className="w-[150px] px-2 py-2 sticky top-0 bg-card z-10">Estado</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {displayParadas.map((parada) => (
                            <TableRow key={parada.id} className={cn(!parada.envio_id && "bg-muted/30 hover:bg-muted/40")}>
                            <TableCell className="px-2 py-2 text-center align-top">
                                {(!parada.envio_id && (parada.orden_visita === 0 || parada.id?.startsWith('virtual-pickup-'))) ? (
                                    <Badge variant="outline" className="font-semibold text-muted-foreground border-muted-foreground/50 text-xs px-1.5 py-0.5">Origen</Badge>
                                ) : (
                                    <Input 
                                        type="number"
                                        value={parada.orden_visita ?? ""} 
                                        onChange={(e) => handleOrdenChange(parada.id!, e.target.value)}
                                        className="w-12 sm:w-14 h-8 text-center px-1 text-xs"
                                        disabled={isRepartoFinalizado || isUpdating || isOptimizingRoute || isLoading || (!parada.envio_id)}
                                        min={parada.envio_id ? "1" : "0"}
                                    />
                                )}
                            </TableCell>
                            <TableCell className="px-2 py-2 align-top">
                                <div className="flex items-start gap-1.5">
                                <MapPin size={16} className={cn("mt-0.5 shrink-0", parada.envio_id ? "text-red-500" : "text-blue-500")}/> 
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm leading-tight">
                                        {parada.envio_id && parada.envios ? parada.envios?.direccion_destino : parada.descripcion_parada}
                                    </span>
                                    {parada.envio_id && parada.envios && (
                                        <>
                                          <span className="text-xs text-muted-foreground mt-0.5">
                                            ID Env: {parada.envio_id.substring(0,8)}... | 
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
                                     {parada.notas_parada && <span className="text-xs text-blue-700 dark:text-blue-400 mt-1 block">Nota P.: {parada.notas_parada}</span>}
                                     {parada.envio_id && (parada.envios as EnvioConDetalles)?.notas_conductor && <span className="text-xs text-orange-700 dark:text-orange-400 mt-1 block">Nota E.: {(parada.envios as EnvioConDetalles)?.notas_conductor}</span>}
                                </div>
                                </div>
                            </TableCell>
                            <TableCell className="px-2 py-2 align-top">
                                {(!parada.envio_id && (parada.orden_visita === 0 || parada.id?.startsWith('virtual-pickup-'))) ? (
                                    <Badge variant="outline" className="border-muted-foreground/50 text-xs">N/A (Retiro)</Badge>
                                ) : (
                                <Select
                                value={parada.estado_parada || undefined}
                                onValueChange={(value) => handleParadaEstadoChange(parada.id!, value as EstadoEnvio, parada.envio_id || null)}
                                disabled={isUpdating || isRepartoFinalizado || isOptimizingRoute || isLoading || !parada.envio_id }
                                >
                                <SelectTrigger className={cn("h-8 text-xs", getEstadoBadgeVariant(parada.estado_parada))}>
                                    <SelectValue placeholder="Estado..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {EstadoEnvioEnum.options
                                        .filter(e => e !== 'pendiente_asignacion') 
                                        .map(estado => ( 
                                    <SelectItem key={estado} value={estado} className="text-xs">{getEstadoDisplayName(estado)}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                )}
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

    