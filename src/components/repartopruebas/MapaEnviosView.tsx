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
  selectedEnvioIdForPopup?: string | null; // ID del envío para mostrar su InfoWindow
}

const MAR_DEL_PLATA_CENTER = { lat: -38.0055, lng: -57.5426 };
const INITIAL_ZOOM = 12;

function getEnvioMarkerIcon(
    status: string | null,
    tipoParada: TipoParada | null,
    isSelected: boolean,
    google: typeof window.google | null
): google.maps.Symbol | string | undefined {
    if (!google || !google.maps || !google.maps.SymbolPath) return undefined;

    let color = '#757575'; // Default Grey
    let scale = isSelected ? 9 : 7;
    let zIndex = isSelected ? 100 : 1; // Ensure selected is on top
    let path = google.maps.SymbolPath.CIRCLE; // Default for deliveries

    if (tipoParada === tipoParadaEnum.Values.retiro_empresa) {
        color = '#1E90FF'; // DodgerBlue
        path = google.maps.SymbolPath.FORWARD_CLOSED_ARROW; // Or a house icon if available/custom
        scale = isSelected ? 11 : 9;
        zIndex = isSelected ? 101 : 10; // Higher zIndex for origin points
    } else if (tipoParada === tipoParadaEnum.Values.retiro_individual_origen) {
        color = '#FF8C00'; // DarkOrange for individual pickups
        path = google.maps.SymbolPath.BACKWARD_CLOSED_ARROW; // Different arrow for pickup
        scale = isSelected ? 10 : 8;
        zIndex = isSelected ? 100 : 5;
    } else { // entrega_cliente or otro
        switch (status) {
            case EstadoEnvioEnum.Values.pendiente_asignacion: color = '#FFD700'; break; // Gold
            case EstadoEnvioEnum.Values.asignado: color = '#4682B4'; break; // SteelBlue
            case EstadoEnvioEnum.Values.en_camino: color = '#FFA500'; break; // Orange
            case EstadoEnvioEnum.Values.entregado: color = '#32CD32'; break; // LimeGreen
            case EstadoEnvioEnum.Values.no_entregado: color = '#DC143C'; break; // Crimson
            case EstadoEnvioEnum.Values.cancelado: color = '#A9A9A9'; break; // DarkGray
            default: color = '#757575'; // Default Grey
        }
    }

    return {
        path: path,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 1.5,
        scale: scale,
        anchor: new google.maps.Point(0,0), // Center the symbol
        labelOrigin: new google.maps.Point(0, -(scale + 2)) // Position label above
    };
}


