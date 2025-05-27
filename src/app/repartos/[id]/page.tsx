
"use client";

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building, CheckCircle, ClipboardEdit, InfoIcon, Loader2, MapPin, Package, Play, RefreshCw, Route, Sparkles, Truck, User, XCircle } from "lucide-react";
import { getRepartoByIdAction, updateRepartoEstadoAction, updateParadaEstadoAction, reorderParadasAction } from '@/actions/reparto-actions';
import type { RepartoConDetalles, ParadaConDetalles, EstadoReparto, EstadoEnvio, Empresa, MappableStop } from '@/lib/schemas';
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
  
  // const resolvedParams = React.use(paramsProp);
  // const repartoId = resolvedParams.id;
  // Reverting React.use as it might cause issues if params is not always a promise
  // and the warning it addresses is for future compatibility.
  // Direct access for now, assuming paramsProp is resolved.
  const [repartoId, setRepartoId] = React.useState<string | null>(null);


  const [reparto, setReparto] = React.useState<(RepartoConDetalles & { paradas: ParadaConDetalles[] }) | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [paradasEdit, setParadasEdit] = React.useState<ParadaConDetalles[]>([]);
  const [totalDistance, setTotalDistance] = React.useState<number | null>(null);
  const [googleMaps, setGoogleMaps] = React.useState<typeof google | null>(null);
  const [isMapsApiReady, setIsMapsApiReady] = React.useState(false);
  const [isOptimizingRoute, setIsOptimizingRoute] = React.useState(false);


  React.useEffect(() => {
    const resolveParams = async () => {
      const resolved = await paramsProp;
      setRepartoId(resolved.id);
    };
    resolveParams();
  }, [paramsProp]);


  const empresaOrigenParaMapa = React.useMemo(() => {
    if (!reparto) return undefined;
    // Prioritize an explicit "Retiro en empresa" parada if it exists and has its own description
    // This might be less common if empresa_asociada_id is always the true origin.
    const retiroStop = reparto.paradas_reparto?.find(p => !p.envio_id && p.descripcion_parada?.toLowerCase().includes('retiro en'));
    
    if (retiroStop && reparto.empresas && reparto.empresas.latitud != null && reparto.empresas.longitud != null) {
        // If there's a retiroStop AND an associated empresa, use the empresa's details for the map marker.
        // The retiroStop.id helps in reordering if it's part of the optimizable list.
        return {
            id: retiroStop.id || `empresa-${reparto.empresas.id}`, // Fallback ID if retiroStop.id is null
            latitud: reparto.empresas.latitud,
            longitud: reparto.empresas.longitud,
            nombre: reparto.empresas.nombre,
            direccion: reparto.empresas.direccion,
        };
    } else if (reparto.empresa_asociada_id && reparto.empresas && reparto.empresas.latitud != null && reparto.empresas.longitud != null) {
      // This is for "Reparto por Lote" where the origin is the associated empresa
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
    try {
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
           repartoDataWithDate.fecha_reparto = new Date(); 
        }
      }
      
      let rawParadas = repartoDataWithDate.paradas_reparto || [];
      let finalParadas: ParadaConDetalles[] = [];
      let deliveryStopOrderCounter = 1; 
      
      const explicitRetiroStop = rawParadas.find(p => !p.envio_id && p.descripcion_parada?.toLowerCase().includes('retiro en'));

      if (explicitRetiroStop) {
        finalParadas.push({...explicitRetiroStop, orden_visita: 0 }); // Assign 0 to explicit retiro
      } else if (repartoDataWithDate.empresa_asociada_id && repartoDataWithDate.empresas) {
        // If it's a lote and no explicit retiro, synthesize one for display consistency
        finalParadas.push({
            id: `synthetic-pickup-${repartoDataWithDate.id}`,
            reparto_id: repartoDataWithDate.id!,
            envio_id: null,
            descripcion_parada: `Retiro en ${repartoDataWithDate.empresas.nombre}`,
            orden_visita: 0,
            estado_parada: 'asignado',
            // ... other ParadaReparto fields as null or defaults
            hora_estimada_llegada: null, hora_real_llegada: null, notas_parada: null,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: null, envios: null,
        });
      }
  
      const deliveryStops = rawParadas
          .filter(p => p.envio_id && p.id !== explicitRetiroStop?.id) // Exclude already added explicit retiro
          .sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity)) 
          .map(stop => ({ ...stop, orden_visita: deliveryStopOrderCounter++ }));
      
      finalParadas.push(...deliveryStops);
      
      setReparto({...repartoDataWithDate, paradas: finalParadas});
      setParadasEdit(finalParadas);

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

    let distance = 0;
    const pointsToCalculate: google.maps.LatLngLiteral[] = [];
    
    // Start with the empresaOrigen if available and valid
    if (empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
        pointsToCalculate.push({ lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud });
    }
    
    // Add delivery stops in their current order
    paradasEdit
      .filter(parada => parada.envio_id && parada.envios?.latitud_destino != null && parada.envios?.longitud_destino != null)
      .sort((a,b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity))
      .forEach(parada => {
           pointsToCalculate.push({ lat: parada.envios!.latitud_destino!, lng: parada.envios!.longitud_destino! });
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
      case 'en_curso': 
      case 'en_camino':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
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
        if (p.id === paradaId && p.envio_id && (p.orden_visita !== 0 || p.orden_visita === null)) { // Allow editing if it's a delivery stop
          return { ...p, orden_visita: (nuevoOrden !== null && !isNaN(nuevoOrden) && nuevoOrden >=1) ? nuevoOrden : p.orden_visita }; 
        }
        return p;
      })
    );
  };

  const handleSaveOrden = async () => {
    if (!reparto || !repartoId) return;

    const deliveryParadasParaGuardar = paradasEdit.filter(p => p.envio_id && p.orden_visita !== null && p.orden_visita !== undefined && p.orden_visita > 0);
    const orderNumbers = deliveryParadasParaGuardar.map(p => p.orden_visita) as number[];
    
    if (deliveryParadasParaGuardar.some(p => p.orden_visita === null || p.orden_visita === undefined || p.orden_visita <= 0)) {
      toast({ title: "Error de Orden", description: "Todas las paradas de entrega deben tener un número de orden positivo.", variant: "destructive"});
      return;
    }
    const hasDuplicates = new Set(orderNumbers).size !== orderNumbers.length;
    if (hasDuplicates) {
      toast({ title: "Error de Orden", description: "Los números de orden de las paradas de entrega deben ser únicos.", variant: "destructive"});
      return;
    }
    
    const sortedDeliveryParadaIds = deliveryParadasParaGuardar
      .sort((a, b) => (a.orden_visita!) - (b.orden_visita!))
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

    let originMappableStop: MappableStop | null = null;
    
    // 1. Find the fixed origin (parada 0)
    const fixedOriginParada = paradasEdit.find(p => p.orden_visita === 0);

    if (fixedOriginParada && empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
        originMappableStop = { id: fixedOriginParada.id!, location: { lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud } };
    } else if (!fixedOriginParada && empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null) {
        // Case for lote reparto where "Retiro" stop might be synthesized or missing, use empresaOrigenParaMapa
        originMappableStop = { id: 'ORIGIN_EMPRESA_ANCHOR', location: { lat: empresaOrigenParaMapa.latitud, lng: empresaOrigenParaMapa.longitud } };
    }

    if (!originMappableStop) {
      toast({ title: "Error de Origen", description: "No se puede optimizar sin una parada de empresa/origen válida con coordenadas.", variant: "destructive" });
      setIsOptimizingRoute(false);
      return;
    }
    
    // 2. Select optimizable delivery stops (orden > 0, valid coords, associated with the reparto's empresa if applicable)
    const optimizableDeliveryParadas = paradasEdit.filter(p =>
      p.envio_id &&
      p.orden_visita !== 0 && // Exclude the origin stop itself
      p.envios?.latitud_destino != null &&
      p.envios?.longitud_destino != null &&
      (!reparto.empresa_asociada_id || // If not a lote reparto, all client deliveries are optimizable
        (reparto.empresa_asociada_id && // If it is a lote reparto
          (p.envios?.empresa_origen_id === reparto.empresa_asociada_id || // Check if envio originates from the lote empresa OR
           (p.envios?.clientes && p.envios.clientes.empresa_id === reparto.empresa_asociada_id) // Client belongs to lote empresa
          )
        )
      )
    );

    if (optimizableDeliveryParadas.length < 2) {
      toast({ title: "Optimización no necesaria", description: "Se necesitan al menos dos paradas de cliente válidas y asociadas (si aplica) para optimizar después del origen.", variant: "default" });
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
      
      if (optimizedStopsFromApi && optimizedStopsFromApi.length > 1) { // Need at least origin + 1 destination
        const originalParadasMap = new Map(paradasEdit.map(p => [p.id!, p]));
        let newOrderedParadas: ParadaConDetalles[] = [];
        
        // Add the fixed origin stop first (parada 0)
        const originParadaToKeep = paradasEdit.find(p => p.orden_visita === 0 || p.id === originMappableStop?.id);
        if (originParadaToKeep) {
            newOrderedParadas.push({ ...originParadaToKeep, orden_visita: 0 });
        } else if (originMappableStop.id === 'ORIGIN_EMPRESA_ANCHOR' && empresaOrigenParaMapa) {
            // Synthesize if it was an anchor and no explicit stop exists in paradasEdit
             newOrderedParadas.push({
                id: `synthetic-pickup-${reparto.id}`, reparto_id: reparto.id!, envio_id: null,
                descripcion_parada: `Retiro en ${empresaOrigenParaMapa.nombre}`,
                orden_visita: 0, estado_parada: 'asignado',
                hora_estimada_llegada: null, hora_real_llegada: null, notas_parada: null,
                created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: null, envios: null
            });
        }


        // Add optimized delivery stops (API returns full list including origin/destination it used)
        // We skip the first element from API as it's the origin we already handled.
        let deliveryOrderCounter = 1;
        optimizedStopsFromApi.slice(1).forEach(optimizedStopApiData => {
          const originalParada = originalParadasMap.get(optimizedStopApiData.id);
          if (originalParada && originalParada.envio_id) { // Ensure it's a delivery stop
            newOrderedParadas.push({ ...originalParada, orden_visita: deliveryOrderCounter++ });
          }
        });
        
        // Add back any paradas that were not part of the optimization (e.g., no coords, or not for this empresa if filtered)
        const addedParadaIds = new Set(newOrderedParadas.map(p => p.id));
        paradasEdit.forEach(originalParada => {
          if (!addedParadaIds.has(originalParada.id!) && originalParada.envio_id) {
            newOrderedParadas.push({ ...originalParada, orden_visita: deliveryOrderCounter++ });
          }
        });
        
        setParadasEdit(newOrderedParadas);
        toast({ title: "Ruta Optimizada", description: "El orden de las paradas de entrega ha sido actualizado. Revise y guarde los cambios." });
      } else {
        toast({ title: "Error de Optimización", description: "No se pudo obtener una ruta optimizada o no hay paradas suficientes para optimizar.", variant: "destructive" });
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
    return <p className="text-center text-destructive">Reparto no encontrado.</p>;
  }

  const deliveryParadas = paradasEdit.filter(p => p.envio_id && p.orden_visita !== 0);
  const resumenParadas = {
    total: deliveryParadas.length,
    pendientes: deliveryParadas.filter(p => p.estado_parada === 'asignado' || p.estado_parada === 'pendiente_asignacion').length,
    entregadas: deliveryParadas.filter(p => p.estado_parada === 'entregado').length,
    noEntregadas: deliveryParadas.filter(p => p.estado_parada === 'no_entregado').length,
    canceladas: deliveryParadas.filter(p => p.estado_parada === 'cancelado').length,
  };

  const isRepartoFinalizado = reparto.estado === 'completado' || reparto.estado === 'cancelado';
  
  const optimizableClientStopsCount = paradasEdit.filter(p =>
    p.envio_id &&
    p.orden_visita !== 0 &&
    p.envios?.latitud_destino != null &&
    p.envios?.longitud_destino != null &&
    (!reparto.empresa_asociada_id ||
      (reparto.empresa_asociada_id &&
        (p.envios?.empresa_origen_id === reparto.empresa_asociada_id ||
         (p.envios?.clientes && p.envios.clientes.empresa_id === reparto.empresa_asociada_id)
        )
      )
    )
  ).length;

  const canOptimize = !isRepartoFinalizado && 
                      isMapsApiReady &&
                      empresaOrigenParaMapa?.latitud != null && empresaOrigenParaMapa?.longitud != null &&
                      optimizableClientStopsCount >= 2;


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
            <Button onClick={handleOptimizeRoute} variant="outline" size="sm" disabled={!canOptimize || isLoading || isUpdating || isOptimizingRoute}>
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
                        Fecha: {reparto.fecha_reparto && isValid(reparto.fecha_reparto) ? format(reparto.fecha_reparto, "PPP", { locale: es }) : 'N/A'}
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
                    <CardTitle className="text-primary">Paradas ({resumenParadas.total} entregas)</CardTitle>
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
                {paradasEdit.filter(p => p.envio_id || (p.orden_visita === 0 && p.descripcion_parada)).length === 0 ? ( 
                    <p className="text-muted-foreground text-center py-10 px-4">Este reparto no tiene paradas asignadas.</p>
                ) : (
                    <ScrollArea className="h-[calc(100vh-12rem)] sm:h-auto lg:max-h-[calc(100vh-20rem)]">
                    <Table className="text-xs sm:text-sm">
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[70px] px-2 py-2 text-center">Orden</TableHead>
                            <TableHead className="px-2 py-2">Destino/Descripción</TableHead>
                            <TableHead className="w-[160px] px-2 py-2">Estado Parada</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {paradasEdit.map((parada) => (
                            <TableRow key={parada.id}>
                            <TableCell className="px-2 py-2 text-center">
                                {(parada.orden_visita === 0 && !parada.envio_id) || (parada.id?.startsWith('synthetic-pickup') && !parada.envio_id) ? (
                                    <span className="font-semibold text-muted-foreground">Origen</span>
                                ) : (
                                    <Input 
                                        type="number"
                                        value={parada.orden_visita ?? ""}
                                        onChange={(e) => handleOrdenChange(parada.id!, e.target.value)}
                                        className="w-12 h-8 text-center px-1 text-xs"
                                        disabled={isUpdating || isRepartoFinalizado || isOptimizingRoute || parada.orden_visita === 0 || !parada.envio_id}
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
                                disabled={isUpdating || isRepartoFinalizado || isOptimizingRoute || !parada.envio_id || parada.orden_visita === 0 || parada.id?.startsWith('synthetic-pickup')}
                                >
                                <SelectTrigger className={cn("h-8 text-xs", getEstadoBadgeVariant(parada.estado_parada))}>
                                    <SelectValue placeholder="Estado..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {EstadoEnvioEnum.options.filter(e => e !== 'pendiente_asignacion' && e !== 'asignado' && parada.envio_id && parada.orden_visita !== 0 && !parada.id?.startsWith('synthetic-pickup')).map(estado => ( 
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

```