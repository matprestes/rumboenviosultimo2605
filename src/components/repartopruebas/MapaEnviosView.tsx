
// src/components/repartopruebas/MapaEnviosView.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { EnvioMapa } from "@/app/repartoprueba/actions"; // Adjusted import path
import { estadoEnvioEnum, tipoParadaEnum, type TipoParada } from "@/lib/schemas"; // Import from schemas.ts
import { Loader2, AlertTriangle, Info as InfoIcon, MapPin } from "lucide-react";
import { getGoogleMapsApi } from '@/services/google-maps-service';
import { cn } from '@/lib/utils';

interface MapaEnviosViewProps {
  envios: EnvioMapa[];
  isFilteredByReparto: boolean; 
  selectedEnvioIdForPopup?: string | null; 
}

const MAR_DEL_PLATA_CENTER = { lat: -38.0055, lng: -57.5426 };
const INITIAL_ZOOM = 12;

function getEnvioMarkerIcon(
    status: string | null, 
    tipoParada: TipoParada | null, 
    isSelected: boolean, 
    google: typeof window.google | null
): google.maps.Symbol | string | undefined {
    if (!google || !google.maps) return undefined;

    let color = '#757575'; // Default Grey
    let scale = isSelected ? 9 : 7;
    let zIndex = isSelected ? 100 : 1;
    let path = google.maps.SymbolPath.CIRCLE;

    if (tipoParada === tipoParadaEnum.Values.retiro_empresa) {
        color = '#1E90FF'; // DodgerBlue for company pickup
        path = google.maps.SymbolPath.FORWARD_CLOSED_ARROW; 
        scale = isSelected ? 10 : 8;
        zIndex = isSelected ? 101 : 10;
    } else if (tipoParada === tipoParadaEnum.Values.retiro_individual_origen) {
        color = '#32CD32'; // LimeGreen for individual pickup
        path = google.maps.SymbolPath.BACKWARD_CLOSED_ARROW;
        scale = isSelected ? 9 : 7;
        zIndex = isSelected ? 100 : 2;
    } else { // entrega_cliente or otro
        switch (status) {
            case estadoEnvioEnum.Values.pendiente_asignacion: color = '#FF8C00'; break; 
            case estadoEnvioEnum.Values.asignado: color = '#4169E1'; break; 
            case estadoEnvioEnum.Values.en_camino: color = '#FFD700'; break; 
            case estadoEnvioEnum.Values.entregado: color = '#32CD32'; break; 
            case estadoEnvioEnum.Values.no_entregado: color = '#DC143C'; break; 
            case estadoEnvioEnum.Values.cancelado: color = '#A9A9A9'; break; 
            default: color = '#757575';
        }
    }
    
    return {
        path: path,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 1.5,
        scale: scale,
        anchor: new google.maps.Point(0,0), 
        labelOrigin: new google.maps.Point(0, - (scale + 2)) 
    };
}


