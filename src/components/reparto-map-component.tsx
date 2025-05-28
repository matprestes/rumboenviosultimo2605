
"use client";

import * as React from 'react';
import type { ParadaConDetalles, Empresa } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from "lucide-react"; 
import { getGoogleMapsApi } from '@/services/google-maps-service';

interface RepartoMapComponentProps {
  paradas: ParadaConDetalles[];
  empresaOrigen?: Pick<Empresa, 'id' | 'latitud' | 'longitud' | 'nombre' | 'direccion'> | null;
  repartoId: string;
  isLoteReparto: boolean;
}

const API_KEY_COMPONENT = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAR_DEL_PLATA_CENTER = { lat: -38.00228, lng: -57.55754 };
const RUMBOS_ENVIOS_MAP_ID = "RUMBOS_MAP_ID_REPARTO_DETAIL"; // Define your Map ID

const PICKUP_COLOR = '#1E88E5'; // Blue
const DELIVERY_COLOR = '#D32F2F'; // Red
const DEFAULT_MARKER_COLOR = '#757575'; 

export function RepartoMapComponent({ paradas, empresaOrigen, repartoId, isLoteReparto }: RepartoMapComponentProps) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [map, setMap] = React.useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = React.useState<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [polyline, setPolyline] = React.useState<google.maps.Polyline | null>(null);
  const [infoWindow, setInfoWindow] = React.useState<google.maps.InfoWindow | null>(null);
  const [isLoadingMap, setIsLoadingMap] = React.useState(true);
  const [googleMapsApi, setGoogleMapsApi] = React.useState<typeof google | null>(null);
  const [markerLibrary, setMarkerLibrary] = React.useState<google.maps.MarkerLibrary | null>(null);
  const [errorLoadingApi, setErrorLoadingApi] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!API_KEY_COMPONENT) {
      const errorMsg = "Falta la clave API de Google Maps. El mapa no se puede mostrar.";
      toast({ title: "Error de Configuración", description: errorMsg, variant: "destructive"});
      setErrorLoadingApi(errorMsg);
      setIsLoadingMap(false);
      return;
    }

    getGoogleMapsApi().then(async (googleApi) => {
      setGoogleMapsApi(googleApi);
      try {
        const lib = await googleApi.maps.importLibrary("marker") as google.maps.MarkerLibrary;
        setMarkerLibrary(lib);
        if (mapRef.current && !map) {
          const newMap = new googleApi.maps.Map(mapRef.current, {
            center: MAR_DEL_PLATA_CENTER,
            zoom: 12,
            mapId: RUMBOS_ENVIOS_MAP_ID,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
          setMap(newMap);
          setInfoWindow(new googleApi.maps.InfoWindow());
        }
        setErrorLoadingApi(null);
      } catch (e) {
        const errorMessage = (e as Error).message || "No se pudo cargar la librería de marcadores avanzados.";
        console.error("RepartoMapComponent: Error importing marker library:", errorMessage);
        toast({ title: "Error al cargar Mapa", description: errorMessage, variant: "destructive"});
        setErrorLoadingApi(errorMessage);
      } finally {
        setIsLoadingMap(false);
      }
    }).catch(e => {
      const errorMessage = (e as Error).message || "No se pudo inicializar Google Maps.";
      console.error("RepartoMapComponent: Fallo definitivo al cargar Google Maps API:", errorMessage);
      toast({ title: "Error al cargar Mapa", description: errorMessage, variant: "destructive"});
      setErrorLoadingApi(errorMessage);
      setIsLoadingMap(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repartoId]);

  React.useEffect(() => {
    if (!map || !googleMapsApi || !markerLibrary || !paradas || errorLoadingApi ) { 
      markers.forEach(marker => marker.map = null); // Use .map = null to remove AdvancedMarkerElement
      setMarkers([]);
      if (polyline) polyline.setMap(null);
      setPolyline(null);
      return;
    }
    
    markers.forEach(marker => marker.map = null);
    if (polyline) polyline.setMap(null);

    const { AdvancedMarkerElement, PinElement } = markerLibrary;
    const newMarkersArray: google.maps.marker.AdvancedMarkerElement[] = [];
    const pathCoordinates: google.maps.LatLngLiteral[] = [];
    const bounds = new googleMapsApi.maps.LatLngBounds();

    const sortedParadas = [...paradas].sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));
    
    // Handle Lote Reparto Origin
    if (isLoteReparto && empresaOrigen?.latitud != null && empresaOrigen?.longitud != null) {
      const pickupPosition = { lat: empresaOrigen.latitud, lng: empresaOrigen.longitud };
      pathCoordinates.push(pickupPosition);
      bounds.extend(pickupPosition);

      const pin = new PinElement({
        glyph: "P",
        glyphColor: "white",
        background: PICKUP_COLOR,
        borderColor: "white",
        scale: 1.2, // PinElement scale works differently, more like relative size
      });

      const pickupMarker = new AdvancedMarkerElement({
        position: pickupPosition,
        map,
        content: pin.element,
        title: `Retiro en: ${empresaOrigen.nombre}\n${empresaOrigen.direccion}`,
        zIndex: 100, 
      });
      pickupMarker.addListener('click', () => {
        if (infoWindow) {
          infoWindow.setContent(`
            <div style="font-family: sans-serif; padding: 5px; max-width: 250px; word-wrap: break-word;">
              <h4 style="margin:0 0 5px 0; font-size: 1em; color: ${PICKUP_COLOR};">Punto de Retiro (Empresa)</h4>
              <p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Empresa:</strong> ${empresaOrigen.nombre}</p>
              <p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Dirección:</strong> ${empresaOrigen.direccion || 'N/A'}</p>
            </div>
          `);
          infoWindow.open(map, pickupMarker);
        }
      });
      newMarkersArray.push(pickupMarker);
    }

    // Handle Delivery Stops (or Individual Reparto Stops)
    sortedParadas.forEach((parada) => {
      if (isLoteReparto && !parada.envio_id) { // Skip the virtual pickup stop if already handled by empresaOrigen
          const isVirtualPickupHandledByEmpresaOrigen = empresaOrigen?.latitud === (parada as any).latitud && empresaOrigen?.longitud === (parada as any).longitud;
          if (isVirtualPickupHandledByEmpresaOrigen) return;
      }

      let position: google.maps.LatLngLiteral | null = null;
      let markerTitle = `Parada ${parada.orden_visita || 'N/A'}`;
      let infoContent = `<div style="font-family: sans-serif; padding: 5px; max-width: 250px; word-wrap: break-word;">`;
      let markerColor = DEFAULT_MARKER_COLOR;
      let labelText = parada.orden_visita != null ? String(parada.orden_visita) : "?";
      let stopTypeDescription = "Parada General";

      if (parada.envio_id && parada.envios) { // This is a delivery stop
        stopTypeDescription = "Entrega Cliente";
        markerColor = DELIVERY_COLOR;
        if (parada.envios.latitud_destino != null && parada.envios.longitud_destino != null) {
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
        }
      } else if (!isLoteReparto && parada.envio_id && parada.envios) { // Individual reparto origin for an envío
        stopTypeDescription = "Retiro Envío";
        markerColor = PICKUP_COLOR;
        labelText = `P${labelText}`; // Prefix with P for pickup
        if (parada.envios.latitud_origen != null && parada.envios.longitud_origen != null) {
            position = {lat: parada.envios.latitud_origen, lng: parada.envios.longitud_origen };
            markerTitle = `Retiro: ${parada.envios.direccion_origen || 'N/A'} (Orden: ${parada.orden_visita})`;
            infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Envío ID:</strong> ${parada.envio_id.substring(0,8)}...</p>`;
            infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Origen:</strong> ${parada.envios.direccion_origen}</p>`;
        }
      }
      
      infoContent += `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Estado Parada:</strong> ${parada.estado_parada || 'N/A'}</p>`;
      infoContent = `<h4 style="margin:0 0 5px 0; font-size: 1em; color: ${markerColor};">${stopTypeDescription} (Orden ${labelText})</h4>` + infoContent;
      infoContent += `</div>`;

      if (position) {
        if (!isLoteReparto || parada.envio_id) { // Avoid adding company origin twice if it's already in pathCoordinates
            pathCoordinates.push(position);
        }
        bounds.extend(position);

        const pin = new PinElement({
          glyph: labelText,
          glyphColor: "white",
          background: markerColor,
          borderColor: "white",
          scale: 1.0, // Default scale
        });

        const marker = new AdvancedMarkerElement({
          position,
          map,
          content: pin.element,
          title: markerTitle,
          zIndex: parada.orden_visita || 1,
        });

        marker.addListener('click', () => {
          if (infoWindow) {
            infoWindow.setContent(infoContent);
            infoWindow.open(map, marker);
          }
        });
        newMarkersArray.push(marker);
      }
    });

    setMarkers(newMarkersArray);

    if (pathCoordinates.length > 1) {
      const newPolyline = new googleMapsApi.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#007bff', 
        strokeOpacity: 0.7,
        strokeWeight: 4,
        icons: [{
          icon: { path: googleMapsApi.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.5, strokeColor: '#007bff', strokeWeight: 0.5 },
          offset: '100%',
          repeat: '80px'
        }]
      });
      newPolyline.setMap(map);
      setPolyline(newPolyline);
    } else if (polyline) {
      polyline.setMap(null);
      setPolyline(null);
    }

    if (newMarkersArray.length > 0 && !bounds.isEmpty()) {
      map.fitBounds(bounds);
      if (newMarkersArray.length === 1 && map.getZoom() && map.getZoom() > 15) { 
        map.setZoom(15);
      }
    } else if (map) { 
       map.setCenter(MAR_DEL_PLATA_CENTER);
       map.setZoom(12);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, googleMapsApi, markerLibrary, paradas, empresaOrigen, isLoteReparto, errorLoadingApi]);

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
  
   if (!map || !googleMapsApi || !markerLibrary) { 
    return (
      <div className="w-full h-full flex justify-center items-center bg-muted/50 rounded-md aspect-video">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Inicializando API de mapa...</p>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full rounded-md shadow-sm" />;
}
