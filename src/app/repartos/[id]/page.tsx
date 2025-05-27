
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
            id: `empresa-origen-${reparto.empresas.id}`,
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
    setIsUpdating(true); // Also set updating to disable buttons during fetch
    try {
      const { reparto: data, error } = await getRepartoByIdAction(repartoId);
      if (error || !data) {
        toast({ title: "Error al Cargar Reparto", description: error || "Reparto no encontrado.", variant: "destructive" });
        router.push('/repartos');
        return;
      }
      
      let repartoDataWithDate = { ...data };
      if (data.fecha_reparto && typeof data.fecha_reparto === 'string') {
        const parsedDate = parseISO(data.fecha_reparto); // parseISO handles YYYY-MM-DD
        if (isValid(parsedDate)) {
          repartoDataWithDate.fecha_reparto = parsedDate;
        } else {
          console.warn("Invalid date string for fecha_reparto in fetchRepartoDetails:", data.fecha_reparto);
          repartoDataWithDate.fecha_reparto = new Date(); 
        }
      }
      
      let rawParadas = repartoDataWithDate.paradas_reparto || [];
      let finalParadas: ParadaConDetalles[] = [];
      let pickupStopIndex = -1;

      // Find and potentially create/move the "Retiro en empresa" stop
      let fixedPickupStop: ParadaConDetalles | undefined = rawParadas.find((p, index) => {
        if (!p.envio_id && p.descripcion_parada?.toLowerCase().includes('retiro en')) {
          pickupStopIndex = index;
          return true;
        }
        return false;
      });

      if (!fixedPickupStop && repartoDataWithDate.empresa_asociada_id && empresaOrigenParaMapa) {
        // If it's a lot delivery and no explicit "Retiro" parada exists, synthesize one
        fixedPickupStop = {
            id: `synthetic-pickup-${repartoDataWithDate.id}`,
            reparto_id: repartoDataWithDate.id!,
            envio_id: null, 
            descripcion_parada: `Retiro en ${empresaOrigenParaMapa.nombre}`,
            orden_visita: 0,
            estado_parada: 'asignado',
            hora_estimada_llegada: null, hora_real_llegada: null, notas_parada: null,
            created_at: repartoDataWithDate.created_at || new Date().toISOString(), 
            updated_at: repartoDataWithDate.updated_at || new Date().toISOString(), 
            user_id: null, envios: null,
        };
      } else if (fixedPickupStop) {
        // If found, ensure its order is 0
        fixedPickupStop.orden_visita = 0;
        if (pickupStopIndex !== -1) {
            rawParadas.splice(pickupStopIndex, 1); // Remove from original position
        }
      }

      if (fixedPickupStop) {
        finalParadas.push(fixedPickupStop);
      }
      
      // Add delivery stops and re-number them starting from 1
      const deliveryStops = rawParadas
          .filter(p => p.envio_id) // Only delivery stops
          .sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity))
          .map((stop, index) => ({ ...stop, orden_visita: index + 1 })); 
      
      finalParadas.push(...deliveryStops);
      
      setReparto({...repartoDataWithDate, paradas_reparto: finalParadas});
      setParadasEdit(finalParadas);

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
    if (!isMapsApiReady || !googleMaps || !reparto || paradasEdit.length < 1) { // Need at least one stop (origin)
      setTotalDistance(null);
      return;
    }

    let distance = 0;
    const pointsToCalculate: google.maps.LatLngLiteral[] = [];
    
    const sortedParadasForDistance = [...paradasEdit].sort((a,b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));
    
    // Add origin (empresa) if it exists and has coordinates
    if (empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
        pointsToCalculate.push({ lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud });
    }
    
    // Add delivery stops with valid coordinates
    sortedParadasForDistance
      .filter(parada => parada.envio_id && parada.envios?.latitud_destino != null && parada.envios?.longitud_destino != null)
      .forEach(parada => {
           pointsToCalculate.push({ lat: parada.envios!.latitud_destino!, lng: parada.envios!.longitud_destino! });
       });

    if (pointsToCalculate.length < 2) { // Need at least two points to form a segment
        setTotalDistance(0);
        return;
    }
    
    for (let i = 0; i < pointsToCalculate.length - 1; i++) {
      const from = new googleMaps.maps.LatLng(pointsToCalculate[i]);
      const to = new googleMaps.maps.LatLng(pointsToCalculate[i + 1]);
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
        // Only allow changing order for delivery stops (envio_id exists)
        if (p.id === paradaId && p.envio_id && (p.orden_visita !== 0 || p.orden_visita === null)) { 
          return { ...p, orden_visita: (nuevoOrden !== null && !isNaN(nuevoOrden) && nuevoOrden >=1) ? nuevoOrden : p.orden_visita }; 
        }
        return p;
      })
    );
  };

  const handleSaveOrden = async () => {
    if (!reparto || !repartoId) return;

    // Filter out the origin stop (orden_visita === 0) for validation of delivery stops
    const deliveryParadasParaGuardar = paradasEdit.filter(p => p.envio_id && p.orden_visita !== 0 && p.orden_visita !== null && p.orden_visita !== undefined);
    
    if (deliveryParadasParaGuardar.some(p => p.orden_visita === null || p.orden_visita === undefined || p.orden_visita <= 0)) {
      toast({ title: "Error de Orden", description: "Todas las paradas de entrega deben tener un número de orden positivo.", variant: "destructive"});
      return;
    }
    const orderNumbers = deliveryParadasParaGuardar.map(p => p.orden_visita) as number[];
    const hasDuplicates = new Set(orderNumbers).size !== orderNumbers.length;
    if (hasDuplicates) {
      toast({ title: "Error de Orden", description: "Los números de orden de las paradas de entrega deben ser únicos.", variant: "destructive"});
      return;
    }
    
    // Ensure the full paradasEdit list (including origin if present) is sorted before extracting IDs
    const allParadaIdsInNewOrder = [...paradasEdit] // Create a copy to sort
      .sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity))
      .map(p => p.id!);

    setIsUpdating(true);
    const result = await reorderParadasAction(repartoId, allParadaIdsInNewOrder); 
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

    // 1. Identify the fixed origin stop (parada 0)
    const fixedOriginParada = paradasEdit.find(p => p.orden_visita === 0);
    let originMappableStop: MappableStop | null = null;

    if (fixedOriginParada && empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
        originMappableStop = { id: fixedOriginParada.id!, location: { lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud } };
    } else if (!fixedOriginParada && empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
        // Case for lote repartos where origin is implicit via empresa_asociada_id
        // For the API, we need an ID. We can use a placeholder.
        originMappableStop = { id: 'ORIGIN_EMPRESA_ANCHOR', location: { lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud } };
    }

    if (!originMappableStop) {
      toast({ title: "Error de Origen", description: "No se puede optimizar sin una parada de empresa válida (orden 0) con coordenadas.", variant: "destructive" });
      setIsOptimizingRoute(false);
      return;
    }
    
    // 2. Filter for optimizable delivery paradas (associated with the reparto's empresa if it's a company-specific reparto)
    const optimizableDeliveryParadas = paradasEdit.filter(p =>
      p.envio_id && // Must be a delivery
      p.id !== originMappableStop?.id && // Not the origin stop itself if it was an actual parada
      p.envios?.latitud_destino != null &&
      p.envios?.longitud_destino != null &&
      // If reparto is linked to an empresa, only include envios for that empresa
      // Assuming envios for a company lot will have empresa_origen_id set to the company
      // or the client is linked to that company. This logic might need adjustment based on your exact data model for envios in a lote.
      (!reparto.empresa_asociada_id || // If not a company-specific reparto, all valid client deliveries are optimizable
       (reparto.empresa_asociada_id && ((p.envios as EnvioConDetalles)?.empresas_origen?.id === reparto.empresa_asociada_id || (p.envios as EnvioConDetalles)?.clientes?.empresa_id === reparto.empresa_asociada_id)) ||
       (reparto.empresa_asociada_id && !(p.envios as EnvioConDetalles)?.empresas_origen?.id && !(p.envios as EnvioConDetalles)?.clientes?.empresa_id) // Allow if no company info on envio but reparto is company specific (less ideal)
      )
    );

    if (optimizableDeliveryParadas.length < 2) {
      toast({ title: "Optimización no necesaria", description: "Se necesitan al menos dos paradas de cliente (asociadas a la empresa, si aplica) con ubicación válida para optimizar después del origen.", variant: "default" });
      setIsOptimizingRoute(false);
      return;
    }
    
    const deliveryMappableStops = optimizableDeliveryParadas.map(p => ({
        id: p.id!,
        location: { lat: p.envios!.latitud_destino!, lng: p.envios!.longitud_destino! }
    }));

    const pointsForGoogleApi: MappableStop[] = [originMappableStop, ...deliveryMappableStops];

    try {
      const optimizedStopsFromApi = await optimizeDeliveryRoute(pointsForGoogleApi);
      
      if (optimizedStopsFromApi && optimizedStopsFromApi.length > 0) {
        const originalParadasMap = new Map(paradasEdit.map(p => [p.id!, p]));
        let newOrderedParadasEdit: ParadaConDetalles[] = [];
        let currentOrderCounter = 0;

        // Add the fixed origin stop first (the one that was used as originMappableStop)
        const actualOriginParadaForList = paradasEdit.find(p => p.id === originMappableStop!.id || (originMappableStop!.id === 'ORIGIN_EMPRESA_ANCHOR' && !p.envio_id));
        if (actualOriginParadaForList) {
            newOrderedParadasEdit.push({ ...actualOriginParadaForList, orden_visita: 0 });
            currentOrderCounter = 1; // Next delivery stop will be 1
        } else {
            // Fallback if somehow the explicit origin stop wasn't found in paradasEdit (should not happen if logic is correct)
            console.warn("Origin stop for optimization not found in paradasEdit during reordering.");
        }
        
        // Add optimized delivery stops, skipping the first one from API (as it was the origin)
        const optimizedDeliveryStopIds = optimizedStopsFromApi
            .slice(1) // Skip the origin point returned by Google
            .map(stop => stop.id);

        for (const optimizedId of optimizedDeliveryStopIds) {
            const originalParada = originalParadasMap.get(optimizedId);
            if (originalParada && originalParada.envio_id) { // Ensure it's a delivery stop
                // Avoid re-adding if it was the fixed origin parada object (though IDs should differ from 'ORIGIN_EMPRESA_ANCHOR')
                if (!newOrderedParadasEdit.find(p => p.id === originalParada.id)) {
                    newOrderedParadasEdit.push({ ...originalParada, orden_visita: currentOrderCounter++ });
                }
            }
        }
        
        // Add back any paradas that were not part of the optimization (e.g., no coords, or not for this empresa)
        // This also ensures that if a parada was the *fixed origin* (and thus not in deliveryMappableStops), it's already at the start.
        const processedIdsInOptimizedList = new Set(newOrderedParadasEdit.map(p => p.id!));
        paradasEdit.forEach(originalParada => {
          if (originalParada.envio_id && !processedIdsInOptimizedList.has(originalParada.id!)) { 
            // This parada was a delivery but wasn't in the optimized list (e.g., no coords, or filtered out pre-API call)
            // Add it to the end, keeping its original order relative to other such paradas (if any)
            newOrderedParadasEdit.push({ ...originalParada, orden_visita: currentOrderCounter++ });
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
  const deliveryParadasParaResumen = displayParadas.filter(p => p.envio_id && p.orden_visita !== 0);

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
                      ( (paradasEdit.find(p=>p.orden_visita === 0) && empresaOrigenParaMapa?.latitud != null) || 
                        (!paradasEdit.find(p=>p.orden_visita === 0) && empresaOrigenParaMapa?.latitud != null) ||
                        (!empresaOrigenParaMapa && paradasEdit.find(p => p.envio_id && p.envios?.latitud_destino != null)) // Case for individual reparto, origin is first delivery
                      ) &&
                      paradasEdit.filter(p => 
                        p.envio_id && 
                        p.envios?.latitud_destino != null && 
                        (!reparto.empresa_asociada_id || 
                         (reparto.empresa_asociada_id && ((p.envios as EnvioConDetalles)?.empresas_origen?.id === reparto.empresa_asociada_id || (p.envios as EnvioConDetalles)?.clientes?.empresa_id === reparto.empresa_asociada_id)) ||
                         (reparto.empresa_asociada_id && !(p.envios as EnvioConDetalles)?.empresas_origen?.id && !(p.envios as EnvioConDetalles)?.clientes?.empresa_id)
                        )
                      ).length >= 2;


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
                        Fecha: {reparto.fecha_reparto && isValid(reparto.fecha_reparto) ? format(reparto.fecha_reparto, "PPP", { locale: es }) : 'N/A'}
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
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold text-primary"><Route size={24} /> Mapa del Reparto</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="h-[400px] md:h-[500px] rounded-md overflow-hidden border border-border shadow-inner">
                       <RepartoMapComponent 
                            paradas={paradasEdit} 
                            empresaOrigen={empresaOrigenParaMapa}
                            repartoId={repartoId!}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm p-4 bg-muted/70 rounded-lg border border-border/50">
                        <div className="text-center sm:text-left"><strong>Total Entregas:</strong> <span className="font-semibold text-primary">{resumenParadas.total}</span></div>
                        <div className="text-center sm:text-left"><strong>Distancia Estimada:</strong> <span className="font-semibold text-primary">{totalDistance !== null ? `${totalDistance.toFixed(2)} km` : (isMapsApiReady ? 'Calculando...' : 'Mapa no disp.')}</span></div>
                        <div className="text-center sm:text-left"><strong>Tiempo Estimado:</strong> <span className="font-semibold text-primary text-muted-foreground">N/A</span></div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1">
            <Card className="rounded-xl shadow-lg border border-border/50 h-full flex flex-col">
                <CardHeader className="border-b border-border/50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle className="text-xl font-semibold text-primary">Paradas ({resumenParadas.total} entregas)</CardTitle>
                    {!isRepartoFinalizado && (
                      <Button onClick={handleSaveOrden} disabled={isUpdating || isOptimizingRoute || isLoading} size="sm" className="w-full sm:w-auto">
                        {(isUpdating || isOptimizingRoute || isLoading) ? <Loader2 className="animate-spin mr-1 h-4 w-4"/> : <ClipboardEdit size={14} className="mr-1"/>} Guardar Orden
                      </Button>
                    )}
                </div>
                <CardDescription className="mt-1 text-xs">Gestiona el orden y estado de cada parada. La parada "Origen" (orden 0) es fija.</CardDescription>
                 <div className="mt-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-muted-foreground">
                    <span>Entregadas: {resumenParadas.entregadas}</span>
                    <span>Pendientes: {resumenParadas.pendientes}</span>
                    <span>No Ent.: {resumenParadas.noEntregadas}</span>
                    <span>Cancel.: {resumenParadas.canceladas}</span>
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
                            <TableRow key={parada.id} className={cn(parada.orden_visita === 0 && "bg-muted/30 hover:bg-muted/40")}>
                            <TableCell className="px-2 py-2 text-center align-top">
                                {parada.orden_visita === 0 ? (
                                    <Badge variant="outline" className="font-semibold text-muted-foreground border-muted-foreground/50">Origen</Badge>
                                ) : (
                                    <Input 
                                        type="number"
                                        value={parada.orden_visita ?? ""}
                                        onChange={(e) => handleOrdenChange(parada.id!, e.target.value)}
                                        className="w-14 h-8 text-center px-1 text-xs"
                                        disabled={isUpdating || isRepartoFinalizado || isOptimizingRoute || isLoading}
                                        min="1"
                                    />
                                )}
                            </TableCell>
                            <TableCell className="px-2 py-2 align-top">
                                <div className="flex items-start gap-1.5">
                                <MapPin size={16} className="text-muted-foreground mt-0.5 shrink-0"/> 
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm leading-tight">
                                        {parada.envio_id ? parada.envios?.direccion_destino : parada.descripcion_parada}
                                    </span>
                                    {parada.envio_id && (
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
                                    <Badge variant="outline" className="border-muted-foreground/50">N/A</Badge>
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
                                        .filter(e => e !== 'pendiente_asignacion' && e !== 'asignado' || parada.estado_parada === 'asignado') 
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

```