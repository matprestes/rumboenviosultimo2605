
"use client";

import * as React from 'react';
import type { ParadaConDetalles, Empresa, EnvioConDetalles } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from "lucide-react"; 
import { getGoogleMapsApi } from '@/services/google-maps-service';

interface RepartoMapComponentProps {
  paradas: ParadaConDetalles[];
  empresaOrigen?: Pick<Empresa, 'latitud' | 'longitud' | 'nombre' | 'direccion'> | null;
  repartoId: string;
}

const API_KEY_COMPONENT = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAR_DEL_PLATA_CENTER = { lat: -38.00228, lng: -57.55754 };

const PICKUP_COLOR = '#1E88E5'; // Blue for Pickup
const DELIVERY_COLOR = '#E53935'; // Red for Delivery
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

  React.useEffect(() => {
    if (!API_KEY_COMPONENT) {
      toast({ title: "Error de Configuración", description: "Falta la clave API de Google Maps para el mapa.", variant: "destructive"});
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
    }).catch(e => {
      console.error("Error loading Google Maps API in RepartoMapComponent:", e);
      toast({ title: "Error al cargar Mapa", description: "No se pudo inicializar Google Maps.", variant: "destructive"});
      setIsLoadingMap(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repartoId, toast]); // Map dependency removed to avoid re-init on internal map state change

  React.useEffect(() => {
    if (!map || !googleMaps?.maps?.SymbolPath || !paradas ) { 
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
    
    // Add empresaOrigen as the first point if it exists
    if (empresaOrigen?.latitud != null && empresaOrigen?.longitud != null) {
      const pickupPosition = { lat: empresaOrigen.latitud, lng: empresaOrigen.longitud };
      pathCoordinates.push(pickupPosition);
      bounds.extend(pickupPosition);
      const pickupMarker = new googleMaps.maps.Marker({
        position: pickupPosition,
        map,
        label: { text: "P", color: "white", fontSize: "11px", fontWeight: "bold" },
        icon: {
          path: googleMaps.maps.SymbolPath.CIRCLE, // Using a circle for pickup
          scale: 10,
          fillColor: PICKUP_COLOR,
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 1.5,
        },
        title: `Retiro en: ${empresaOrigen.nombre}\n${empresaOrigen.direccion}`,
        zIndex: 100, // Higher zIndex for pickup
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
        const clienteNombre = (parada.envios as EnvioConDetalles)?.clientes?.nombre 
            ? `${(parada.envios as EnvioConDetalles)?.clientes?.apellido}, ${(parada.envios as EnvioConDetalles)?.clientes?.nombre}` 
            : (parada.envios as EnvioConDetalles)?.cliente_temporal_nombre;
        if (clienteNombre) {
          infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Cliente:</strong> ${clienteNombre}</p>`;
        }
        infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Estado:</strong> ${parada.estado_parada || 'N/A'}</p>`;
        markerColor = DELIVERY_COLOR;
      } else if (!parada.envio_id && parada.descripcion_parada && !empresaOrigen) { // Generic non-envio stop, not the main empresaOrigen
        // This case needs coordinates on parada_reparto itself, or geocode parada.descripcion_parada
        // For now, it won't be mapped if it doesn't have its own coordinates and isn't the main empresa pickup
        console.warn("Parada sin envío y sin ser origen de empresa no se mapea:", parada.descripcion_parada);
      }
      
      infoContent += `</div>`;

      if (position) {
        if (!pathCoordinates.some(p => p.lat === position!.lat && p.lng === position!.lng) || !empresaOrigen) {
             // Only add to path if it's not the same as a previously added empresaOrigen (to avoid a 0-length segment at start if first delivery is empresa)
             // Or if there is no empresaOrigen, all delivery points are added.
            if (!(empresaOrigen?.latitud === position.lat && empresaOrigen?.longitud === position.lng)){
                pathCoordinates.push(position);
            }
        }
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
        strokeColor: '#007bff', // Blue for route
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
    } else if (map) { // map might still be null if API is not ready
       map.setCenter(MAR_DEL_PLATA_CENTER);
       map.setZoom(12);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, googleMaps, paradas, empresaOrigen, infoWindow]); // Removed toast from deps

  if (isLoadingMap && API_KEY_COMPONENT) {
    return (
      <div className="w-full h-full flex justify-center items-center bg-muted/50 rounded-md aspect-video">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando mapa...</p>
      </div>
    );
  }
  
  if (!API_KEY_COMPONENT) {
     return (
      <div className="w-full h-full flex justify-center items-center bg-destructive/10 rounded-md p-4 text-center aspect-video">
        <p className="text-destructive text-sm">La API Key de Google Maps no está configurada. El mapa no se puede mostrar.</p>
      </div>
    );
  }
   if (!map && !isLoadingMap) {
    return (
      <div className="w-full h-full flex justify-center items-center bg-muted/50 rounded-md aspect-video">
        <p className="text-destructive-foreground text-sm">No se pudo cargar el mapa. Verifique la consola.</p>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full rounded-md shadow-sm" />;
}
