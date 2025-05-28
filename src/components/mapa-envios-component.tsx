
"use client";

import * as React from 'react';
import type { UnassignedEnvioListItem } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from "lucide-react"; 
import { getGoogleMapsApi } from '@/services/google-maps-service';

interface MapaEnviosComponentProps {
  unassignedEnvios: UnassignedEnvioListItem[];
  onUnassignedEnvioSelect: (envio: UnassignedEnvioListItem) => void;
  selectedEnvioId?: string | null;
}

const API_KEY_COMPONENT = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAR_DEL_PLATA_CENTER = { lat: -38.00228, lng: -57.55754 };
const RUMBOS_ENVIOS_MAP_ID_ASIGNACION = "RUMBOS_MAP_ID_ASIGNACION"; 

const UNASSIGNED_COLOR = '#FF5722'; // Orange
const SELECTED_UNASSIGNED_COLOR = '#FFC107'; // Amber/Yellow

export function MapaEnviosComponent({ 
  unassignedEnvios, 
  onUnassignedEnvioSelect,
  selectedEnvioId
}: MapaEnviosComponentProps) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [map, setMap] = React.useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = React.useState<google.maps.marker.AdvancedMarkerElement[]>([]);
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
            mapId: RUMBOS_ENVIOS_MAP_ID_ASIGNACION,
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
        console.error("MapaEnviosComponent: Error importing marker library:", errorMessage);
        toast({ title: "Error al cargar Mapa", description: errorMessage, variant: "destructive"});
        setErrorLoadingApi(errorMessage);
      } finally {
        setIsLoadingMap(false);
      }
    }).catch(e => {
      const errorMessage = (e as Error).message || "No se pudo inicializar Google Maps.";
      console.error("MapaEnviosComponent: Fallo definitivo al cargar Google Maps API:", errorMessage);
      toast({ title: "Error al cargar Mapa", description: errorMessage, variant: "destructive"});
      setErrorLoadingApi(errorMessage);
      setIsLoadingMap(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  React.useEffect(() => {
    if (!map || !googleMapsApi || !markerLibrary || !unassignedEnvios || errorLoadingApi) {
        markers.forEach(marker => marker.map = null);
        setMarkers([]);
        return;
    }

    markers.forEach(marker => marker.map = null);
    const newMarkersArray: google.maps.marker.AdvancedMarkerElement[] = [];
    const bounds = new googleMapsApi.maps.LatLngBounds();
    const { AdvancedMarkerElement, PinElement } = markerLibrary;


    unassignedEnvios.forEach(envio => {
      if (envio.latitud_destino && envio.longitud_destino) {
        const isSelected = envio.id === selectedEnvioId;
        const position = { lat: envio.latitud_destino, lng: envio.longitud_destino };
        
        bounds.extend(position);

        const pin = new PinElement({
          background: isSelected ? SELECTED_UNASSIGNED_COLOR : UNASSIGNED_COLOR,
          borderColor: "white",
          glyphColor: "white",
          // No glyph text for simple circle, or use a small dot/icon if desired
          // glyph: "●", 
          // scale: isSelected ? 1.2 : 1.0
        });

        const marker = new AdvancedMarkerElement({
          position: position,
          map: map,
          content: pin.element,
          title: `Envío ID: ${envio.id?.substring(0,8)}\nDestino: ${envio.direccion_destino}`,
          zIndex: isSelected ? 100 : 1,
        });

        marker.addListener('click', () => {
          onUnassignedEnvioSelect(envio);
          if (infoWindow) {
            const clienteInfo = envio.clientes ? `${envio.clientes.nombre} ${envio.clientes.apellido}` : envio.cliente_temporal_nombre;
            const content = `
              <div style="font-family: sans-serif; padding: 5px; max-width: 250px;">
                <h4 style="margin:0 0 5px 0; font-size: 1em; color: ${isSelected ? SELECTED_UNASSIGNED_COLOR : UNASSIGNED_COLOR};">Envío No Asignado</h4>
                <p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>ID:</strong> ${envio.id?.substring(0,8)}...</p>
                <p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Destino:</strong> ${envio.direccion_destino}</p>
                ${clienteInfo ? `<p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Cliente:</strong> ${clienteInfo}</p>` : ''}
                 <p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Origen:</strong> ${envio.direccion_origen}</p>
              </div>
            `;
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
          }
        });
        newMarkersArray.push(marker);
      }
    });
    setMarkers(newMarkersArray);

    if (newMarkersArray.length > 0 && !bounds.isEmpty()) {
        map.fitBounds(bounds);
         if (newMarkersArray.length === 1 && map.getZoom() && map.getZoom() > 15) { 
            map.setZoom(15);
        }
    } else if (newMarkersArray.length === 0 && map) {
       map.setCenter(MAR_DEL_PLATA_CENTER);
       map.setZoom(12);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, googleMapsApi, markerLibrary, unassignedEnvios, selectedEnvioId, errorLoadingApi]);

  if (isLoadingMap && API_KEY_COMPONENT) {
    return (
      <div className="w-full h-full flex justify-center items-center bg-muted/50 rounded-md">
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

  return <div ref={mapRef} className="w-full h-full rounded-md shadow-md" style={{ minHeight: '400px' }} />;
}
