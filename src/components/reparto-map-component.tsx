
"use client";

import * as React from 'react';
import type { ParadaConDetalles, Empresa } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from "lucide-react"; // Added AlertTriangle
import { getGoogleMapsApi } from '@/services/google-maps-service';

interface RepartoMapComponentProps {
  paradas: ParadaConDetalles[];
  empresaOrigen?: Pick<Empresa, 'id' | 'latitud' | 'longitud' | 'nombre' | 'direccion'> | null;
  repartoId: string;
}

const API_KEY_COMPONENT = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAR_DEL_PLATA_CENTER = { lat: -38.00228, lng: -57.55754 };

const PICKUP_COLOR = '#1E88E5'; 
const DELIVERY_COLOR = '#E53935'; 
const DEFAULT_MARKER_COLOR = '#757575'; 

export function RepartoMapComponent({ paradas, empresaOrigen, repartoId }: RepartoMapComponentProps) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [map, setMap] = React.useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = React.useState<google.maps.Marker[]>([]);
  const [polyline, setPolyline] = React.useState<google.maps.Polyline | null>(null);
  const [infoWindow, setInfoWindow] = React.useState<google.maps.InfoWindow | null>(null);
  const [isLoadingMap, setIsLoadingMap] = React.useState(true);
  const [googleMaps, setGoogleMaps] = React.useState<typeof google | null>(null);
  const [errorLoadingApi, setErrorLoadingApi] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!API_KEY_COMPONENT) {
      const errorMsg = "Falta la clave API de Google Maps. El mapa no se puede mostrar.";
      toast({ title: "Error de Configuración", description: errorMsg, variant: "destructive"});
      setErrorLoadingApi(errorMsg);
      setIsLoadingMap(false);
      return;
    }

    getGoogleMapsApi().then((googleApi) => {
      setGoogleMaps(googleApi);
      if (mapRef.current && !map) {
        const newMap = new googleApi.maps.Map(mapRef.current, {
          center: MAR_DEL_PLATA_CENTER,
          zoom: 12,
          mapId: `REPARTO_MAP_${repartoId.substring(0,8)}`, 
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        setMap(newMap);
        setInfoWindow(new googleApi.maps.InfoWindow());
      }
      setIsLoadingMap(false);
      setErrorLoadingApi(null);
    }).catch(e => {
      console.error("Error loading Google Maps API in RepartoMapComponent:", e);
      const errorMessage = (e as Error).message || "No se pudo inicializar Google Maps.";
      toast({ title: "Error al cargar Mapa", description: errorMessage, variant: "destructive"});
      setErrorLoadingApi(errorMessage);
      setIsLoadingMap(false);
      setGoogleMaps(null);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repartoId, toast]); 

  React.useEffect(() => {
    if (!map || !googleMaps?.maps?.SymbolPath || !paradas || errorLoadingApi ) { 
      markers.forEach(marker => marker.setMap(null));
      setMarkers([]);
      if (polyline) polyline.setMap(null);
      setPolyline(null);
      return;
    }
    
    markers.forEach(marker => marker.setMap(null));
    if (polyline) polyline.setMap(null);

    const newMarkers: google.maps.Marker[] = [];
    const pathCoordinates: google.maps.LatLngLiteral[] = [];
    const bounds = new googleMaps.maps.LatLngBounds();

    const sortedParadas = [...paradas].sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));
    
    const fixedPickupStop = sortedParadas.find(p => !p.envio_id && p.descripcion_parada?.toLowerCase().includes('retiro'));

    if (empresaOrigen?.latitud != null && empresaOrigen?.longitud != null) {
      const pickupPosition = { lat: empresaOrigen.latitud, lng: empresaOrigen.longitud };
      pathCoordinates.push(pickupPosition);
      bounds.extend(pickupPosition);
      const pickupMarker = new googleMaps.maps.Marker({
        position: pickupPosition,
        map,
        label: { text: "P", color: "white", fontSize: "11px", fontWeight: "bold" },
        icon: {
          path: googleMaps.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: PICKUP_COLOR,
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 1.5,
        },
        title: `Retiro en: ${empresaOrigen.nombre}\n${empresaOrigen.direccion}`,
        zIndex: 100,
      });
      pickupMarker.addListener('click', () => {
        if (infoWindow) {
          infoWindow.setContent(`
            <div style="font-family: sans-serif; padding: 5px; max-width: 250px; word-wrap: break-word;">
              <h4 style="margin:0 0 5px 0; font-size: 1em; color: ${PICKUP_COLOR};">Punto de Retiro</h4>
              <p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Empresa:</strong> ${empresaOrigen.nombre}</p>
              <p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Dirección:</strong> ${empresaOrigen.direccion}</p>
            </div>
          `);
          infoWindow.open(map, pickupMarker);
        }
      });
      newMarkers.push(pickupMarker);
    }


    sortedParadas.forEach((parada) => {
      // Skip if this is the fixed pickup stop and empresaOrigen was already mapped
      if (fixedPickupStop && parada.id === fixedPickupStop.id && empresaOrigen) {
        return;
      }

      let position: google.maps.LatLngLiteral | null = null;
      let markerTitle = `Parada ${parada.orden_visita || 'N/A'}`;
      let infoContent = `<div style="font-family: sans-serif; padding: 5px; max-width: 250px; word-wrap: break-word;">`;
      infoContent += `<h4 style="margin:0 0 5px 0; font-size: 1em;">${markerTitle}</h4>`;
      let markerColor = DEFAULT_MARKER_COLOR;
      let labelText = `${parada.orden_visita || '?'}`;

      if (parada.envio_id && parada.envios && parada.envios.latitud_destino != null && parada.envios.longitud_destino != null) {
        position = { lat: parada.envios.latitud_destino, lng: parada.envios.longitud_destino };
        markerTitle = `Entrega: ${parada.envios.direccion_destino || 'N/A'} (Orden: ${labelText})`;
        infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Envío ID:</strong> ${parada.envio_id.substring(0,8)}...</p>`;
        infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Destino:</strong> ${parada.envios.direccion_destino}</p>`;
        const clienteNombre = parada.envios.clientes?.nombre 
            ? `${parada.envios.clientes.apellido}, ${parada.envios.clientes.nombre}` 
            : parada.envios.cliente_temporal_nombre;
        if (clienteNombre) {
          infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Cliente:</strong> ${clienteNombre}</p>`;
        }
        infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Estado:</strong> ${parada.estado_parada || 'N/A'}</p>`;
        markerColor = DELIVERY_COLOR;
      } else if (!parada.envio_id && parada.descripcion_parada) { 
        // This is for other custom stops, if they had coordinates directly on parada_reparto (not currently implemented)
        // For now, only fixedPickupStop (via empresaOrigen) or envio_id stops get mapped.
        console.warn("Parada sin envío no se mapea a menos que sea el origen de empresa:", parada.descripcion_parada);
      }
      
      infoContent += `</div>`;

      if (position) {
        pathCoordinates.push(position);
        bounds.extend(position);

        const marker = new googleMaps.maps.Marker({
          position,
          map,
          label: { text: labelText, color: "white", fontSize: "10px", fontWeight: "bold" },
          icon: {
            path: googleMaps.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: markerColor,
            fillOpacity: 0.9,
            strokeColor: "white",
            strokeWeight: 1.5,
          },
          title: markerTitle,
        });

        marker.addListener('click', () => {
          if (infoWindow) {
            infoWindow.setContent(infoContent);
            infoWindow.open(map, marker);
          }
        });
        newMarkers.push(marker);
      }
    });

    setMarkers(newMarkers);

    if (pathCoordinates.length > 1) {
      const newPolyline = new googleMaps.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#007bff', 
        strokeOpacity: 0.7,
        strokeWeight: 4,
        icons: [{
          icon: { path: googleMaps.maps.SymbolPath.FORWARD_CLOSED_ARROW },
          offset: '100%',
          repeat: '100px'
        }]
      });
      newPolyline.setMap(map);
      setPolyline(newPolyline);
    } else if (polyline) {
      polyline.setMap(null);
      setPolyline(null);
    }

    if (newMarkers.length > 0 && !bounds.isEmpty()) {
      map.fitBounds(bounds);
      if (newMarkers.length === 1 && map.getZoom() && map.getZoom() > 15) { 
        map.setZoom(15);
      }
    } else if (map) { 
       map.setCenter(MAR_DEL_PLATA_CENTER);
       map.setZoom(12);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, googleMaps, paradas, empresaOrigen, infoWindow, errorLoadingApi]); 

  if (isLoadingMap && API_KEY_COMPONENT) {
    return (
      <div className="w-full h-full flex justify-center items-center bg-muted/50 rounded-md aspect-video">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando mapa...</p>
      </div>
    );
  }
  
  if (!API_KEY_COMPONENT || errorLoadingApi) {
     return (
      <div className="w-full h-full flex flex-col justify-center items-center bg-destructive/10 rounded-md p-4 text-center aspect-video">
        <AlertTriangle className="h-12 w-12 text-destructive mb-2" />
        <p className="text-destructive font-semibold">Error al cargar el mapa</p>
        <p className="text-destructive/80 text-sm mt-1">{errorLoadingApi || "La API Key de Google Maps no está configurada."}</p>
      </div>
    );
  }
  
   if (!map || !googleMaps) { 
    return (
      <div className="w-full h-full flex justify-center items-center bg-muted/50 rounded-md aspect-video">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Inicializando mapa...</p>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full rounded-md shadow-sm" />;
}

    