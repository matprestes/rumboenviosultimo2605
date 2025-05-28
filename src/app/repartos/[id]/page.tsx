
"use client";

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building, CheckCircle, ClipboardEdit, InfoIcon, Loader2, MapPin, Package, Play, RefreshCw, Route, Sparkles, Truck, User, XCircle, CalendarIcon as IconCalendar } from "lucide-react";
import { getRepartoByIdAction, updateRepartoEstadoAction, updateParadaEstadoAction, reorderParadasAction } from '@/actions/reparto-actions';
import type { RepartoConDetalles, ParadaConDetalles, EstadoReparto, EstadoEnvio, MappableStop, Empresa, Cliente, EnvioConDetalles } from '@/lib/schemas';
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
import { cn } from "@/lib/utils";
import { getGoogleMapsApi, optimizeDeliveryRoute } from '@/services/google-maps-service';

interface RepartoDetallePageProps {
  params: { id: string } | Promise<{ id: string }>;
}

export default function RepartoDetallePage({ params: paramsProp }: RepartoDetallePageProps) {
  const { toast } = useToast();
  const router = useRouter();
  
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

  const isLoteReparto = React.useMemo(() => !!reparto?.empresa_asociada_id, [reparto]);

  const empresaOrigenParaMapa = React.useMemo(() => {
    if (!reparto || !reparto.empresas) return undefined;
    if (reparto.empresas.latitud != null && reparto.empresas.longitud != null) {
        return {
            id: reparto.empresas.id,
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
    setParadasEdit([]);
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
          repartoDataWithDate.fecha_reparto = new Date(); 
        }
      } else if (data.fecha_reparto && !isValid(new Date(data.fecha_reparto))) {
        repartoDataWithDate.fecha_reparto = new Date();
      }
      
      let processedParadas = [...(repartoDataWithDate.paradas_reparto || [])];
      const currentIsLoteReparto = !!repartoDataWithDate.empresa_asociada_id;
      const currentEmpresaOrigen = repartoDataWithDate.empresas;
      let companyPickupStop: ParadaConDetalles | undefined = undefined;

      // Ensure a "Retiro en empresa" stop exists for lote repartos, potentially virtual
      if (currentIsLoteReparto && currentEmpresaOrigen?.latitud != null && currentEmpresaOrigen?.longitud != null) {
        companyPickupStop = processedParadas.find(p => !p.envio_id && p.descripcion_parada?.toLowerCase().includes('retiro'));
        if (companyPickupStop) {
          // If it exists, ensure its order is 0
          companyPickupStop = { ...companyPickupStop, orden_visita: 0 };
          processedParadas = processedParadas.filter(p => p.id !== companyPickupStop!.id); // Remove and re-add
          processedParadas.unshift(companyPickupStop);
        } else {
          // Create a virtual pickup stop if none explicitly exists in paradas_reparto for a lote
          companyPickupStop = {
            id: `virtual-pickup-${repartoDataWithDate.id!}`,
            reparto_id: repartoDataWithDate.id!,
            envio_id: null, 
            descripcion_parada: `Retiro en ${currentEmpresaOrigen.nombre || 'Empresa Asociada'} (${currentEmpresaOrigen.direccion || 'N/A'})`,
            orden_visita: 0, // Explicitly 0 for origin
            estado_parada: repartoDataWithDate.estado === 'planificado' ? 'asignado' : 'en_camino',
            created_at: repartoDataWithDate.created_at || new Date().toISOString(),
            updated_at: repartoDataWithDate.updated_at || new Date().toISOString(),
            user_id: repartoDataWithDate.user_id || null,
            envios: null, 
          };
          processedParadas.unshift(companyPickupStop);
        }
      }
      
      // Renumber delivery stops starting from 1
      let deliveryOrderCounter = 1;
      processedParadas = processedParadas.map(p => {
        if (companyPickupStop && p.id === companyPickupStop.id) {
          return { ...p, orden_visita: 0 };
        } else if (p.envio_id) { // Only assign order to actual delivery stops
          return { ...p, orden_visita: deliveryOrderCounter++ };
        }
        return p; // Should only be the companyPickupStop if it reaches here without envio_id
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
    
    const sortedParadasForDistanceCalc = [...paradasEdit].sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));
    
    let lastPoint: google.maps.LatLngLiteral | null = null;

    if (isLoteReparto && empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
        lastPoint = { lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud };
        pathPoints.push(lastPoint);
    }
  
    sortedParadasForDistanceCalc.forEach(parada => {
      let currentStopCoords: google.maps.LatLngLiteral | null = null;
      
      if (parada.envio_id && parada.envios?.latitud_destino != null && parada.envios?.longitud_destino != null) {
        currentStopCoords = { lat: parada.envios.latitud_destino, lng: parada.envios.longitud_destino };
      } else if (!parada.envio_id && isLoteReparto && empresaOrigenParaMapa && parada.id?.startsWith('virtual-pickup-')) {
        // This is the company pickup, already handled as the starting lastPoint if isLoteReparto
        return; 
      } else if (!parada.envio_id && !isLoteReparto && parada.envios?.latitud_origen !=null && parada.envios?.longitud_origen != null){
        // For individual, if this "parada" actually represents the origin of an envío
        // This case is complex if paradasEdit only contains one entry per *envio* not per *stop*
        if(!lastPoint && parada.envios?.latitud_origen != null && parada.envios?.longitud_origen != null){
            lastPoint = { lat: parada.envios.latitud_origen, lng: parada.envios.longitud_origen };
            pathPoints.push(lastPoint);
        }
         // Then its destination
        if (parada.envios?.latitud_destino != null && parada.envios?.longitud_destino != null) {
            currentStopCoords = { lat: parada.envios.latitud_destino, lng: parada.envios.longitud_destino };
        }
      }

      if (currentStopCoords) {
        if (!lastPoint && !isLoteReparto) { // First point for individual, must be an origin
            const firstEnvioWithOrigin = sortedParadasForDistanceCalc.find(p => p.envio_id && p.envios?.latitud_origen != null && p.envios?.longitud_origen != null)?.envios;
            if(firstEnvioWithOrigin) {
                 lastPoint = { lat: firstEnvioWithOrigin.latitud_origen!, lng: firstEnvioWithOrigin.longitud_origen! };
                 pathPoints.push(lastPoint);
            }
        }
        if (lastPoint) { 
            if (lastPoint.lat !== currentStopCoords.lat || lastPoint.lng !== currentStopCoords.lng) {
                 pathPoints.push(currentStopCoords);
            }
        } else { 
            pathPoints.push(currentStopCoords);
        }
        lastPoint = currentStopCoords;
      }
    });
  
    const uniquePathPoints = pathPoints.filter((point, index, self) =>
        index === 0 || (point.lat !== self[index - 1].lat || point.lng !== self[index - 1].lng)
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
  }, [isMapsApiReady, googleMaps, reparto, paradasEdit, empresaOrigenParaMapa, isLoteReparto]);


  React.useEffect(() => {
    calculateTotalDistance();
  }, [paradasEdit, calculateTotalDistance]); 
  
  const getEstadoDisplayName = (estadoValue?: EstadoReparto | EstadoEnvio | null) => {
    if (!estadoValue) return 'N/A';
    return estadoValue.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }
  
  const getEstadoBadgeVariantClass = (estado: EstadoReparto | EstadoEnvio | null | undefined): string => {
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
        if (p.id === paradaId) {
          if (!p.envio_id && (p.id?.startsWith('virtual-pickup-') || p.orden_visita === 0)) {
            return { ...p, orden_visita: 0 }; 
          }
          if (p.envio_id && (nuevoOrden === null || (nuevoOrden >= 1))) { 
            return { ...p, orden_visita: nuevoOrden }; 
          }
        }
        return p;
      })
    );
  };

  const isRepartoFinalizado = reparto?.estado === 'completado' || reparto?.estado === 'cancelado';

  const handleSaveOrden = async () => {
    if (!reparto || !repartoId || isRepartoFinalizado) return;
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    const deliveryStopsToReorder = paradasEdit.filter(p => {
      return p.envio_id && p.id && uuidRegex.test(p.id);
    });
    
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
        const hadAnyDeliveries = paradasEdit.some(p => p.envio_id && p.id && uuidRegex.test(p.id));
        if (hadAnyDeliveries) {
             toast({ title: "Sin cambios válidos", description: "No hay paradas de entrega con orden válido para guardar.", variant: "default" });
        } else {
            toast({ title: "Sin paradas de entrega", description: "No hay envíos asignados a este reparto para ordenar.", variant: "default"});
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
    if (!isMapsApiReady || !googleMaps || !reparto || !repartoId || isRepartoFinalizado || isOptimizingRoute || isLoading) {
      toast({ title: "No se puede optimizar", description: "Verifique el estado del reparto, la carga de datos o la API de mapas.", variant: "default" });
      return;
    }

    setIsOptimizingRoute(true);
    let pointsToOptimize: MappableStop[] = [];
    let originMappableStop: MappableStop | undefined = undefined;
    
    const fixedPickupStopInParadasEdit = paradasEdit.find(p => !p.envio_id && (p.orden_visita === 0 || p.id?.startsWith('virtual-pickup-')));

    if (fixedPickupStopInParadasEdit && empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
        originMappableStop = {
            id: fixedPickupStopInParadasEdit.id!,
            originalParadaId: fixedPickupStopInParadasEdit.id!,
            type: 'pickup_empresa',
            location: { lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud },
            displayName: fixedPickupStopInParadasEdit.descripcion_parada || `Retiro en ${empresaOrigenParaMapa.nombre}`
        };
        pointsToOptimize.push(originMappableStop);
    } else if (isLoteReparto && empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
        originMappableStop = {
            id: 'ORIGIN_EMPRESA_ANCHOR', // Special ID for non-DB origin
            originalParadaId: 'ORIGIN_EMPRESA_ANCHOR',
            type: 'pickup_empresa',
            location: { lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud },
            displayName: `Retiro en ${empresaOrigenParaMapa.nombre}`
        };
        pointsToOptimize.push(originMappableStop);
    } else if (!isLoteReparto) {
        // For individual repartos, try to find the first delivery's origin as the starting point
        const firstValidDeliveryOrigin = paradasEdit.find(p => p.envio_id && p.envios?.latitud_origen != null && p.envios?.longitud_origen != null);
        if (firstValidDeliveryOrigin && firstValidDeliveryOrigin.envios) {
            originMappableStop = {
                id: firstValidDeliveryOrigin.id! + '_pickup_as_origin', // Make ID unique
                originalParadaId: firstValidDeliveryOrigin.id!,
                envioId: firstValidDeliveryOrigin.envio_id,
                type: 'pickup_envio',
                location: { lat: firstValidDeliveryOrigin.envios.latitud_origen!, lng: firstValidDeliveryOrigin.envios.longitud_origen! },
                displayName: `Origen E${firstValidDeliveryOrigin.orden_visita}: ${firstValidDeliveryOrigin.envios.direccion_origen}`
            };
            pointsToOptimize.push(originMappableStop);
        }
    }

    if (!originMappableStop) {
      toast({ title: "Error de Origen", description: "No se puede optimizar sin un punto de origen válido con coordenadas.", variant: "destructive" });
      setIsOptimizingRoute(false);
      return;
    }

    const optimizableDeliveryParadas = paradasEdit.filter(p => {
        if (!p.envio_id || p.envios?.latitud_destino == null || p.envios?.longitud_destino == null) return false;
        // If it's a lote reparto, only include paradas whose client belongs to the reparto's empresa (if this info is available)
        // For now, we assume if reparto.empresa_asociada_id exists, all its envios are for that empresa
        // Or, if it's an individual reparto, include all valid delivery stops
        if (isLoteReparto && reparto.empresa_asociada_id) {
            // This check might need adjustment based on how envios are linked to the lote empresa.
            // Assuming if an envio is in a lote reparto, it's implicitly for that empresa's clients.
            return true;
        }
        return !isLoteReparto; // For individual, all valid delivery stops are optimizable
    });


    optimizableDeliveryParadas.forEach(p => {
        // Don't re-add the origin if it was derived from a parada that's also a delivery (unlikely for lote)
        if (originMappableStop?.originalParadaId === p.id && originMappableStop.type === 'pickup_envio') {
            // If the origin was a pickup_envio, we still need its delivery_envio point
             if (p.envios?.latitud_destino != null && p.envios?.longitud_destino != null) {
                pointsToOptimize.push({
                    id: p.id! + '_delivery',
                    originalParadaId: p.id!,
                    envioId: p.envio_id,
                    type: 'delivery_envio',
                    location: { lat: p.envios.latitud_destino, lng: p.envios.longitud_destino },
                    displayName: `Entrega E${p.orden_visita}: ${p.envios.direccion_destino}`
                });
            }
        } else if (p.envios?.latitud_destino != null && p.envios?.longitud_destino != null) {
            // For individual repartos, each "parada" (envio) has a pickup and delivery
            if (!isLoteReparto && p.envios.latitud_origen != null && p.envios.longitud_origen != null && originMappableStop?.originalParadaId !== p.id) {
                 pointsToOptimize.push({
                    id: p.id! + '_pickup',
                    originalParadaId: p.id!,
                    envioId: p.envio_id,
                    type: 'pickup_envio',
                    location: { lat: p.envios.latitud_origen, lng: p.envios.longitud_origen },
                    displayName: `Retiro E${p.orden_visita}: ${p.envios.direccion_origen}`
                });
            }
            pointsToOptimize.push({
                id: p.id! + '_delivery',
                originalParadaId: p.id!,
                envioId: p.envio_id,
                type: 'delivery_envio',
                location: { lat: p.envios.latitud_destino, lng: p.envios.longitud_destino },
                displayName: `Entrega E${p.orden_visita}: ${p.envios.direccion_destino}`
            });
        }
    });
    
    // Deduplicate pointsToOptimize by 'id' before sending to API
    const uniquePointsToOptimize = Array.from(new Map(pointsToOptimize.map(item => [item.id, item])).values());

    if (uniquePointsToOptimize.length < (isLoteReparto ? 3 : 2)) { // Lote needs Origin + at least 2 deliveries. Individual needs at least 2 points (e.g. one pickup & one delivery for a single envio).
        toast({ title: "Paradas Insuficientes", description: `Se necesitan al menos ${isLoteReparto ? 'dos paradas de cliente' : 'un envío completo (retiro y entrega)'} con ubicación válida para optimizar.`, variant: "destructive" });
        setIsOptimizingRoute(false);
        return;
    }

    try {
      const optimizedStopsFromApi = await optimizeDeliveryRoute(uniquePointsToOptimize);

      if (optimizedStopsFromApi && optimizedStopsFromApi.length > 0) {
        let newOrderedParadasEdit: ParadaConDetalles[] = [];
        const processedOriginalParadaIds = new Set<string>();
        let deliveryOrderCounter = 1;

        // 1. Handle the fixed origin stop (company pickup for lote, or first pickup for individual)
        const originOptimizedStop = optimizedStopsFromApi[0];
        const actualOriginParada = paradasEdit.find(p => p.id === originOptimizedStop.originalParadaId);

        if (isLoteReparto) {
            const companyPickupOriginal = paradasEdit.find(p => !p.envio_id && (p.orden_visita === 0 || p.id?.startsWith('virtual-pickup-')));
            if (companyPickupOriginal) {
                newOrderedParadasEdit.push({ ...companyPickupOriginal, orden_visita: 0 });
                processedOriginalParadaIds.add(companyPickupOriginal.id!);
            }
        }
        // For individual repartos, the origin of the *route* is the first optimized point's originalParada.
        // The ordering of *envios* will be based on the sequence of their pickup/delivery points.

        // 2. Add optimized delivery stops (or sequence of pickups/deliveries for individual)
        for (const optimizedStop of optimizedStopsFromApi) {
            // If it's the anchor ID for company origin (and not a real parada), skip its direct addition.
            if (optimizedStop.id === 'ORIGIN_EMPRESA_ANCHOR') continue;
            
            // If this optimized stop represents the company pickup that was already added, skip.
            if (isLoteReparto && newOrderedParadasEdit.length > 0 && newOrderedParadasEdit[0].id === optimizedStop.originalParadaId && !newOrderedParadasEdit[0].envio_id) {
                continue;
            }

            const originalParada = paradasEdit.find(p => p.id === optimizedStop.originalParadaId);
            if (originalParada && !processedOriginalParadaIds.has(originalParada.id!)) {
                if (originalParada.envio_id) { // It's a delivery-related parada
                    newOrderedParadasEdit.push({ ...originalParada });
                    processedOriginalParadaIds.add(originalParada.id!);
                } else if (!isLoteReparto && originalParada.id === originMappableStop?.originalParadaId){
                    // This is the first parada (envio) for an individual reparto, used as origin, add it.
                     newOrderedParadasEdit.push({ ...originalParada });
                     processedOriginalParadaIds.add(originalParada.id!);
                }
            }
        }

        // 3. Add any remaining paradas from paradasEdit that were not optimizable
        paradasEdit.forEach(originalParada => {
            if (!processedOriginalParadaIds.has(originalParada.id!)) {
                // Only add if it has an envio_id or if it's the fixed pickup stop (already handled)
                if (originalParada.envio_id) {
                    newOrderedParadasEdit.push({ ...originalParada });
                } else if (isLoteReparto && originalParada.id === fixedPickupStopInParadasEdit?.id && !newOrderedParadasEdit.find(p=>p.id === originalParada.id)) {
                    // This case should be rare, if fixedPickupStop wasn't added first.
                    newOrderedParadasEdit.unshift({...originalParada});
                }
            }
        });
        
        // 4. Re-assign orden_visita
        deliveryOrderCounter = 1;
        const finalParadasRenumeradas = newOrderedParadasEdit.map(p => {
            if (isLoteReparto && !p.envio_id && (p.id === fixedPickupStopInParadasEdit?.id || p.id?.startsWith('virtual-pickup-'))) {
                return { ...p, orden_visita: 0 };
            } else if (p.envio_id) {
                return { ...p, orden_visita: deliveryOrderCounter++ };
            }
            return p; // Should ideally not happen if list only contains pickup + deliveries
        }).sort((a,b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));


        setParadasEdit(finalParadasRenumeradas);
        toast({
          title: "Ruta Optimizada",
          description: "El orden de las paradas ha sido recalculado. Revise y guarde los cambios.",
          variant: "default",
        });
      } else {
        toast({ title: "Error de Optimización", description: "No se pudo obtener una ruta optimizada de Google Maps.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error en handleOptimizeRoute:", error);
      toast({ title: "Error de Optimización", description: error.message || "Ocurrió un error desconocido.", variant: "destructive" });
    } finally {
      setIsOptimizingRoute(false);
    }
  };


  if (isLoading || !repartoId) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!reparto) {
    return <p className="text-center text-destructive p-6">Reparto no encontrado o error al cargar.</p>;
  }
  
  let canOptimize = !isRepartoFinalizado && isMapsApiReady && googleMaps;
  if (canOptimize) {
    if (isLoteReparto) {
        if (!empresaOrigenParaMapa?.latitud || !empresaOrigenParaMapa?.longitud) {
            canOptimize = false;
        } else {
            const optimizableDeliveriesCount = paradasEdit.filter(p => 
                p.envio_id && 
                p.envios?.latitud_destino != null && 
                p.envios?.longitud_destino != null &&
                (!reparto.empresa_asociada_id || (p.envios?.empresas_origen?.id === reparto.empresa_asociada_id || (p.envios?.clientes as Cliente & {empresas: Empresa | null})?.empresas?.id === reparto.empresa_asociada_id))
            ).length;
            if (optimizableDeliveriesCount < 2) canOptimize = false;
        }
    } else { // Individual Reparto
        const validIndividualEnviosForOptimization = paradasEdit.filter(p => 
            p.envio_id && 
            p.envios?.latitud_origen != null && p.envios?.longitud_origen != null &&
            p.envios?.latitud_destino != null && p.envios?.longitud_destino != null
        ).length;
        if (validIndividualEnviosForOptimization < 1) canOptimize = false; // Need at least 1 full envio (2 points)
        // For actual waypoint optimization, Google needs at least 3 points (origin + 1 waypoint + destination)
        // So, for individual, this means at least 2 envios if first origin is fixed, or 1.5 envios (3 points).
        // Let's simplify to needing at least 2 envios for useful "reordering" of envios.
        if (validIndividualEnviosForOptimization < 2 && pointsToOptimize.length < 3) {
            canOptimize = false;
        }
    }
  }
  
  const displayParadas = paradasEdit.sort((a,b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));
  
  const deliveryParadasParaResumen = displayParadas.filter(p => p.envio_id && !p.id?.startsWith('virtual-pickup-'));
  const resumenParadas = {
    total: deliveryParadasParaResumen.length,
    pendientes: deliveryParadasParaResumen.filter(p => p.estado_parada === 'asignado' || p.estado_parada === 'pendiente_asignacion').length,
    entregadas: deliveryParadasParaResumen.filter(p => p.estado_parada === 'entregado').length,
    noEntregadas: deliveryParadasParaResumen.filter(p => p.estado_parada === 'no_entregado').length,
    canceladas: deliveryParadasParaResumen.filter(p => p.estado_parada === 'cancelado').length,
  };
  
  return (
    <div className="space-y-6 p-1 md:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/repartos"><ArrowLeft className="h-5 w-5"/></Link>
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <ClipboardEdit size={32} /> Detalle del Reparto
          </h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <Button onClick={handleOptimizeRoute} variant="outline" size="sm" disabled={!canOptimize || isLoading || isUpdating || isOptimizingRoute} className="min-w-[160px] whitespace-nowrap text-xs sm:text-sm">
                {isOptimizingRoute ? <Loader2 className="animate-spin mr-1.5 h-4 w-4"/> : <Sparkles size={14} className="mr-1.5"/>} Optimizar Ruta (IA)
            </Button>
            <Button onClick={() => {setIsLoading(true); fetchRepartoDetails().finally(() => setIsLoading(false));}} variant="outline" size="sm" disabled={isLoading || isUpdating || isOptimizingRoute} className="min-w-[120px] whitespace-nowrap text-xs sm:text-sm">
                <RefreshCw className={`mr-1.5 h-4 w-4 ${(isLoading || isUpdating || isOptimizingRoute) ? 'animate-spin' : ''}`} /> Refrescar
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
                    <Badge variant="default" className={cn("text-sm font-semibold px-2.5 py-1 self-start sm:self-center", getEstadoBadgeVariantClass(reparto.estado))}>
                    {getEstadoDisplayName(reparto.estado)}
                    </Badge>
                </div>
                </CardHeader>
                <CardContent className="pt-4 md:pt-6 p-4 md:p-6 space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <p className="flex items-center gap-2"><Truck size={18} className="text-muted-foreground"/><strong>Repartidor:</strong> {reparto.repartidores?.nombre || 'N/A'}</p>
                    <p className="flex items-center gap-2"><Building size={18} className="text-muted-foreground"/><strong>Empresa:</strong> {reparto.empresas?.nombre || (isLoteReparto ? 'Empresa no especificada' : 'Individual / Varios')}</p>
                  </div>
                  {reparto.notas && <p className="flex items-start gap-2"><InfoIcon size={18} className="text-muted-foreground mt-0.5"/><strong>Notas del Reparto:</strong> <span className="text-muted-foreground">{reparto.notas}</span></p>}
                
                  {!isRepartoFinalizado && (
                    <div className="flex gap-2 flex-wrap pt-4 border-t border-border/50 mt-4">
                        {reparto.estado === 'planificado' && 
                        <Button onClick={() => handleRepartoEstadoChange(EstadoRepartoEnum.Values.en_curso)} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 text-xs sm:text-sm px-3 py-1.5 h-auto sm:h-9">
                            {isUpdating ? <Loader2 className="animate-spin mr-1.5 h-4 w-4"/> : <Play size={16} className="mr-1.5"/>} Iniciar Reparto
                        </Button>}
                        {reparto.estado === 'en_curso' && 
                        <Button onClick={() => handleRepartoEstadoChange(EstadoRepartoEnum.Values.completado)} disabled={isUpdating} className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600 text-xs sm:text-sm px-3 py-1.5 h-auto sm:h-9">
                            {isUpdating ? <Loader2 className="animate-spin mr-1.5 h-4 w-4"/> : <CheckCircle size={16} className="mr-1.5"/>} Finalizar Reparto
                        </Button>}
                        {(reparto.estado === 'planificado' || reparto.estado === 'en_curso') &&
                        <Button onClick={() => handleRepartoEstadoChange(EstadoRepartoEnum.Values.cancelado)} variant="destructive" disabled={isUpdating} className="text-xs sm:text-sm px-3 py-1.5 h-auto sm:h-9">
                            {isUpdating ? <Loader2 className="animate-spin mr-1.5 h-4 w-4"/> : <XCircle size={16} className="mr-1.5"/>} Cancelar Reparto
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
                    <div className="h-[350px] sm:h-[400px] md:h-[450px] rounded-md overflow-hidden border border-border shadow-inner bg-muted/30">
                       <RepartoMapComponent 
                            paradas={paradasEdit} 
                            empresaOrigen={empresaOrigenParaMapa}
                            repartoId={repartoId!}
                            isLoteReparto={isLoteReparto}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs md:text-sm p-3 md:p-4 bg-muted/70 rounded-lg border border-border/50">
                        <div className="text-center sm:text-left"><strong>Total Entregas:</strong> <span className="font-semibold text-primary">{resumenParadas.total}</span></div>
                        <div className="text-center sm:text-left"><strong>Distancia Estimada:</strong> <span className="font-semibold text-primary">{isMapsApiReady ? (totalDistance !== null ? `${totalDistance.toFixed(2)} km` : 'Calculando...') : 'Mapa no disp.'}</span></div>
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
                      <Button onClick={handleSaveOrden} disabled={isUpdating || isOptimizingRoute || isLoading} size="sm" className="w-full sm:w-auto text-xs sm:text-sm px-3 py-1.5 h-auto sm:h-9">
                        {(isUpdating || isOptimizingRoute || isLoading) ? <Loader2 className="animate-spin mr-1 h-4 w-4"/> : <ClipboardEdit size={14} className="mr-1"/>} Guardar Orden
                      </Button>
                    )}
                </div>
                <CardDescription className="mt-1 text-xs md:text-sm">Gestiona el orden y estado de cada parada.</CardDescription>
                 <div className="mt-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-muted-foreground">
                    <span>Entregadas: <span className="font-semibold text-green-600">{resumenParadas.entregadas}</span></span>
                    <span>Pendientes: <span className="font-semibold text-blue-600">{resumenParadas.pendientes}</span></span>
                    <span>No Ent.: <span className="font-semibold text-red-600">{resumenParadas.noEntregadas}</span></span>
                    <span>Cancel.: <span className="font-semibold text-slate-600">{resumenParadas.canceladas}</span></span>
                </div>
                </CardHeader>
                <CardContent className="flex-grow overflow-hidden p-0">
                {displayParadas.length === 0 ? ( 
                    <p className="text-muted-foreground text-center py-10 px-4">Este reparto no tiene paradas asignadas.</p>
                ) : (
                    <ScrollArea className="h-full max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-18rem)] lg:max-h-[calc(100vh-15rem)] xl:max-h-[calc(100vh-12rem)]">
                    <Table className="text-xs sm:text-sm">
                        <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                        <TableRow>
                            <TableHead className="w-[60px] px-2 py-2.5 text-center">Orden</TableHead>
                            <TableHead className="px-2 py-2.5">Destino/Descripción</TableHead>
                            <TableHead className="w-[150px] px-2 py-2.5">Estado</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {displayParadas.map((parada) => {
                          const isPickupCompanyStop = !parada.envio_id && (parada.orden_visita === 0 || parada.id?.startsWith('virtual-pickup-'));
                          return (
                            <TableRow key={parada.id} className={cn(isPickupCompanyStop && "bg-muted/40 hover:bg-muted/50")}>
                            <TableCell className="px-2 py-2 text-center align-top">
                                {isPickupCompanyStop ? (
                                    <Badge variant="outline" className="font-semibold text-muted-foreground border-muted-foreground/50 text-xs px-1.5 py-0.5">Origen</Badge>
                                ) : (
                                    <Input 
                                        type="number"
                                        value={parada.orden_visita ?? ""} 
                                        onChange={(e) => handleOrdenChange(parada.id!, e.target.value)}
                                        className="w-12 sm:w-14 h-8 text-center px-1 text-xs"
                                        disabled={isRepartoFinalizado || isUpdating || isOptimizingRoute || isLoading || isPickupCompanyStop}
                                        min="1"
                                    />
                                )}
                            </TableCell>
                            <TableCell className="px-2 py-3 align-top">
                                <div className="flex items-start gap-1.5">
                                <MapPin size={16} className={cn("mt-0.5 shrink-0", 
                                    isPickupCompanyStop ? "text-blue-500 dark:text-blue-400" : 
                                    parada.envios?.latitud_destino && parada.envios?.longitud_destino ? "text-red-500 dark:text-red-400" : 
                                    "text-gray-400 dark:text-gray-500" 
                                )}/> 
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm leading-tight">
                                        {parada.envio_id && parada.envios ? 
                                            parada.envios.direccion_destino
                                            : parada.descripcion_parada}
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
                            <TableCell className="px-2 py-3 align-top">
                                {isPickupCompanyStop ? (
                                    <Badge variant="outline" className={cn("border-muted-foreground/50 text-xs capitalize", getEstadoBadgeVariantClass(parada.estado_parada))}>{getEstadoDisplayName(parada.estado_parada)}</Badge>
                                ) : (
                                <Select
                                value={parada.estado_parada || undefined}
                                onValueChange={(value) => handleParadaEstadoChange(parada.id!, value as EstadoEnvio, parada.envio_id || null)}
                                disabled={isUpdating || isRepartoFinalizado || isOptimizingRoute || isLoading || !parada.envio_id }
                                >
                                <SelectTrigger className={cn("h-8 text-xs", getEstadoBadgeVariantClass(parada.estado_parada))}>
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
                          )
                        })}
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

    