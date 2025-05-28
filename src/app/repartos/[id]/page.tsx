
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
      const currentEmpresaData = repartoDataWithDate.empresas;
      let companyPickupStopFound = processedParadas.find(p => !p.envio_id && (p.orden_visita === 0 || p.descripcion_parada?.toLowerCase().includes('retiro')));

      if (currentIsLoteReparto && currentEmpresaData?.latitud != null && currentEmpresaData?.longitud != null) {
        if (!companyPickupStopFound) {
          const virtualPickupStop: ParadaConDetalles = {
            id: `virtual-pickup-${repartoDataWithDate.id!}`,
            reparto_id: repartoDataWithDate.id!,
            envio_id: null, 
            descripcion_parada: `Retiro en ${currentEmpresaData.nombre || 'Empresa Asociada'} (${currentEmpresaData.direccion || 'N/A'})`,
            orden_visita: 0,
            estado_parada: 'asignado',
            created_at: repartoDataWithDate.created_at || new Date().toISOString(),
            updated_at: repartoDataWithDate.updated_at || new Date().toISOString(),
            user_id: repartoDataWithDate.user_id || null,
            envios: null, 
          };
          processedParadas.unshift(virtualPickupStop);
          companyPickupStopFound = virtualPickupStop;
        } else {
          companyPickupStopFound = { ...companyPickupStopFound, orden_visita: 0 };
          processedParadas = processedParadas.filter(p => p.id !== companyPickupStopFound!.id);
          processedParadas.unshift(companyPickupStopFound);
        }
      }
      
      let deliveryOrderCounter = 1;
      const finalSortedParadas = processedParadas.map(p => {
        if (companyPickupStopFound && p.id === companyPickupStopFound.id) {
          return { ...p, orden_visita: 0 };
        } else if (p.envio_id) {
          return { ...p, orden_visita: deliveryOrderCounter++ };
        }
        return p; 
      }).sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));
      
      setReparto({...repartoDataWithDate, paradas_reparto: finalSortedParadas});
      setParadasEdit(finalSortedParadas);

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
  
    const pathPoints: google.maps.LatLngLiteral[] = [];
    const sortedParadas = [...paradasEdit].sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));
    
    const companyPickupStop = sortedParadas.find(p => p.orden_visita === 0 && !p.envio_id);

    if (isLoteReparto) {
        if (empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
            pathPoints.push({ lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud });
        } else if (companyPickupStop && (companyPickupStop as any).latitud != null && (companyPickupStop as any).longitud != null) {
            // Fallback if empresaOrigenParaMapa is not set but virtual stop has coords (less likely)
            pathPoints.push({ lat: (companyPickupStop as any).latitud, lng: (companyPickupStop as any).longitud });
        }
    }
  
    sortedParadas.forEach(parada => {
      if (parada.envio_id && parada.envios?.latitud_destino != null && parada.envios?.longitud_destino != null) {
        pathPoints.push({ lat: parada.envios.latitud_destino, lng: parada.envios.longitud_destino });
      } else if (!isLoteReparto && parada.envio_id) { // Individual reparto logic
        if (parada.envios?.latitud_origen != null && parada.envios?.longitud_origen != null) {
          pathPoints.push({ lat: parada.envios.latitud_origen, lng: parada.envios.longitud_origen });
        }
        if (parada.envios?.latitud_destino != null && parada.envios?.longitud_destino != null) {
            pathPoints.push({ lat: parada.envios.latitud_destino, lng: parada.envios.longitud_destino });
        }
      }
    });
  
    const uniquePathPoints = pathPoints.filter((point, index, self) =>
        index === 0 || (point.lat !== self[index - 1].lat || point.lng !== self[index - 1].lng)
    );

    if (uniquePathPoints.length < 2) {
      setTotalDistance(0);
      return;
    }
  
    let currentTotalDistance = 0;
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
  
  const isRepartoFinalizado = reparto?.estado === 'completado' || reparto?.estado === 'cancelado';

  const optimizableConditionsMet = React.useMemo(() => {
    if (!isMapsApiReady || !googleMaps || !reparto || isRepartoFinalizado) {
      return false;
    }

    let originFound = false;
    if (isLoteReparto) {
      originFound = !!(empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null);
    } else { // Individual
      originFound = paradasEdit.some(p => p.envio_id && p.envios?.latitud_origen != null && p.envios?.longitud_origen != null);
    }
    if (!originFound) return false;
    
    let validDeliveryPointsCount = 0;
    if (isLoteReparto) {
        validDeliveryPointsCount = paradasEdit.filter(
            p => p.envio_id && p.envios?.latitud_destino != null && p.envios?.longitud_destino != null
        ).length;
        return validDeliveryPointsCount >= 2; // Origin (company) + 2 delivery stops
    } else { // Individual
        const mappableDeliveryPoints = paradasEdit.filter(p => p.envio_id && p.envios?.latitud_destino != null && p.envios?.longitud_destino != null);
        const mappablePickupPoints = paradasEdit.filter(p => p.envio_id && p.envios?.latitud_origen != null && p.envios?.longitud_origen != null);
        // Need at least one origin and two other distinct points (can be a mix of pickups/deliveries)
        // Simplified: count unique envío IDs that have at least one valid point (either origin or dest)
        const uniqueEnvioIdsWithCoords = new Set<string>();
        paradasEdit.forEach(p => {
            if(p.envio_id && p.envios && ((p.envios.latitud_origen && p.envios.longitud_origen) || (p.envios.latitud_destino && p.envios.longitud_destino))){
                uniqueEnvioIdsWithCoords.add(p.envio_id);
            }
        });
         // Need at least 2 full envios (4 points) or 1 full envio + another point from a 2nd envio, for meaningful optimization.
         // More simply, require at least 3 points for Directions API (origin + 1 waypoint + destination)
        let totalPoints = 0;
        paradasEdit.forEach(p => {
            if (p.envio_id && p.envios) {
                if (p.envios.latitud_origen && p.envios.longitud_origen) totalPoints++;
                if (p.envios.latitud_destino && p.envios.longitud_destino) totalPoints++;
            }
        });
        return totalPoints >= 3; // e.g., P1 -> D1 -> P2 (D2 is the implicit end for Google API)
    }
  }, [isMapsApiReady, googleMaps, reparto, isRepartoFinalizado, isLoteReparto, empresaOrigenParaMapa, paradasEdit]);

  const handleRepartoEstadoChange = async (nuevoEstado: EstadoReparto) => {
    if (!repartoId || !reparto) return;
    if (isRepartoFinalizado && (nuevoEstado === 'completado' || nuevoEstado === 'cancelado')) {
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
     if (isRepartoFinalizado) {
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
        if (p.id === paradaId && !p.envio_id && p.orden_visita === 0) { // Parada de retiro empresa
            return p; // No permitir cambiar orden 0
        }
        if (p.id === paradaId && p.envio_id) { 
            if (nuevoOrden === null || (nuevoOrden >= 1)) {
                return { ...p, orden_visita: nuevoOrden };
            }
        }
        return p;
      })
    );
  };

  const handleSaveOrden = async () => {
    if (!reparto || !repartoId || isRepartoFinalizado) return;

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    const deliveryStopsToReorder = paradasEdit.filter(p => {
      return p.envio_id && p.id && uuidRegex.test(p.id);
    });
    
    if (deliveryStopsToReorder.some(p => p.orden_visita === null || p.orden_visita === undefined || p.orden_visita <= 0)) {
      toast({ title: "Error de Orden", description: "Todas las paradas de entrega válidas deben tener un número de orden positivo (mayor a 0).", variant: "destructive"});
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
        const hadAnyRealDeliveriesInitially = paradasEdit.some(p => p.envio_id && p.id && uuidRegex.test(p.id));
        if (hadAnyRealDeliveriesInitially) {
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
    if (!optimizableConditionsMet || !googleMaps || !reparto || isRepartoFinalizado) {
        toast({ title: "No se puede optimizar", description: "Condiciones no cumplidas o API no lista.", variant: "destructive" });
        return;
    }
    setIsOptimizingRoute(true);

    let originMappableStop: MappableStop | undefined = undefined;
    const deliveryMappableStops: MappableStop[] = [];
    const nonOptimizableDeliveryParadas: ParadaConDetalles[] = []; // Paradas de entrega sin coords o de otra empresa
    
    const fixedPickupStopInParadasEdit = paradasEdit.find(p => p.orden_visita === 0 && !p.envio_id);

    if (isLoteReparto) {
        if (empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
            originMappableStop = {
                id: fixedPickupStopInParadasEdit?.id || 'ORIGIN_EMPRESA_ANCHOR',
                originalParadaId: fixedPickupStopInParadasEdit?.id || 'ORIGIN_EMPRESA_ANCHOR',
                type: 'pickup_empresa',
                location: { lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud },
                displayName: fixedPickupStopInParadasEdit?.descripcion_parada || `Retiro en ${empresaOrigenParaMapa.nombre}`
            };
        } else {
            toast({ title: "Error de Origen", description: "El reparto por lote no tiene un origen de empresa con coordenadas válidas.", variant: "destructive" });
            setIsOptimizingRoute(false);
            return;
        }

        paradasEdit.forEach(parada => {
            if (parada.envio_id && parada.id !== fixedPickupStopInParadasEdit?.id) { // Es una parada de entrega
                if (parada.envios?.latitud_destino != null && parada.envios?.longitud_destino != null) {
                    // Asumimos que si es un reparto por lote, todos los envios son para clientes de la empresa del reparto.
                    // Si se necesitara un filtro más estricto, se añadiría aquí.
                    deliveryMappableStops.push({
                        id: parada.id!,
                        originalParadaId: parada.id!,
                        envioId: parada.envio_id,
                        type: 'delivery_envio',
                        location: { lat: parada.envios.latitud_destino, lng: parada.envios.longitud_destino },
                        displayName: `Entrega E${parada.orden_visita}: ${parada.envios.direccion_destino}`
                    });
                } else {
                    nonOptimizableDeliveryParadas.push(parada);
                }
            }
        });

        if (deliveryMappableStops.length < 2) {
            toast({ title: "Paradas Insuficientes", description: "Se necesitan al menos dos paradas de cliente con ubicación válida para optimizar.", variant: "destructive" });
            setIsOptimizingRoute(false);
            return;
        }
    } else { // Reparto Individual
        // For individual, each parada.envio is a pickup and a delivery
        const tempPoints: MappableStop[] = [];
        paradasEdit.forEach(parada => {
            if (parada.envio_id && parada.envios) {
                if (parada.envios.latitud_origen != null && parada.envios.longitud_origen != null) {
                    tempPoints.push({
                        id: parada.id + '_pickup', originalParadaId: parada.id!, envioId: parada.envio_id,
                        type: 'pickup_envio',
                        location: { lat: parada.envios.latitud_origen, lng: parada.envios.longitud_origen },
                        displayName: `Retiro E${parada.orden_visita}: ${parada.envios.direccion_origen}`
                    });
                } else { nonOptimizableDeliveryParadas.push(parada); return; } // Skip this envio if origin is bad

                if (parada.envios.latitud_destino != null && parada.envios.longitud_destino != null) {
                    tempPoints.push({
                        id: parada.id + '_delivery', originalParadaId: parada.id!, envioId: parada.envio_id,
                        type: 'delivery_envio',
                        location: { lat: parada.envios.latitud_destino, lng: parada.envios.longitud_destino },
                        displayName: `Entrega E${parada.orden_visita}: ${parada.envios.direccion_destino}`
                    });
                } else { nonOptimizableDeliveryParadas.push(parada); return; } // Skip this envio if dest is bad
            }
        });

        if (tempPoints.length < 2) { // Needs at least one full pickup and delivery
             toast({ title: "Paradas Insuficientes", description: "Se necesita al menos un envío completo con origen y destino para optimizar.", variant: "destructive" });
             setIsOptimizingRoute(false);
             return;
        }
        if (tempPoints.length < 3 && tempPoints.length >=2) { // Origin + Destination only, no waypoints
            // console.log("Optimización no necesaria para 2 puntos, es ruta directa.");
            // Potentially just re-sort paradasEdit by current orden_visita and re-number if needed.
            // Or inform user. For now, let it pass to optimizeDeliveryRoute which handles 2 points.
        }
        originMappableStop = tempPoints.shift(); // First point is origin
        deliveryMappableStops.push(...tempPoints); // Rest are waypoints/destination
    }

    const pointsForGoogleApi: MappableStop[] = [originMappableStop!, ...deliveryMappableStops];
    
    // console.log("Points sent to Google API:", pointsForGoogleApi.map(p => ({id:p.id, type: p.type, name: p.displayName})));

    try {
      const optimizedStopsFromApi = await optimizeDeliveryRoute(pointsForGoogleApi);

      if (optimizedStopsFromApi && optimizedStopsFromApi.length > 0) {
        let newOrderedParadasEdit: ParadaConDetalles[] = [];
        const originalParadasMap = new Map(paradasEdit.map(p => [p.id!, p]));
        const processedParadaIdsInOptimizedOrder = new Set<string>();

        // 1. Add/Keep the company pickup stop (orden 0) if it exists and was the origin
        if (isLoteReparto && fixedPickupStopInParadasEdit && originMappableStop?.id === fixedPickupStopInParadasEdit.id) {
            newOrderedParadasEdit.push({ ...fixedPickupStopInParadasEdit, orden_visita: 0 });
            processedParadaIdsInOptimizedOrder.add(fixedPickupStopInParadasEdit.id!);
        }


        // 2. Process and add delivery stops based on optimized order
        let deliveryOrderCounter = 1;
        optimizedStopsFromApi.forEach(optimizedStop => {
            // Skip if this optimizedStop was the company anchor/origin point itself
            if (optimizedStop.id === 'ORIGIN_EMPRESA_ANCHOR' || (isLoteReparto && fixedPickupStopInParadasEdit && optimizedStop.id === fixedPickupStopInParadasEdit.id)) {
                return; 
            }
            
            // For individual repartos, optimizedStop.id might be 'paradaId_pickup' or 'paradaId_delivery'
            // We need to get the original ParadaConDetalles object using originalParadaId
            const originalParada = originalParadasMap.get(optimizedStop.originalParadaId);

            if (originalParada && originalParada.envio_id && !processedParadaIdsInOptimizedOrder.has(originalParada.id!)) {
                 // Only add if it's a delivery-related parada and not already added
                newOrderedParadasEdit.push({ ...originalParada, orden_visita: deliveryOrderCounter++ });
                processedParadaIdsInOptimizedOrder.add(originalParada.id!);
            }
        });
        
        // 3. Add back any non-optimized delivery paradas (e.g., no coords, or weren't part of the specific company's client list)
        // preserving their relative original order among themselves.
        const remainingParadas = paradasEdit.filter(p => 
            p.envio_id && !processedParadaIdsInOptimizedOrder.has(p.id!) && p.id !== fixedPickupStopInParadasEdit?.id
        );
        remainingParadas.sort((a,b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity)); // Keep original relative order
        remainingParadas.forEach(p => {
            newOrderedParadasEdit.push({ ...p, orden_visita: deliveryOrderCounter++ });
        });
        
        // Ensure the company pickup (if exists as a real parada) is at the very beginning with order 0.
        const finalParadasWithCorrectedOrder = newOrderedParadasEdit.map((p, index) => {
            if (fixedPickupStopInParadasEdit && p.id === fixedPickupStopInParadasEdit.id && !p.envio_id) {
                return { ...p, orden_visita: 0 };
            }
            // For all others, if they were part of the reordered delivery sequence, their order is already set.
            // If this is the first delivery stop after company pickup, its order_visita should be 1.
            // The deliveryOrderCounter logic above should handle this.
            // However, we need to re-number based on the *final* assembled list.
            return p;
        }).sort((a,b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity)); // Sort again after setting fixed 0

        // Final re-numbering for delivery stops
        deliveryOrderCounter = 1;
        const finalNumberedList = finalParadasWithCorrectedOrder.map(p => {
            if (p.orden_visita === 0 && !p.envio_id) return p; // Keep company pickup as 0
            if (p.envio_id) return { ...p, orden_visita: deliveryOrderCounter++ };
            return p; // Should not happen for well-formed list
        });

        setParadasEdit(finalNumberedList);
        toast({
          title: "Ruta Optimizada",
          description: "El orden de las paradas ha sido recalculado. Revise y guarde los cambios.",
          variant: "default",
        });
      } else {
        toast({ title: "Error de Optimización", description: "No se pudo obtener una ruta optimizada de Google Maps o no hubo cambios.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error en handleOptimizeRoute:", error);
      toast({ title: "Error de Optimización", description: error.message || "Ocurrió un error desconocido.", variant: "destructive" });
    } finally {
      setIsOptimizingRoute(false);
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!reparto) {
    return <p className="text-center text-destructive p-6">Reparto no encontrado o error al cargar.</p>;
  }
  
  const displayParadas = paradasEdit;
  
  const resumenParadas = displayParadas.reduce((acc, parada) => {
    if (parada.envio_id) { 
        acc.total++;
        if (parada.estado_parada === 'entregado') acc.entregadas++;
        else if (parada.estado_parada === 'no_entregado') acc.noEntregadas++;
        else if (parada.estado_parada === 'cancelado') acc.canceladas++;
        else acc.pendientes++;
    }
    return acc;
  }, { total: 0, pendientes: 0, entregadas: 0, noEntregadas: 0, canceladas: 0 });
  
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
            <Button onClick={handleOptimizeRoute} variant="outline" size="sm" disabled={isLoading || isUpdating || isOptimizingRoute || !optimizableConditionsMet} className="min-w-[160px] whitespace-nowrap text-xs sm:text-sm">
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
                    <Badge variant="outline" className={cn("text-sm font-semibold px-2.5 py-1 self-start sm:self-center", getEstadoBadgeVariantClass(reparto.estado))}>
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
                        <div className="text-center sm:text-left"><strong>Distancia Estimada:</strong> <span className="font-semibold text-primary">{isMapsApiReady && googleMaps ? (totalDistance !== null ? `${totalDistance.toFixed(2)} km` : 'Calculando...') : 'Mapa no disp.'}</span></div>
                        <div className="text-center sm:text-left"><strong>Tiempo Estimado:</strong> <span className="font-semibold text-primary text-muted-foreground">N/A</span></div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1">
            <Card className="rounded-xl shadow-lg border border-border/50 h-full flex flex-col">
                <CardHeader className="border-b border-border/50 p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle className="text-lg md:text-xl font-semibold text-primary">Paradas ({resumenParadas.total} entregas)</CardTitle>
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
                          const isPickupCompanyStop = !parada.envio_id && parada.orden_visita === 0;
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
```Okay, entiendo perfectamente. La lógica de optimización debe ser muy precisa:

1.  **Origen Fijo**: La parada con `orden_visita === 0` (retiro en empresa) es el punto de partida y no se reordena.
2.  **Waypoints Optimizables**: Solo las paradas con `orden_visita > 0` (entregas a clientes) que tengan coordenadas válidas y estén asociadas a la empresa del reparto (si aplica) se pasan a la API de Google para optimizar su secuencia.
3.  **Resultado Final**: La lista de paradas devuelta debe tener la parada de orden 0 al principio, seguida por las paradas de cliente en el nuevo orden optimizado. Las paradas de cliente no optimizables (sin coordenadas, etc.) irán después de las optimizadas.

Voy a refinar la función `handleOptimizeRoute` en `src/app/repartos/[id]/page.tsx` para implementar esta lógica de manera más explícita.

**Principales Ajustes en `handleOptimizeRoute`:**

*   **Identificar el Origen (`originStopDetails`)**: Buscar la parada con `orden_visita === 0`. Si no existe o no tiene coordenadas válidas (usando `empresaOrigenParaMapa`), mostrar error. Este será el `originMappableStop` para la API.
*   **Filtrar Paradas Optimizables (`deliveryStopsToOptimize`)**: Crear una lista de `MappableStop` solo para las paradas con `orden_visita > 0`, `envio_id` presente, coordenadas válidas y que cumplan el criterio de pertenencia a la empresa (si es un reparto por lote).
*   **Validar Cantidad**: Se necesitan al menos 2 `deliveryStopsToOptimize` para que la API de Google Maps pueda optimizar una secuencia entre ellas (Origin + Waypoint1 + Waypoint2/Destination).
*   **Llamar a la API**: Se llamará a `optimizeDeliveryRoute` con `[originMappableStop, ...deliveryStopsToOptimize]`.
*   **Procesar Resultado (`optimizedDeliveryStopsOnly`)**: La respuesta de `optimizeDeliveryRoute` contendrá el `originMappableStop` al principio y los `deliveryStopsToOptimize` reordenados. Necesitamos extraer solo la parte de los *delivery stops* reordenados.
*   **Reconstruir `paradasEdit`**:
    1.  Empezar con la parada de origen (`fixedPickupStopInParadasEdit`).
    2.  Añadir las paradas de entrega reordenadas (mapeando los IDs de `optimizedDeliveryStopsOnly` a los objetos `ParadaConDetalles` originales).
    3.  Añadir cualquier parada de entrega que no fue optimizable (ej. sin coordenadas) al final.
    4.  Re-numerar `orden_visita`: 0 para el origen, 1 en adelante para las entregas.

Aquí está el código modificado:
(Omitted from agent history: changes suggested and applied to the following files: /home/user/studio/src/app/repartos/[id]/page.tsx)

**Resumen de la Lógica Actualizada en `handleOptimizeRoute`:**

1.  **Identificación y Validación del Origen (Empresa)**:
    *   Se busca `fixedPickupStopInParadasEdit` (la parada con `orden_visita === 0` y sin `envio_id`).
    *   Se verifica si `empresaOrigenParaMapa` (que obtiene las coordenadas de `reparto.empresas`) es válido. Si no, se muestra un error y se aborta.
    *   `originMappableStop` se crea usando las coordenadas de `empresaOrigenParaMapa` y el ID de `fixedPickupStopInParadasEdit` (o un placeholder si la parada de retiro es virtual).

2.  **Selección de Paradas de Entrega para Optimización**:
    *   Se filtran las `paradasEdit` para obtener `deliveryStopsToConsider`: solo aquellas con `envio_id`, coordenadas de destino válidas, y que (si es un reparto por lote) pertenezcan a la misma empresa.
    *   Se valida que haya al menos dos `deliveryStopsToConsider` para que la optimización de *waypoints* sea significativa.

3.  **Llamada a la API de Google Maps**:
    *   Se construye `pointsForGoogleApi` como `[originMappableStop, ...deliveryMappableStops]`.
    *   Se llama a `optimizeDeliveryRoute`.

4.  **Procesamiento del Resultado (`optimizedStopsFromApi`)**:
    *   `finalOrderedParadas`: Se inicia con `fixedPickupStopInParadasEdit` (si existe y fue el origen).
    *   Se itera sobre `optimizedStopsFromApi`. Se omite el primer elemento (el origen). Para los demás (`optimizedDeliveryPoint`), se busca la parada original y se añade a `finalOrderedParadas` si es una parada de entrega y no se ha añadido ya.
    *   Se añaden al final las paradas de entrega que no fueron optimizadas.

5.  **Re-numeración Final de `orden_visita`**:
    *   Se itera sobre `finalOrderedParadas`.
    *   Si la parada es `fixedPickupStopInParadasEdit`, su `orden_visita` es `0`.
    *   Para las paradas de entrega (`p.envio_id`), se asigna `deliveryOrderCounter++` (iniciando `deliveryOrderCounter` en `1`).
    *   Se actualiza `setParadasEdit` con la lista final ordenada y renumerada.

Esta lógica es más precisa al tratar la parada de retiro en empresa como un origen fijo (orden 0) y optimizar solo la secuencia de las paradas de entrega válidas y relevantes, comenzando su numeración desde 1.