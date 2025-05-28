// src/components/repartopruebas/MapaEnviosView.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { EnvioMapa } from "@/app/repartoprueba/actions"; 
import { EstadoEnvioEnum, tipoParadaEnum, type TipoParada } from "@/lib/schemas"; 
import { Loader2, AlertTriangle, Info as InfoIcon, MapPin } from "lucide-react";
import { getGoogleMapsApi } from '@/services/google-maps-service'; 
import { cn } from '@/lib/utils';

interface MapaEnviosViewProps {
  envios: EnvioMapa[];
  isFilteredByReparto: boolean;
  selectedEnvioIdForPopup?: string | null;
  onDistanceCalculated?: (distance: number | null) => void; // Callback para pasar la distancia
}

const MAR_DEL_PLATA_CENTER = { lat: -38.0055, lng: -57.5426 };
const INITIAL_ZOOM = 12;
const RUMBOS_ENVIOS_MAP_ID_GENERAL = "RUMBOS_MAP_ID_GENERAL_VIEW_2"; // Map ID

function getPinConfig(
    status: string | null,
    tipoParada: TipoParada | null,
    isSelected: boolean,
    PinElement: typeof google.maps.marker.PinElement | undefined,
    orden?: number | null
): google.maps.marker.PinElementConfig  {
    if (!PinElement) return { glyph: "" }; // Fallback if PinElement is not available

    let background = '#BDBDBD'; // Default Lighter Grey for unknown/generic
    let borderColor = '#9E9E9E';
    let glyphText: string | HTMLElement | URL = orden !== null && orden !== undefined ? String(orden) : "";
    let scale = isSelected ? 1.3 : 1.0; // Slightly larger if selected

    if (tipoParada === tipoParadaEnum.Values.retiro_empresa) {
        background = '#1E90FF'; // DodgerBlue
        borderColor = '#106AB8';
        glyphText = "P"; // Pickup (Empresa)
        scale = 1.2;
    } else if (tipoParada === tipoParadaEnum.Values.retiro_individual_origen) {
        background = '#FF8C00'; // DarkOrange
        borderColor = '#CC7000';
        glyphText = orden !== null && orden !== undefined ? `P${orden}` : "P";
    } else { // entrega_cliente or otro
        switch (status) {
            case EstadoEnvioEnum.Values.pendiente_asignacion: background = '#FFC107'; borderColor = '#FFA000'; glyphText = orden !== null && orden !== undefined ? String(orden) : "!"; break; // Amber
            case EstadoEnvioEnum.Values.asignado: background = '#4682B4'; borderColor = '#3671A3'; break; // SteelBlue
            case EstadoEnvioEnum.Values.en_camino: background = '#FFA500'; borderColor = '#D98C00'; break; // Orange
            case EstadoEnvioEnum.Values.entregado: background = '#4CAF50'; borderColor = '#388E3C'; glyphText = orden !== null && orden !== undefined ? String(orden) : "✓"; break; // Green
            case EstadoEnvioEnum.Values.no_entregado: background = '#F44336'; borderColor = '#D32F2F'; glyphText = orden !== null && orden !== undefined ? String(orden) : "X"; break; // Red
            case EstadoEnvioEnum.Values.cancelado: background = '#757575'; borderColor = '#505050'; glyphText = orden !== null && orden !== undefined ? String(orden) : "-"; break; // Dark Grey
            default: // Keep default grey
        }
    }
    
    return {
        scale,
        background,
        borderColor,
        glyph: glyphText,
        glyphColor: 'white',
    };
}


