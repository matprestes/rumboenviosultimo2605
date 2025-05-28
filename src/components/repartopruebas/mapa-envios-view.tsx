
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { EnvioMapa, TipoParadaEnum as TipoParadaEnumType } from '@/types/supabase';
import { estadoEnvioEnum, tipoParadaEnum } from "@/lib/schemas";
import { Loader2, AlertTriangle, Info as InfoIcon } from "lucide-react";
import { loadGoogleMapsApi } from '@/lib/google-maps-loader'; 

interface MapaEnviosViewProps {
  envios: EnvioMapa[];
  isFilteredByReparto: boolean; 
}

const MAR_DEL_PLATA_CENTER = { lat: -38.0055, lng: -57.5426 };
const INITIAL_ZOOM = 13;

function getEnvioMarkerColorHex(status: string | null, tipoParada?: TipoParadaEnumType | null ): string {
  if (tipoParada === tipoParadaEnum.Values.retiro_empresa) return '#007bff'; // Blue for pickup
  if (!status) return '#A9A9A9'; 
  switch (status) {
    case estadoEnvioEnum.Values.pending: return '#FF0000'; // Red
    case estadoEnvioEnum.Values.suggested: return '#800080'; // Purple
    case estadoEnvioEnum.Values.asignado_a_reparto: return '#0000FF'; 
    case estadoEnvioEnum.Values.en_transito: return '#FFA500'; // Orange
    case estadoEnvioEnum.Values.entregado: return '#008000'; // Green
    case estadoEnvioEnum.Values.cancelado: return '#696969'; // Dark Gray
    case estadoEnvioEnum.Values.problema_entrega: return '#FF69B4'; // Hot Pink
    default: return '#A9A9A9'; 
  }
}

