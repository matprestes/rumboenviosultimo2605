
"use client";

import * as React from 'react';
import type { ParadaConDetalles, Empresa } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react'; 
import { getGoogleMapsApi } from '@/services/google-maps-service'; // Ensure this is the only way API is loaded

interface RepartoMapComponentProps {
  paradas: ParadaConDetalles[];
  empresaOrigen?: Pick<Empresa, 'latitud' | 'longitud' | 'nombre' | 'direccion'> | null;
  repartoId: string;
}

const API_KEY_COMPONENT = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; // For component-level check
const MAR_DEL_PLATA_CENTER = { lat: -38.00228, lng: -57.55754 };

const PICKUP_COLOR = '#1E88E5'; // Blue for Pickup
const DELIVERY_COLOR = '#E53935'; // Red for Delivery
const DEFAULT_MARKER_COLOR = '#757575'; // Grey for others or if type unknown

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
      toast({ title: "Error de Configuración", description: "Falta la clave API de Google Maps.", variant: "destructive"});
      setIsLoadingMap(false);
      return;
    }

    getGoogleMapsApi().then((googleApi) => {
      setGoogleMaps(googleApi); // Store the google object
      if (mapRef.current && !map) {
        const newMap = new googleApi.maps.Map(mapRef.current, {
          center: MAR_DEL_PLATA_CENTER,
          zoom: 12,
          mapId: `REPARTO_MAP_${repartoId.substring(0,8)}`, 
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
  }, [repartoId, toast, map]); // map added to deps

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

    sortedParadas.forEach((parada, index) => {
      let position: google.maps.LatLngLiteral | null = null;
      let title = `Parada ${parada.orden_visita || index + 1}`;
      let infoContent = `<div style="font-family: sans-serif; padding: 5px; max-width: 250px; word-wrap: break-word;">`;
      infoContent += `<h4 style="margin:0 0 5px 0; font-size: 1em;">${title}</h4>`;
      let markerColor = DEFAULT_MARKER_COLOR;
      let labelText = `${parada.orden_visita || index + 1}`;

      if (!parada.envio_id && parada.descripcion_parada && empresaOrigen?.latitud && empresaOrigen?.longitud) {
        position = { lat: empresaOrigen.latitud, lng: empresaOrigen.longitud };
        title = `Retiro: ${empresaOrigen.nombre || parada.descripcion_parada}`;
        infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>${parada.descripcion_parada}</strong></p>`;
        infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;">${empresaOrigen.direccion || ''}</p>`;
        markerColor = PICKUP_COLOR;
        labelText = "P"; 
      } else if (parada.envios && parada.envios.latitud_destino != null && parada.envios.longitud_destino != null) {
        position = { lat: parada.envios.latitud_destino, lng: parada.envios.longitud_destino };
        title = `Entrega: ${parada.envios.direccion_destino || 'N/A'}`;
        infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Envío ID:</strong> ${parada.envio_id?.substring(0,8)}...</p>`;
        infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Destino:</strong> ${parada.envios.direccion_destino}</p>`;
        const clienteNombre = parada.envios.clientes?.nombre ? `${parada.envios.clientes.nombre} ${parada.envios.clientes.apellido}` : parada.envios.cliente_temporal_nombre;
        if (clienteNombre) {
          infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Cliente:</strong> ${clienteNombre}</p>`;
        }
        infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Estado Parada:</strong> ${parada.estado_parada || 'N/A'}</p>`;
        markerColor = DELIVERY_COLOR;
      }
      
      infoContent += `</div>`;

      if (position) {
        pathCoordinates.push(position);
        bounds.extend(position);

        const marker = new googleMaps.maps.Marker({
          position,
          map,
          label: {
            text: labelText,
            color: "white",
            fontSize: "10px",
            fontWeight: "bold",
          },
          icon: {
            path: googleMaps.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: markerColor,
            fillOpacity: 0.9,
            strokeColor: "white",
            strokeWeight: 1.5,
          },
          title,
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
        strokeColor: '#4285F4', 
        strokeOpacity: 0.8,
        strokeWeight: 3,
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
    } else if (newMarkers.length === 0 && map) {
       map.setCenter(MAR_DEL_PLATA_CENTER);
       map.setZoom(12);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, googleMaps, paradas, empresaOrigen, infoWindow]);

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
        <p className="text-destructive">La API Key de Google Maps no está configurada. El mapa no se puede mostrar.</p>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full rounded-md shadow-sm aspect-video" style={{ minHeight: '300px' }} />;
}