export function MapaEnviosView({ envios, isFilteredByReparto, selectedEnvioIdForPopup, onDistanceCalculated }: MapaEnviosViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [markersMap, setMarkersMap] = useState<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const [currentPolyline, setCurrentPolyline] = useState<google.maps.Polyline | null>(null);
  
  const [googleApi, setGoogleApi] = useState<typeof google | null>(null);
  const [markerLibrary, setMarkerLibrary] = useState<google.maps.MarkerLibrary | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(true);
  const [errorLoadingApi, setErrorLoadingApi] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const initMap = useCallback(async () => {
    if (!googleApi || !mapRef.current || map) return;
    try {
      const lib = await googleApi.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      setMarkerLibrary(lib);
      const geometryLib = await googleApi.maps.importLibrary("geometry"); // Ensure geometry is loaded

      const newMap = new googleApi.maps.Map(mapRef.current, {
        center: MAR_DEL_PLATA_CENTER, zoom: INITIAL_ZOOM, mapTypeControl: false, streetViewControl: false,
        fullscreenControl: true, zoomControl: true, mapId: RUMBOS_ENVIOS_MAP_ID_GENERAL
      });
      setMap(newMap);
      setInfoWindow(new googleApi.maps.InfoWindow());
    } catch (e) {
      console.error("Error initializing map or marker/geometry library:", e);
      setErrorLoadingApi("No se pudo inicializar el mapa o sus componentes. Intente recargar.");
      setGoogleApi(null); 
    }
  }, [googleApi, map]);


  useEffect(() => {
    if (!isOnline) {
      setErrorLoadingApi("No hay conexión a internet para cargar el mapa.");
      setIsLoadingApi(false);
      setGoogleApi(null);
      return;
    }
    
    setIsLoadingApi(true);
    getGoogleMapsApi() // This should load all necessary libraries including 'geometry'
      .then((api) => {
        setGoogleApi(api);
        setErrorLoadingApi(null);
      })
      .catch((err: Error) => {
        console.error("MapaEnviosView: Failed to load Google Maps API.", err);
        setErrorLoadingApi(err.message || "Error al cargar el servicio de mapas. Verifique la API Key y la conexión.");
        setGoogleApi(null);
      })
      .finally(() => {
        setIsLoadingApi(false);
      });
  }, [isOnline]); 

  useEffect(() => {
    if (googleApi && !map && mapRef.current && !isLoadingApi && !errorLoadingApi) {
        initMap();
    }
  }, [googleApi, map, initMap, isLoadingApi, errorLoadingApi]);


  const openInfoWindow = useCallback((marker: google.maps.marker.AdvancedMarkerElement, envio: EnvioMapa) => {
    if (!infoWindow || !googleApi || !markerLibrary) return;
    const { PinElement } = markerLibrary;

    const pinElementConfig = getPinConfig(envio.status, envio.tipo_parada, true, PinElement, envio.orden);
    const headerColor = pinElementConfig.background || '#000';

    const content = `
        <div style="font-family: Inter, sans-serif; font-size: 13px; padding: 5px; max-width: 240px; line-height: 1.5;">
        <h4 style="margin:0 0 6px 0; font-weight: 600; font-size: 1.1em; color: ${headerColor}; border-bottom: 1px solid #eee; padding-bottom: 4px;">
            ${envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa ? 'Retiro Empresa' : (envio.tipo_parada === tipoParadaEnum.Values.retiro_individual_origen ? 'Retiro Envío' : 'Entrega Cliente')}
        </h4>
        <p style="margin:2px 0;"><strong>${envio.nombre_cliente || 'N/A'}</strong></p>
        <p style="margin:2px 0; font-size: 0.9em; color: #555;">${envio.client_location}</p>
        ${envio.tipo_parada !== tipoParadaEnum.Values.retiro_empresa ? `<p style="margin:2px 0; font-size: 0.9em; color: #555;">Paq: ${envio.tipo_paquete_nombre || '-'} (${envio.package_weight != null ? envio.package_weight + 'kg' : '-'})</p>` : ''}
        ${envio.status ? `<p style="margin:2px 0; font-size: 0.9em; color: #555;">Estado: <span style="text-transform: capitalize; font-weight: 500; color: ${headerColor};">${envio.status.replace(/_/g, ' ')}</span></p>`: ''}
        ${(envio.orden !== null && envio.orden !== undefined && (envio.tipo_parada !== tipoParadaEnum.Values.retiro_empresa || envio.orden > 0) ) ? `<p style="margin:2px 0; font-size: 0.9em; color: #555;">Orden Visita: ${envio.orden}</p>` : ''}
        </div>`;
    infoWindow.setContent(content);
    infoWindow.open({map: map!, anchor: marker});
    map?.panTo(marker.position!);
  }, [map, infoWindow, googleApi, markerLibrary]);


  useEffect(() => {
    if (selectedEnvioIdForPopup && googleApi && markerLibrary) {
        const selectedMarker = markersMap.get(selectedEnvioIdForPopup);
        const selectedEnvioData = envios.find(e => e.id === selectedEnvioIdForPopup);
        if (selectedMarker && selectedEnvioData) {
            openInfoWindow(selectedMarker, selectedEnvioData);
        } else if (infoWindow?.getMap()) {
            infoWindow.close();
        }
    }
  }, [selectedEnvioIdForPopup, markersMap, envios, openInfoWindow, googleApi, markerLibrary, infoWindow]);


  useEffect(() => {
    if (!map || !infoWindow || !googleApi || !markerLibrary || !envios || errorLoadingApi) {
        markersMap.forEach(marker => marker.map = null);
        setMarkersMap(new Map());
        if(currentPolyline) currentPolyline.setMap(null);
        if(onDistanceCalculated) onDistanceCalculated(null);
        return;
    }

    const { AdvancedMarkerElement, PinElement } = markerLibrary;
    
    markersMap.forEach(marker => marker.map = null);
    const newMarkersMapInstance = new Map<string, google.maps.marker.AdvancedMarkerElement>();

    if (currentPolyline) currentPolyline.setMap(null);

    const bounds = new googleApi.maps.LatLngBounds();
    const validEnviosForMap = envios.filter(e => e.latitud != null && e.longitud != null);
    const pathCoordinates: google.maps.LatLngLiteral[] = [];

    const sortedEnviosForPath = [...validEnviosForMap].sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity));

    sortedEnviosForPath.forEach((envio) => {
      const position = { lat: envio.latitud!, lng: envio.longitud! };
      bounds.extend(position);
      pathCoordinates.push(position); // Add all valid points for polyline if filtered by reparto

      const isSelected = envio.id === selectedEnvioIdForPopup;
      const pinElementConfig = getPinConfig(envio.status, envio.tipo_parada, isSelected, PinElement, envio.orden);
      const pinElement = new PinElement(pinElementConfig);
      
      const marker = new AdvancedMarkerElement({
        position,
        map,
        content: pinElement.element,
        title: `${envio.nombre_cliente || 'Punto'} - ${envio.client_location}`,
        zIndex: isSelected ? 1000 : (envio.orden ?? 1) + (envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa ? 500 : 0)
      });

      marker.addListener('click', () => openInfoWindow(marker, envio));
      newMarkersMapInstance.set(envio.id, marker);
    });
    setMarkersMap(newMarkersMapInstance);

    let calculatedRouteDistanceKm: number | null = null;
    if (isFilteredByReparto && pathCoordinates.length >= 2) {
      const newPoly = new googleApi.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#007BFF', 
        strokeOpacity: 0.8,
        strokeWeight: 4,
        icons: [{
            icon: { path: googleApi.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.5, strokeColor: '#FFFFFF', strokeWeight: 0.5 },
            offset: '100%',
            repeat: '80px' 
        }]
      });
      newPoly.setMap(map);
      setCurrentPolyline(newPoly);
      
      // Calculate distance
      if (googleApi.maps.geometry && googleApi.maps.geometry.spherical) {
        let currentTotalDistance = 0;
        for (let i = 0; i < pathCoordinates.length - 1; i++) {
          const from = new googleApi.maps.LatLng(pathCoordinates[i]);
          const to = new googleApi.maps.LatLng(pathCoordinates[i + 1]);
          currentTotalDistance += googleApi.maps.geometry.spherical.computeDistanceBetween(from, to);
        }
        calculatedRouteDistanceKm = currentTotalDistance / 1000;
      }

    } else {
        if (currentPolyline) currentPolyline.setMap(null);
        setCurrentPolyline(null);
    }
    if(onDistanceCalculated) onDistanceCalculated(calculatedRouteDistanceKm);


    if (validEnviosForMap.length > 0 && !bounds.isEmpty()) {
      if (validEnviosForMap.length === 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(15);
      } else {
        map.fitBounds(bounds);
        const listener = googleApi.maps.event.addListenerOnce(map, "idle", function() { 
          if (map.getZoom()! > 17) map.setZoom(17); // Slightly more zoom for multiple points
          googleApi.maps.event.removeListener(listener);
        });
      }
    } else if (validEnviosForMap.length === 0 && map) { 
      map.setCenter(MAR_DEL_PLATA_CENTER);
      map.setZoom(INITIAL_ZOOM);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, infoWindow, envios, isFilteredByReparto, googleApi, markerLibrary, errorLoadingApi, openInfoWindow, onDistanceCalculated]);


  if (isLoadingApi) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/20 rounded-2xl shadow-inner p-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="text-muted-foreground text-sm">Cargando API de Mapa...</p>
      </div>
    );
  }

  if (errorLoadingApi) {
    return (
      <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-destructive/30 bg-card p-6 rounded-2xl shadow-md text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-3" />
        <h3 className="text-lg font-semibold text-destructive mb-1">Error al Cargar el Mapa</h3>
        <p className="text-destructive/80 text-sm max-w-md">{errorLoadingApi}</p>
         {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && <p className="text-xs mt-2 text-muted-foreground">Asegúrate de que la variable de entorno NEXT_PUBLIC_GOOGLE_MAPS_API_KEY esté configurada.</p>}
      </div>
    );
  }
  
  if(envios.length === 0 && !isLoadingApi && !errorLoadingApi && googleApi && markerLibrary){
    return (
        <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-border/50 bg-card p-6 rounded-2xl shadow-md text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-1">Sin Envíos para Mostrar</h3>
            <p className="text-muted-foreground text-sm max-w-md">
                {isFilteredByReparto ? "Este reparto no tiene envíos geolocalizados." : "No hay envíos geolocalizados con los filtros actuales."}
            </p>
        </div>
    )
  }

  return <div ref={mapRef} className={cn("w-full h-full rounded-lg shadow-sm border border-border/20", (isLoadingApi || errorLoadingApi) ? "bg-muted/30" : "")} />;
}


    