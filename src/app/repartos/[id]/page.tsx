
"use client";

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building, CheckCircle, ClipboardEdit, InfoIcon, Loader2, MapPin, Package, Play, RefreshCw, Route, Sparkles, Truck, User, XCircle } from "lucide-react";
import { getRepartoByIdAction, updateRepartoEstadoAction, updateParadaEstadoAction, reorderParadasAction } from '@/actions/reparto-actions';
import type { RepartoConDetalles, ParadaConDetalles, EstadoReparto, EstadoEnvio, MappableStop, Empresa, EnvioConDetalles } from '@/lib/schemas';
import { EstadoRepartoEnum, EstadoEnvioEnum } from '@/lib/schemas';
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
  params: { id: string };
}

export default function RepartoDetallePage({ params: paramsProp }: RepartoDetallePageProps) {
  const { toast } = useToast();
  const router = useRouter();
  
  const resolvedParams = paramsProp; // No React.use() needed here, as per Next.js guidance for Server Components passing to Client Components
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
            id: reparto.empresas.id, // Use empresa ID
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
    setIsUpdating(true); // Also set updating to true to disable buttons during initial load
    try {
      const { reparto: data, error } = await getRepartoByIdAction(repartoId);
      if (error || !data) {
        toast({ title: "Error al Cargar Reparto", description: error || "Reparto no encontrado.", variant: "destructive" });
        router.push('/repartos');
        return;
      }
      
      let repartoDataWithDate = { ...data };
      if (data.fecha_reparto && typeof data.fecha_reparto === 'string') {
        const parsedDate = parseISO(data.fecha_reparto); // Supabase DATE is YYYY-MM-DD, parseISO handles it well
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
      
      let processedParadas = (repartoDataWithDate.paradas_reparto || []).map(p => ({...p})); // Create a mutable copy

      const isLote = !!repartoDataWithDate.empresa_asociada_id;
      let hasExplicitPickupStop = processedParadas.some(p => !p.envio_id && p.descripcion_parada?.toLowerCase().includes('retiro'));
      
      if (isLote && !hasExplicitPickupStop && empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
          const virtualPickupStop: ParadaConDetalles = {
            id: `virtual-pickup-${repartoDataWithDate.id!}`,
            reparto_id: repartoDataWithDate.id!,
            envio_id: null,
            descripcion_parada: `Retiro en ${empresaOrigenParaMapa.nombre}`,
            orden_visita: 0, // Explicitly 0 for origin
            estado_parada: 'asignado',
            created_at: repartoDataWithDate.created_at || new Date().toISOString(),
            updated_at: repartoDataWithDate.updated_at || new Date().toISOString(),
            user_id: null,
            envios: null
          };
          processedParadas.unshift(virtualPickupStop); // Add to the beginning
          hasExplicitPickupStop = true; // Now we have one
      }
      
      // Sort and re-number if necessary
      processedParadas.sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));
      
      let currentDeliveryOrder = 1;
      processedParadas = processedParadas.map(p => {
        if (p.envio_id) { // Only re-number delivery stops
          return { ...p, orden_visita: currentDeliveryOrder++ };
        }
        return { ...p, orden_visita: p.orden_visita === 0 ? 0 : (p.orden_visita ?? 1000) }; // Keep 0 for pickup, push others far if no order
      }).sort((a,b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));


      setReparto({...repartoDataWithDate, paradas_reparto: processedParadas});
      setParadasEdit(processedParadas);

    } catch (err) {
        console.error("Error in fetchRepartoDetails: ", err);
        toast({title: "Error", description: "No se pudieron cargar los detalles del reparto.", variant: "destructive"});
    } finally {
        setIsLoading(false);
        setIsUpdating(false);
    }
  }, [repartoId, toast, router, empresaOrigenParaMapa]);

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

    let distance = 0;
    const pathPoints: google.maps.LatLngLiteral[] = [];
    const isLote = !!reparto.empresa_asociada_id;

    if (isLote && empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
        pathPoints.push({ lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud });
    }

    const sortedDeliveryStops = paradasEdit
        .filter(p => p.envio_id && p.envios?.latitud_destino != null && p.envios?.longitud_destino != null)
        .sort((a,b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));

    if (!isLote && sortedDeliveryStops.length > 0) {
        // For individual repartos, start from the first envío's origin if empresaOrigen is not used
        const firstEnvio = sortedDeliveryStops[0].envios;
        if (firstEnvio?.latitud_origen != null && firstEnvio?.longitud_origen != null) {
            pathPoints.push({ lat: firstEnvio.latitud_origen, lng: firstEnvio.longitud_origen });
        }
    }
    
    sortedDeliveryStops.forEach(parada => {
        pathPoints.push({ lat: parada.envios!.latitud_destino!, lng: parada.envios!.longitud_destino! });
        // For individual repartos, if not the last delivery, we need to account for the next pickup.
        // This simple pairwise sum will be slightly off for individual as it doesn't "return" or go to next pickup.
        // A more complex path construction is needed for true individual route distance.
        // For now, it sums delivery-to-delivery or origin-to-first-delivery, then delivery-to-delivery.
    });


    if (pathPoints.length < 2) {
        setTotalDistance(0);
        return;
    }

    for (let i = 0; i < pathPoints.length - 1; i++) {
      const from = new googleMaps.maps.LatLng(pathPoints[i]);
      const to = new googleMaps.maps.LatLng(pathPoints[i + 1]);
      distance += googleMaps.maps.geometry.spherical.computeDistanceBetween(from, to);
    }
    setTotalDistance(distance / 1000); 
  }, [isMapsApiReady, googleMaps, reparto, paradasEdit, empresaOrigenParaMapa]);


  React.useEffect(() => {
    calculateTotalDistance();
  }, [calculateTotalDistance]);
  
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
      case 'en_curso': 
      case 'en_camino':
        return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'no_entregado':
      case 'cancelado':
        return 'bg-red-500 hover:bg-red-600 text-white';
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };
  
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
        if (p.id === paradaId && p.envio_id && (nuevoOrden === null || (nuevoOrden >= 1))) { 
          return { ...p, orden_visita: nuevoOrden }; 
        }
        return p;
      })
    );
  };

  const handleSaveOrden = async () => {
    if (!reparto || !repartoId) return;

    const deliveryParadasParaGuardar = paradasEdit.filter(p => p.envio_id && p.orden_visita !== null && p.orden_visita !== undefined && p.orden_visita >=1 );
    
    if (deliveryParadasParaGuardar.some(p => p.orden_visita === null || p.orden_visita === undefined || p.orden_visita <= 0)) {
      toast({ title: "Error de Orden", description: "Todas las paradas de entrega deben tener un número de orden positivo.", variant: "destructive"});
      return;
    }
    const orderNumbers = deliveryParadasParaGuardar.map(p => p.orden_visita as number);
    const hasDuplicates = new Set(orderNumbers).size !== orderNumbers.length;
    if (hasDuplicates) {
      toast({ title: "Error de Orden", description: "Los números de orden de las paradas de entrega deben ser únicos y mayores a 0.", variant: "destructive"});
      return;
    }
    
    const allParadasInNewOrder = [...paradasEdit]
      .sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity)) 
      .map(p => p.id!);

    setIsUpdating(true);
    const result = await reorderParadasAction(repartoId, allParadasInNewOrder); 
    if (result.success) {
      toast({ title: "Orden de Paradas Actualizado", description: "El orden de las paradas ha sido guardado." });
      fetchRepartoDetails();
    } else {
      toast({ title: "Error al Guardar Orden", description: result.error, variant: "destructive" });
    }
    setIsUpdating(false);
  };