export function MapaEnviosView({ envios, isFilteredByReparto, selectedEnvioIdForPopup }: MapaEnviosViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  // Store markers in a Map to easily update/remove them by ID
  const [markersMap, setMarkersMap] = useState<Map<string, google.maps.Marker>>(new Map());
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
        fullscreenControl: true, zoomControl: true,
      });
      setMap(newMap);
      setInfoWindow(new googleApi.maps.InfoWindow());
    } catch (e) {
      console.error("Error initializing map:", e);
      setErrorLoadingApi("No se pudo inicializar el mapa. Intente recargar.");
      setGoogleApi(null); // Ensure API is considered not loaded
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
    getGoogleMapsApi()
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
    if (googleApi && !map && mapRef.current) {
        initMap();
    }
  }, [googleApi, map, initMap]);


  const openInfoWindowForSelectedEnvio = useCallback(() => {
    if (!map || !infoWindow || !selectedEnvioIdForPopup || !googleApi || !googleApi.maps) return;

    const selectedMarker = markersMap.get(selectedEnvioIdForPopup);
    const selectedEnvioData = envios.find(e => e.id === selectedEnvioIdForPopup);

    if (selectedMarker && selectedEnvioData) {
        const markerIconDetails = getEnvioMarkerIcon(selectedEnvioData.status, selectedEnvioData.tipo_parada, true, googleApi);
        const headerColor = (typeof markerIconDetails === 'object' && markerIconDetails !== null && 'fillColor' in markerIconDetails && typeof markerIconDetails.fillColor === 'string') ? markerIconDetails.fillColor : '#000';

        const content = `
            <div style="font-family: Inter, sans-serif; font-size: 13px; padding: 5px; max-width: 240px; line-height: 1.5;">
            <h4 style="margin:0 0 6px 0; font-weight: 600; font-size: 1.1em; color: ${headerColor}; border-bottom: 1px solid #eee; padding-bottom: 4px;">
                ${selectedEnvioData.tipo_parada === tipoParadaEnum.Values.retiro_empresa ? 'Retiro Empresa' : (selectedEnvioData.tipo_parada === tipoParadaEnum.Values.retiro_individual_origen ? 'Retiro Envío' : 'Entrega Cliente')}
            </h4>
            <p style="margin:2px 0;"><strong>${selectedEnvioData.nombre_cliente || 'N/A'}</strong></p>
            <p style="margin:2px 0; font-size: 0.9em; color: #555;">${selectedEnvioData.client_location}</p>
            ${selectedEnvioData.tipo_parada !== tipoParadaEnum.Values.retiro_empresa ? `<p style="margin:2px 0; font-size: 0.9em; color: #555;">Paq: ${selectedEnvioData.tipo_paquete_nombre || '-'} (${selectedEnvioData.package_weight != null ? selectedEnvioData.package_weight + 'kg' : '-'})</p>` : ''}
            ${selectedEnvioData.status ? `<p style="margin:2px 0; font-size: 0.9em; color: #555;">Estado: <span style="text-transform: capitalize; font-weight: 500; color: ${headerColor};">${selectedEnvioData.status.replace(/_/g, ' ')}</span></p>`: ''}
            ${selectedEnvioData.orden !== null && selectedEnvioData.tipo_parada !== tipoParadaEnum.Values.retiro_empresa ? `<p style="margin:2px 0; font-size: 0.9em; color: #555;">Orden: ${selectedEnvioData.orden}</p>` : ''}
            </div>`;
        infoWindow.setContent(content);
        infoWindow.open({map: map, anchor: selectedMarker});
        map.panTo(selectedMarker.getPosition()!);
    } else if (infoWindow.getMap()) { // Close if marker not found or data not found
        infoWindow.close();
    }
  }, [map, infoWindow, selectedEnvioIdForPopup, markersMap, envios, googleApi]);

  useEffect(() => {
    openInfoWindowForSelectedEnvio();
  }, [selectedEnvioIdForPopup, openInfoWindowForSelectedEnvio]);


  useEffect(() => {
    if (!map || !infoWindow || !googleApi || !googleApi.maps || !googleApi.maps.Marker || !googleApi.maps.LatLngBounds || !googleApi.maps.Polyline || !googleApi.maps.SymbolPath) return;

    // Clear previous markers from the map and from state
    markersMap.forEach(marker => marker.setMap(null));
    const newMarkersMapInstance = new Map<string, google.maps.Marker>();

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
      // For polyline, only add if it's part of a filtered reparto or an origin point for a route
      if(isFilteredByReparto || envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa || envio.tipo_parada === tipoParadaEnum.Values.retiro_individual_origen) {
         pathCoordinates.push(position);
      }

      const isSelected = envio.id === selectedEnvioIdForPopup;
      const markerIcon = getEnvioMarkerIcon(envio.status, envio.tipo_parada, isSelected, googleApi);

      let labelText = "";
      if(envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa) labelText = "R";
      else if (envio.orden !== null && envio.orden !== undefined && (envio.tipo_parada === tipoParadaEnum.Values.entrega_cliente || envio.tipo_parada === tipoParadaEnum.Values.retiro_individual_origen)) {
          labelText = String(envio.orden);
      }

      const marker = new googleApi.maps.Marker({
        position,
        map,
        icon: markerIcon,
        label: labelText ? {
            text: labelText,
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
        } : undefined,
        title: `${envio.nombre_cliente || 'Punto'} - ${envio.client_location}`,
        zIndex: isSelected ? 1000 : (envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa ? 500 : (envio.orden ?? 1))
      });

      marker.addListener('click', () => openInfoWindowForSelectedEnvio()); // Reuse the centralized function
      newMarkersMapInstance.set(envio.id, marker);
    });
    setMarkersMap(newMarkersMapInstance);

    if (isFilteredByReparto && pathCoordinates.length >= 2) {
      const newPoly = new googleApi.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#007BFF', // A consistent blue
        strokeOpacity: 0.7,
        strokeWeight: 3.5,
        icons: [{
            icon: { path: googleApi.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.5, strokeColor: '#007BFF', strokeWeight: 0.5 },
            offset: '100%',
            repeat: '80px'
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
          if (map.getZoom()! > 16) map.setZoom(16); // Don't zoom in too much
          googleApi.maps.event.removeListener(listener);
        });
      }
    } else if (validEnviosForMap.length === 0 && map) { // No valid envios, reset map view
      map.setCenter(MAR_DEL_PLATA_CENTER);
      map.setZoom(INITIAL_ZOOM);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, infoWindow, envios, isFilteredByReparto, googleApi, selectedEnvioIdForPopup]);


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

  if(envios.length === 0 && !isLoadingApi && !errorLoadingApi && googleApi){
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

  return <div ref={mapRef} className={cn("w-full h-full rounded-2xl shadow-md border border-border/30", isLoadingApi || errorLoadingApi ? "bg-muted/30" : "")} />;
}