export function MapaEnviosView({ envios, isFilteredByReparto }: MapaEnviosViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [currentPolyline, setCurrentPolyline] = useState<google.maps.Polyline | null>(null);
  
  const [googleApiLoadedState, setGoogleApiLoadedState] = useState<boolean>(false);
  const [mapApiLoading, setMapApiLoading] = useState<boolean>(true);
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
    if (!mapRef.current || !window.google?.maps?.Map || !window.google?.maps?.InfoWindow) {
      console.error("Map ref or core Google Maps services not available for initMap in MapaEnviosView.");
      setErrorLoadingApi("No se pudo inicializar el mapa. Intente recargar.");
      setGoogleApiLoadedState(false);
      return;
    }
    if (map) return; 

    try {
        const newMap = new window.google.maps.Map(mapRef.current, {
        center: MAR_DEL_PLATA_CENTER, zoom: INITIAL_ZOOM, mapTypeControl: false, streetViewControl: false,
        });
        setMap(newMap);
        setInfoWindow(new window.google.maps.InfoWindow());
    } catch(e) {
        console.error("Error creating Google Maps instance in MapaEnviosView:", e);
        setErrorLoadingApi("Error al crear la instancia del mapa.");
        setGoogleApiLoadedState(false);
    }
  }, [map]);


  useEffect(() => {
    if (!isOnline) {
      setErrorLoadingApi("No hay conexión a internet para cargar el mapa.");
      setMapApiLoading(false);
      setGoogleApiLoadedState(false);
      return;
    }
    
    setMapApiLoading(true);
    loadGoogleMapsApi()
      .then(() => {
        setGoogleApiLoadedState(true);
        setErrorLoadingApi(null);
      })
      .catch((err: Error) => {
        console.error("Failed to load Google Maps API in MapaEnviosView:", err);
        setErrorLoadingApi(err.message || "Error al cargar el servicio de mapas. Verifique la API Key y la conexión.");
        setGoogleApiLoadedState(false);
      })
      .finally(() => {
        setMapApiLoading(false);
      });
  }, [isOnline]); 

  useEffect(() => {
    if (googleApiLoadedState && mapRef.current && !map) {
        initMap();
    }
  }, [googleApiLoadedState, map, initMap]);


  useEffect(() => {
    if (map && infoWindow && googleApiLoadedState && window.google?.maps?.Marker && window.google?.maps?.LatLngBounds && window.google?.maps?.Polyline && window.google?.maps?.SymbolPath) {
      markers.forEach(marker => marker.setMap(null)); 
      if (currentPolyline) {
        currentPolyline.setMap(null); 
        setCurrentPolyline(null);
      }

      const newMarkers: google.maps.Marker[] = [];
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidPointsForRoute = false;

      envios.forEach(envio => {
        if (envio.latitud != null && envio.longitud != null) {
          hasValidPointsForRoute = true;
          const position = { lat: envio.latitud, lng: envio.longitud };
          bounds.extend(position);

          const markerColor = getEnvioMarkerColorHex(envio.status, envio.tipo_parada);
          let markerLabel: google.maps.MarkerLabel | undefined = undefined;
          let zIndex = 1;
          let iconScale = 7;

          if (envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa) {
            markerLabel = { text: 'R', color: 'white', fontWeight: 'bold', fontSize: '12px' };
            zIndex = 10;
            iconScale = 9;
          } else if (envio.orden !== null && envio.orden !== undefined) {
            markerLabel = { text: (envio.orden + 1).toString(), color: 'white', fontWeight: 'bold', fontSize: '11px' };
            zIndex = 2;
            iconScale = 9;
          }

          const marker = new window.google.maps.Marker({
            position,
            map,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: markerColor,
              fillOpacity: 0.9,
              strokeColor: '#ffffff',
              strokeWeight: 1.5,
              scale: iconScale,
            },
            label: markerLabel,
            title: envio.nombre_cliente || envio.client_location,
            zIndex: zIndex,
          });

          marker.addListener('click', () => {
            let orderInfo = '';
            if (envio.orden !== null && envio.orden !== undefined) {
              orderInfo = `<p style="margin: 2px 0;"><strong>Orden:</strong> ${envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa ? 'Retiro (Punto de Partida)' : envio.orden + 1}</p>`;
            }
            const packageInfo = envio.tipo_parada === tipoParadaEnum.Values.entrega_cliente 
                ? `<p style="margin: 2px 0;"><strong>Paquete:</strong> ${envio.tipo_paquete_nombre || '-'}, ${envio.package_weight != null ? envio.package_weight + 'kg' : '-'}</p>`
                : '';
            const statusInfo = envio.tipo_parada === tipoParadaEnum.Values.entrega_cliente && envio.status
                ? `<p style="margin: 2px 0;"><strong>Estado:</strong> <span style="color: ${markerColor}; text-transform: capitalize;">${envio.status.replace(/_/g, ' ')}</span></p>`
                : `<p style="margin: 2px 0;"><strong>Tipo:</strong> <span style="color: ${markerColor}; text-transform: capitalize;">Retiro en Empresa</span></p>`;

            const content = `
              <div style="font-family: sans-serif; font-size: 14px; max-width: 250px;">
                <h4 style="margin-top: 0; margin-bottom: 5px; font-weight: bold;">${envio.nombre_cliente || 'Punto de Interés'}</h4>
                <p style="margin: 2px 0;"><strong>Dirección:</strong> ${envio.client_location}</p>
                ${packageInfo}
                ${statusInfo}
                ${orderInfo}
              </div>
            `;
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
          });
          newMarkers.push(marker);
        }
      });
      setMarkers(newMarkers);

      if (hasValidPointsForRoute && newMarkers.length > 0) {
        if (newMarkers.length === 1 && envios.length === 1) { 
             map.setCenter(newMarkers[0].getPosition()!);
             map.setZoom(15);
        } else if (newMarkers.length > 1) { 
            map.fitBounds(bounds);
            const listener = window.google.maps.event.addListenerOnce(map, "idle", function() { 
              if (map.getZoom()! > 16) map.setZoom(16);
              window.google.maps.event.removeListener(listener);
            });
        }
      } else if (envios.length === 0) {
         map.setCenter(MAR_DEL_PLATA_CENTER);
         map.setZoom(INITIAL_ZOOM);
      }

      if (isFilteredByReparto && envios.length >= 2) {
        const routePath = envios
          .filter(envio => envio.latitud != null && envio.longitud != null)
          .sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity)) 
          .map(envio => ({ lat: envio.latitud!, lng: envio.longitud! }));

        if (routePath.length >= 2) {
          const poly = new window.google.maps.Polyline({
            path: routePath,
            geodesic: true,
            strokeColor: '#4285F4', 
            strokeOpacity: 0.8,
            strokeWeight: 4,
            icons: [{
                icon: {
                    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 3,
                    strokeColor: '#4285F4'
                },
                offset: '100%',
                repeat: '75px' 
            }]
          });
          poly.setMap(map);
          setCurrentPolyline(poly);
        }
      }
    }
  }, [map, infoWindow, envios, isFilteredByReparto, googleApiLoadedState]);

  if (mapApiLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg shadow">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Cargando mapa...</p>
      </div>
    );
  }

  if (errorLoadingApi) {
    return (
      <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-destructive/50 bg-card p-8 rounded-lg shadow text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-semibold text-destructive mb-2">Error al Cargar el Mapa</h3>
        <p className="text-destructive/90 max-w-md">{errorLoadingApi}</p>
         {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && <p className="text-sm mt-2 text-muted-foreground">Asegúrate de que la variable de entorno NEXT_PUBLIC_GOOGLE_MAPS_API_KEY esté configurada.</p>}
      </div>
    );
  }
  
  if(envios.length === 0 && !mapApiLoading && !errorLoadingApi && googleApiLoadedState){
    return (
        <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-muted-foreground/30 bg-card p-8 rounded-lg shadow text-center">
            <InfoIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No hay Envíos para Mostrar</h3>
            <p className="text-muted-foreground max-w-md">Actualmente no hay envíos geolocalizados en Mar del Plata para mostrar en el mapa con el filtro actual.</p>
        </div>
    )
  }

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} className="rounded-lg shadow-md border" />;
}