const handleOptimizeRoute = async () => {
    if (!isMapsApiReady || !googleMaps || !reparto || !repartoId) {
      toast({ title: "No se puede optimizar", description: "El mapa o los datos del reparto no están listos.", variant: "default" });
      return;
    }
    setIsOptimizingRoute(true);

    const isLote = !!reparto.empresa_asociada_id;
    let originMappableStop: MappableStop | null = null;
    let paradasParaOptimizar: ParadaConDetalles[] = [];

    if (isLote) {
        // Lote Reparto: Origin is the company
        const fixedPickupStop = paradasEdit.find(p => p.orden_visita === 0 && !p.envio_id);
        if (empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
            originMappableStop = {
                id: fixedPickupStop?.id || 'ORIGIN_EMPRESA_ANCHOR',
                originalParadaId: fixedPickupStop?.id,
                type: 'pickup_empresa',
                location: { lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud },
                displayName: `Retiro en ${empresaOrigenParaMapa.nombre}`
            };
        } else {
            toast({ title: "Error de Origen", description: "La empresa asociada no tiene coordenadas válidas para iniciar la optimización.", variant: "destructive" });
            setIsOptimizingRoute(false);
            return;
        }
        // Filter for deliveries associated with this company's reparto
        paradasParaOptimizar = paradasEdit.filter(p =>
            p.envio_id &&
            p.envios?.latitud_destino != null &&
            p.envios?.longitud_destino != null &&
            // Ensure the delivery belongs to the company if it's a lote reparto
            (reparto.empresa_asociada_id ? 
              (p.envios.empresa_origen_id === reparto.empresa_asociada_id || p.envios.clientes?.empresa_id === reparto.empresa_asociada_id)
              : true) // If not a company-specific reparto, all deliveries are considered
        );
        if (paradasParaOptimizar.length < 2) {
            toast({ title: "Pocas Paradas", description: "Se necesitan al menos dos paradas de cliente de la empresa con ubicación válida para optimizar.", variant: "default" });
            setIsOptimizingRoute(false);
            return;
        }
    } else {
        // Individual Reparto: build list of pickup and delivery points
        let tempPoints: MappableStop[] = [];
        paradasEdit.forEach((p, index) => {
            if (p.envio_id && p.envios) {
                if (p.envios.latitud_origen != null && p.envios.longitud_origen != null) {
                    tempPoints.push({
                        id: p.id + '_pickup',
                        originalParadaId: p.id!,
                        envioId: p.envio_id,
                        type: 'pickup_envio',
                        location: { lat: p.envios.latitud_origen, lng: p.envios.longitud_origen },
                        displayName: `Retiro E${p.orden_visita || index + 1}: ${p.envios.direccion_origen}`
                    });
                }
                if (p.envios.latitud_destino != null && p.envios.longitud_destino != null) {
                    tempPoints.push({
                        id: p.id + '_delivery',
                        originalParadaId: p.id!,
                        envioId: p.envio_id,
                        type: 'delivery_envio',
                        location: { lat: p.envios.latitud_destino, lng: p.envios.longitud_destino },
                        displayName: `Entrega E${p.orden_visita || index + 1}: ${p.envios.direccion_destino}`
                    });
                }
            }
        });
        if (tempPoints.length < 2) { // Need at least one full P+D for origin/dest
            toast({ title: "Pocos Puntos", description: "Se necesitan al menos un envío completo (retiro y entrega) con coordenadas para optimizar.", variant: "default" });
            setIsOptimizingRoute(false);
            return;
        }
        // For Google's optimizeWaypoints, the first point is origin, last is destination, intermediates are waypoints.
        // The current tempPoints list is already in an operational sequence.
        originMappableStop = tempPoints[0];
        paradasParaOptimizar = tempPoints.slice(1).map(mp => {
            // This map is a bit tricky, as paradasParaOptimizar expects ParadaConDetalles
            // but for individual, we are optimizing individual MappableStops.
            // We will reconstruct the order of ParadaConDetalles later based on optimized MappableStop sequence.
            // For now, we pass the MappableStops directly to the optimization service.
            return mp as any; // Hacky, will be fixed in result processing
        });
         // The optimizeDeliveryRoute expects MappableStop[], so pass tempPoints
        const optimizedRawStops = await optimizeDeliveryRoute(tempPoints);
        if (optimizedRawStops) {
            const originalParadasMap = new Map(paradasEdit.map(p => [p.id!, p]));
            const newOrderedParadas: ParadaConDetalles[] = [];
            const processedEnvioIdsInOptimizedOrder = new Set<string>();

            for (const optStop of optimizedRawStops) {
                if (optStop.originalParadaId && !processedEnvioIdsInOptimizedOrder.has(optStop.originalParadaId)) {
                    const originalParada = originalParadasMap.get(optStop.originalParadaId);
                    if (originalParada) {
                        newOrderedParadas.push(originalParada);
                        processedEnvioIdsInOptimizedOrder.add(optStop.originalParadaId);
                    }
                }
            }
            // Add any paradas that were not part of optimization (e.g., no coords)
            paradasEdit.forEach(p => {
                if (p.id && !processedEnvioIdsInOptimizedOrder.has(p.id)) {
                    newOrderedParadas.push(p);
                }
            });

            const finalParadas = newOrderedParadas.map((p, index) => ({ ...p, orden_visita: index + 1 }));
            setParadasEdit(finalParadas);
            toast({ title: "Ruta Optimizada", description: "El orden de los envíos ha sido actualizado. Revise y guarde los cambios."});
        } else {
             toast({ title: "Error de Optimización", description: "No se pudo obtener una ruta optimizada.", variant: "destructive" });
        }
        setIsOptimizingRoute(false);
        return; // Exit individual reparto optimization here
    }


    // Common logic for Lote, after originMappableStop and paradasParaOptimizar are set
    const deliveryMappableStops = paradasParaOptimizar.map(p => ({
        id: p.id!,
        originalParadaId: p.id!,
        envioId: p.envio_id!,
        type: 'delivery_envio' as MappableStop['type'],
        location: { lat: p.envios!.latitud_destino!, lng: p.envios!.longitud_destino! },
        displayName: `Entrega: ${p.envios!.direccion_destino}`
    }));

    const pointsToOptimize = [originMappableStop!, ...deliveryMappableStops];

    try {
      const optimizedStopsFromApi = await optimizeDeliveryRoute(pointsToOptimize);
      
      if (optimizedStopsFromApi && optimizedStopsFromApi.length > 0) {
        const originalParadasMap = new Map(paradasEdit.map(p => [p.id!, p]));
        let newOrderedParadasEdit: ParadaConDetalles[] = [];
        
        const fixedPickupStop = paradasEdit.find(p => p.orden_visita === 0 && !p.envio_id);
        if (fixedPickupStop) {
            newOrderedParadasEdit.push({ ...fixedPickupStop, orden_visita: 0 });
        }

        let currentDeliveryOrder = 1;
        // Skip the first element from API if it was our originMappableStop
        const apiDeliveryOrder = optimizedStopsFromApi[0].id === originMappableStop!.id 
                                 ? optimizedStopsFromApi.slice(1) 
                                 : optimizedStopsFromApi;

        apiDeliveryOrder.forEach(optimizedStop => {
          const originalParada = originalParadasMap.get(optimizedStop.originalParadaId!);
          if (originalParada && originalParada.envio_id) { // Ensure it's a delivery stop
            newOrderedParadasEdit.push({ ...originalParada, orden_visita: currentDeliveryOrder++ });
          }
        });
        
        // Add back any paradas that were not optimizable (e.g. no coords, or not part of the lote)
        const optimizableIds = new Set(newOrderedParadasEdit.map(p => p.id));
        paradasEdit.forEach(originalParada => {
            if (!optimizableIds.has(originalParada.id!) && originalParada.id !== fixedPickupStop?.id && originalParada.envio_id) {
                newOrderedParadasEdit.push({ ...originalParada, orden_visita: currentDeliveryOrder++ });
            }
        });
        
        setParadasEdit(newOrderedParadasEdit);
        toast({ title: "Ruta Optimizada", description: "El orden de las paradas de entrega ha sido actualizado. Revise y guarde los cambios." });
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
  const deliveryParadasParaResumen = displayParadas.filter(p => p.envio_id && (isLoteRepartoForUI ? p.orden_visita !== 0 : true));


  const resumenParadas = {
    total: deliveryParadasParaResumen.length,
    pendientes: deliveryParadasParaResumen.filter(p => p.estado_parada === 'asignado' || p.estado_parada === 'pendiente_asignacion').length,
    entregadas: deliveryParadasParaResumen.filter(p => p.estado_parada === 'entregado').length,
    noEntregadas: deliveryParadasParaResumen.filter(p => p.estado_parada === 'no_entregado').length,
    canceladas: deliveryParadasParaResumen.filter(p => p.estado_parada === 'cancelado').length,
  };

  const isRepartoFinalizado = reparto.estado === 'completado' || reparto.estado === 'cancelado';
  
  const canOptimize = !isRepartoFinalizado && 
                      isMapsApiReady &&
                      googleMaps &&
                      (
                        (isLoteRepartoForUI && empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null && paradasEdit.filter(p => p.envio_id && p.envios?.latitud_destino != null && p.envios?.longitud_destino != null && (reparto.empresa_asociada_id ? (p.envios.empresa_origen_id === reparto.empresa_asociada_id || p.envios.clientes?.empresa_id === reparto.empresa_asociada_id) : true) ).length >= 2) ||
                        (!isLoteRepartoForUI && paradasEdit.filter(p => p.envio_id && p.envios?.latitud_origen != null && p.envios?.longitud_origen != null && p.envios?.latitud_destino != null && p.envios?.longitud_destino != null).length >= 2) // Need at least 2 full envios for meaningful multi-point optimization
                      );


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
            <Button onClick={handleOptimizeRoute} variant="outline" size="sm" disabled={!canOptimize || isLoading || isUpdating || isOptimizingRoute} className="min-w-[160px]">
                {isOptimizingRoute ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Sparkles size={14} className="mr-2"/>} Optimizar Ruta (IA)
            </Button>
            <Button onClick={fetchRepartoDetails} variant="outline" size="sm" disabled={isLoading || isUpdating || isOptimizingRoute} className="min-w-[120px]">
                <RefreshCw className={`mr-2 h-4 w-4 ${(isLoading || isUpdating || isOptimizingRoute) ? 'animate-spin' : ''}`} /> Refrescar
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-xl shadow-lg border border-border/50">
                <CardHeader className="border-b border-border/50">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div>
                    <CardTitle className="text-xl font-semibold text-primary">ID Reparto: {reparto.id?.substring(0, 8)}...</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-1">
                        Fecha: {reparto.fecha_reparto && isValid(new Date(reparto.fecha_reparto)) ? format(new Date(reparto.fecha_reparto), "PPP", { locale: es }) : 'N/A'}
                    </CardDescription>
                    </div>
                    <Badge variant="default" className={cn("text-sm font-semibold px-3 py-1 self-start sm:self-center", getEstadoBadgeVariant(reparto.estado))}>
                    {getEstadoDisplayName(reparto.estado)}
                    </Badge>
                </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <p className="flex items-center gap-2"><Truck size={18} className="text-muted-foreground"/><strong>Repartidor:</strong> {reparto.repartidores?.nombre || 'N/A'}</p>
                    <p className="flex items-center gap-2"><Building size={18} className="text-muted-foreground"/><strong>Empresa:</strong> {reparto.empresas?.nombre || 'Individual / Varios'}</p>
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
                <CardHeader className="border-b border-border/50">
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold text-primary"><MapPin size={24} /> Mapa del Reparto</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="h-[400px] md:h-[500px] rounded-md overflow-hidden border border-border shadow-inner">
                       <RepartoMapComponent 
                            paradas={paradasEdit} 
                            empresaOrigen={empresaOrigenParaMapa}
                            repartoId={repartoId!}
                            isLoteReparto={isLoteRepartoForUI}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm p-4 bg-muted/70 rounded-lg border border-border/50">
                        <div className="text-center sm:text-left"><strong>Total Entregas:</strong> <span className="font-semibold text-primary">{reparto ? resumenParadas.total : 'N/A'}</span></div>
                        <div className="text-center sm:text-left"><strong>Distancia Estimada:</strong> <span className="font-semibold text-primary">{reparto && isMapsApiReady ? (totalDistance !== null ? `${totalDistance.toFixed(2)} km` : 'Calculando...') : 'Mapa no disp.'}</span></div>
                        <div className="text-center sm:text-left"><strong>Tiempo Estimado:</strong> <span className="font-semibold text-primary text-muted-foreground">N/A</span></div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1">
            <Card className="rounded-xl shadow-lg border border-border/50 h-full flex flex-col">
                <CardHeader className="border-b border-border/50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle className="text-xl font-semibold text-primary">Paradas ({deliveryParadasParaResumen.length} entregas)</CardTitle>
                    {!isRepartoFinalizado && (
                      <Button onClick={handleSaveOrden} disabled={isUpdating || isOptimizingRoute || isLoading} size="sm" className="w-full sm:w-auto">
                        {(isUpdating || isOptimizingRoute || isLoading) ? <Loader2 className="animate-spin mr-1 h-4 w-4"/> : <ClipboardEdit size={14} className="mr-1"/>} Guardar Orden
                      </Button>
                    )}
                </div>
                <CardDescription className="mt-1 text-xs">Gestiona el orden y estado de cada parada. La parada "Origen" es fija.</CardDescription>
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
                    <ScrollArea className="h-[calc(100vh-15rem)] md:h-[calc(100vh-22rem)] lg:h-auto lg:max-h-[calc(100vh-25rem)]">
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
                            <TableRow key={parada.id} className={cn(parada.orden_visita === 0 && !parada.envio_id && "bg-muted/30 hover:bg-muted/40")}>
                            <TableCell className="px-2 py-2 text-center align-top">
                                {parada.orden_visita === 0 && !parada.envio_id ? (
                                    <Badge variant="outline" className="font-semibold text-muted-foreground border-muted-foreground/50">Origen</Badge>
                                ) : (
                                    <Input 
                                        type="number"
                                        value={parada.orden_visita ?? ""}
                                        onChange={(e) => handleOrdenChange(parada.id!, e.target.value)}
                                        className="w-14 h-8 text-center px-1 text-xs"
                                        disabled={isUpdating || isRepartoFinalizado || isOptimizingRoute || isLoading || (parada.orden_visita === 0 && !parada.envio_id)}
                                        min="1"
                                    />
                                )}
                            </TableCell>
                            <TableCell className="px-2 py-2 align-top">
                                <div className="flex items-start gap-1.5">
                                <MapPin size={16} className={cn("mt-0.5 shrink-0", parada.envio_id ? "text-red-500" : (parada.orden_visita === 0 ? "text-blue-500" : "text-gray-500"))}/> 
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm leading-tight">
                                        {parada.envio_id ? parada.envios?.direccion_destino : parada.descripcion_parada}
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
                                {parada.orden_visita === 0 && parada.envio_id === null ? (
                                    <Badge variant="outline" className="border-muted-foreground/50">N/A (Retiro)</Badge>
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
                                        .filter(e => e !== 'pendiente_asignacion') // No se puede volver a "pendiente_asignacion" desde aquí
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

    