export function MapaEnviosView({ envios, isFilteredByReparto, selectedEnvioIdForPopup }: MapaEnviosViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [markers, setMarkers] = useState<Map<string, google.maps.Marker>>(new Map());
  const [currentPolyline, setCurrentPolyline] = useState<google.maps.Polyline | null>(null);
  
  const [googleApi, setGoogleApi] = useState<typeof google | null>(null);
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

  const initMap = useCallback(() => {
    if (!googleApi || !mapRef.current || map) return;
    try {
      const newMap = new googleApi.maps.Map(mapRef.current, {
        center: MAR_DEL_PLATA_CENTER, zoom: INITIAL_ZOOM, mapTypeControl: false, streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });
      setMap(newMap);
      setInfoWindow(new googleApi.maps.InfoWindow());
    } catch (e) {
      console.error("Error initializing map:", e);
      setErrorLoadingApi("No se pudo inicializar el mapa.");
    }
  }, [googleApi, map]);


  useEffect(() => {
    if (!isOnline) {
      setErrorLoadingApi("No hay conexión a internet para cargar el mapa.");
      setIsLoadingApi(false);
      return;
    }
    
    setIsLoadingApi(true);
    getGoogleMapsApi()
      .then((api) => {
        setGoogleApi(api);
        setErrorLoadingApi(null);
      })
      .catch((err: Error) => {
        console.error("MapaEnviosView: Failed to load Google Maps API.", err);
        setErrorLoadingApi(err.message || "Error al cargar el servicio de mapas. Verifique la API Key y la conexión.");
      })
      .finally(() => {
        setIsLoadingApi(false);
      });
  }, [isOnline]); 

  useEffect(() => {
    if (googleApi && !map && mapRef.current) {
        initMap();
    }
  }, [googleApi, map, initMap]);


  const openInfoWindowForSelectedEnvio = useCallback(() => {
    if (!map || !infoWindow || !selectedEnvioIdForPopup || !googleApi) return;
    
    const selectedMarker = markers.get(selectedEnvioIdForPopup);
    const selectedEnvioData = envios.find(e => e.id === selectedEnvioIdForPopup);

    if (selectedMarker && selectedEnvioData) {
        const markerIconDetails = getEnvioMarkerIcon(selectedEnvioData.status, selectedEnvioData.tipo_parada, true, googleApi);
        const headerColor = typeof markerIconDetails === 'object' && markerIconDetails !== null && 'fillColor' in markerIconDetails ? markerIconDetails.fillColor : '#000';

        const content = `
            <div style="font-family: sans-serif; font-size: 13px; padding: 3px; max-width: 230px; line-height: 1.4;">
            <h4 style="margin:0 0 4px 0; font-weight: 600; color: ${headerColor};">
                ${selectedEnvioData.tipo_parada === tipoParadaEnum.Values.retiro_empresa ? 'Retiro Empresa' : (selectedEnvioData.tipo_parada === tipoParadaEnum.Values.retiro_individual_origen ? 'Retiro Envío' : 'Entrega Cliente')}
            </h4>
            <p style="margin:1px 0;"><strong>${selectedEnvioData.nombre_cliente || 'N/A'}</strong></p>
            <p style="margin:1px 0; font-size: 0.9em;">${selectedEnvioData.client_location}</p>
            ${selectedEnvioData.tipo_parada !== tipoParadaEnum.Values.retiro_empresa ? `<p style="margin:1px 0; font-size: 0.9em;">Paq: ${selectedEnvioData.tipo_paquete_nombre || '-'} (${selectedEnvioData.package_weight != null ? selectedEnvioData.package_weight + 'kg' : '-'})</p>` : ''}
            ${selectedEnvioData.status ? `<p style="margin:1px 0; font-size: 0.9em;">Estado: <span style="text-transform: capitalize;">${selectedEnvioData.status.replace(/_/g, ' ')}</span></p>`: ''}
            ${selectedEnvioData.orden !== null && selectedEnvioData.tipo_parada !== tipoParadaEnum.Values.retiro_empresa ? `<p style="margin:1px 0; font-size: 0.9em;">Orden: ${selectedEnvioData.orden}</p>` : ''}
            </div>`;
        infoWindow.setContent(content);
        infoWindow.open(map, selectedMarker);
        map.panTo(selectedMarker.getPosition()!);
    } else if (infoWindow.getMap()) {
        infoWindow.close();
    }
  }, [map, infoWindow, selectedEnvioIdForPopup, markers, envios, googleApi]);

  useEffect(() => {
    openInfoWindowForSelectedEnvio();
  }, [selectedEnvioIdForPopup, openInfoWindowForSelectedEnvio]);


  useEffect(() => {
    if (!map || !infoWindow || !googleApi || !googleApi.maps) return;

    markers.forEach(marker => marker.setMap(null)); 
    const newMarkersMap = new Map<string, google.maps.Marker>();
    
    if (currentPolyline) currentPolyline.setMap(null);

    const bounds = new googleApi.maps.LatLngBounds();
    const validEnviosForMap = envios.filter(e => e.latitud != null && e.longitud != null);
    const pathCoordinates: google.maps.LatLngLiteral[] = [];

    if (isFilteredByReparto) {
        validEnviosForMap.sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity));
    }

    validEnviosForMap.forEach((envio) => {
      const position = { lat: envio.latitud!, lng: envio.longitud! };
      bounds.extend(position);
      if(isFilteredByReparto || envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa) { 
         pathCoordinates.push(position);
      }

      const isSelected = envio.id === selectedEnvioIdForPopup;
      const markerIcon = getEnvioMarkerIcon(envio.status, envio.tipo_parada, isSelected, googleApi);
      
      let labelText = "";
      if(envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa) labelText = "R"; // Or "P" for Pickup
      else if (envio.orden !== null && envio.orden !== undefined) labelText = String(envio.orden);


      const marker = new googleApi.maps.Marker({
        position,
        map,
        icon: markerIcon,
        label: {
            text: labelText,
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
        },
        title: `${envio.nombre_cliente || 'Punto'} - ${envio.client_location}`,
        zIndex: isSelected ? 1000 : (envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa ? 500 : undefined)
      });

      marker.addListener('click', () => {
        const markerIconDetails = getEnvioMarkerIcon(envio.status, envio.tipo_parada, true, googleApi);
        const headerColor = typeof markerIconDetails === 'object' && markerIconDetails !== null && 'fillColor' in markerIconDetails ? markerIconDetails.fillColor : '#000';

        const content = `
            <div style="font-family: sans-serif; font-size: 13px; padding: 3px; max-width: 230px; line-height: 1.4;">
            <h4 style="margin:0 0 4px 0; font-weight: 600; color: ${headerColor};">
                ${envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa ? 'Retiro Empresa' : (envio.tipo_parada === tipoParadaEnum.Values.retiro_individual_origen ? 'Retiro Envío' : 'Entrega Cliente')}
            </h4>
            <p style="margin:1px 0;"><strong>${envio.nombre_cliente || 'N/A'}</strong></p>
            <p style="margin:1px 0; font-size: 0.9em;">${envio.client_location}</p>
            ${envio.tipo_parada !== tipoParadaEnum.Values.retiro_empresa ? `<p style="margin:1px 0; font-size: 0.9em;">Paq: ${envio.tipo_paquete_nombre || '-'} (${envio.package_weight != null ? envio.package_weight + 'kg' : '-'})</p>` : ''}
            ${envio.status ? `<p style="margin:1px 0; font-size: 0.9em;">Estado: <span style="text-transform: capitalize;">${envio.status.replace(/_/g, ' ')}</span></p>`: ''}
            ${envio.orden !== null && envio.tipo_parada !== tipoParadaEnum.Values.retiro_empresa ? `<p style="margin:1px 0; font-size: 0.9em;">Orden: ${envio.orden}</p>` : ''}
            </div>`;
        infoWindow.setContent(content);
        infoWindow.open(map, marker);

      });
      newMarkersMap.set(envio.id, marker);
    });
    setMarkers(newMarkersMap);

    if (isFilteredByReparto && pathCoordinates.length >= 2) {
      const newPoly = new googleApi.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#007BFF', 
        strokeOpacity: 0.8,
        strokeWeight: 3,
        icons: [{
            icon: { path: googleApi.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.5, strokeColor: '#007BFF' },
            offset: '100%',
            repeat: '70px' 
        }]
      });
      newPoly.setMap(map);
      setCurrentPolyline(newPoly);
    }

    if (validEnviosForMap.length > 0 && !bounds.isEmpty()) {
      if (validEnviosForMap.length === 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(15);
      } else {
        map.fitBounds(bounds);
        const listener = googleApi.maps.event.addListenerOnce(map, "idle", function() { 
          if (map.getZoom()! > 16) map.setZoom(16);
          googleApi.maps.event.removeListener(listener);
        });
      }
    } else if (validEnviosForMap.length === 0 && map) {
      map.setCenter(MAR_DEL_PLATA_CENTER);
      map.setZoom(INITIAL_ZOOM);
    }
  }, [map, infoWindow, envios, isFilteredByReparto, googleApi, selectedEnvioIdForPopup]);


  if (isLoadingApi) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20 rounded-lg shadow-inner">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Cargando API de Mapa...</p>
      </div>
    );
  }

  if (errorLoadingApi) {
    return (
      <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-destructive/30 bg-card p-6 rounded-lg shadow text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-3" />
        <h3 className="text-lg font-semibold text-destructive mb-1">Error al Cargar el Mapa</h3>
        <p className="text-destructive/80 text-sm max-w-md">{errorLoadingApi}</p>
         {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && <p className="text-sm mt-2 text-muted-foreground">Asegúrate de que la variable de entorno NEXT_PUBLIC_GOOGLE_MAPS_API_KEY esté configurada.</p>}
      </div>
    );
  }
  
  if(envios.length === 0 && !isLoadingApi && !errorLoadingApi && googleApi){
    return (
        <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-border bg-card p-6 rounded-lg shadow text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-1">Sin Envíos para Mostrar</h3>
            <p className="text-muted-foreground text-sm max-w-md">
                {isFilteredByReparto ? "Este reparto no tiene envíos geolocalizados." : "No hay envíos geolocalizados con los filtros actuales."}
            </p>
        </div>
    )
  }

  return <div ref={mapRef} className={cn("w-full h-full rounded-lg shadow-md border border-border", isLoadingApi || errorLoadingApi ? "bg-muted/30" : "")} />;
}
