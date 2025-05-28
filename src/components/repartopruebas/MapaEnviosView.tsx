
// src/components/repartopruebas/MapaEnviosView.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { EnvioMapa, TipoParada } from "@/types/supabase";
import { Loader2, AlertTriangle, Info as InfoIcon, MapPin } from "lucide-react";
import { getGoogleMapsApi } from '@/services/google-maps-service';
import { cn } from '@/lib/utils';

interface MapaEnviosViewProps {
  envios: EnvioMapa[];
  isFilteredByReparto: boolean; 
  selectedEnvioIdForPopup?: string | null; // To trigger InfoWindow externally
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

    if (tipoParada === 'retiro_empresa') {
        color = '#1E90FF'; // DodgerBlue for company pickup
        path = google.maps.SymbolPath.FORWARD_CLOSED_ARROW; // Or a building icon if available
        scale = isSelected ? 10 : 8;
        zIndex = isSelected ? 101 : 10;
    } else if (tipoParada === 'retiro_individual_origen') {
        color = '#32CD32'; // LimeGreen for individual pickup
        path = google.maps.SymbolPath.BACKWARD_CLOSED_ARROW;
        scale = isSelected ? 9 : 7;
        zIndex = isSelected ? 100 : 2;
    } else { // entrega_cliente or otro
        switch (status) {
            case 'pendiente_asignacion': color = '#FF8C00'; break; // DarkOrange
            case 'asignado': color = '#4169E1'; break; // RoyalBlue
            case 'en_camino': color = '#FFD700'; break; // Gold
            case 'entregado': color = '#32CD32'; break; // LimeGreen
            case 'no_entregado': color = '#DC143C'; break; // Crimson
            case 'cancelado': color = '#A9A9A9'; break; // DarkGray
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
        anchor: new google.maps.Point(0,0), // Adjust if needed based on path
        labelOrigin: new google.maps.Point(0, - (scale + 2)) // Position label above
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

  useEffect(() => {
    getGoogleMapsApi()
      .then((api) => {
        setGoogleApi(api);
        setErrorLoadingApi(null);
      })
      .catch((err: Error) => {
        console.error("MapaEnviosView: Failed to load Google Maps API.", err);
        setErrorLoadingApi(err.message || "Error al cargar el servicio de mapas.");
      })
      .finally(() => {
        setIsLoadingApi(false);
      });
  }, []);

  const initMap = useCallback(() => {
    if (!googleApi || !mapRef.current || map) return;
    try {
      const newMap = new googleApi.maps.Map(mapRef.current, {
        center: MAR_DEL_PLATA_CENTER,
        zoom: INITIAL_ZOOM,
        mapId: `RUMBOS_MAPA_PRUEBA_${Math.random().toString(36).substring(7)}`, // Unique ID
        mapTypeControl: false,
        streetViewControl: false,
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
    if (googleApi && !map && mapRef.current) {
      initMap();
    }
  }, [googleApi, map, initMap]);

  const openInfoWindowForSelectedEnvio = useCallback(() => {
    if (!map || !infoWindow || !selectedEnvioIdForPopup || !googleApi) return;
    
    const selectedMarker = markers.get(selectedEnvioIdForPopup);
    const selectedEnvioData = envios.find(e => e.id === selectedEnvioIdForPopup);

    if (selectedMarker && selectedEnvioData) {
        const content = `
            <div style="font-family: sans-serif; font-size: 13px; padding: 3px; max-width: 230px; line-height: 1.4;">
            <h4 style="margin:0 0 4px 0; font-weight: 600; color: ${getEnvioMarkerIcon(selectedEnvioData.status, selectedEnvioData.tipo_parada, true, googleApi)?.fillColor || '#000'};">
                ${selectedEnvioData.tipo_parada === 'retiro_empresa' ? 'Retiro Empresa' : (selectedEnvioData.tipo_parada === 'retiro_individual_origen' ? 'Retiro Envío' : 'Entrega Cliente')}
            </h4>
            <p style="margin:1px 0;"><strong>${selectedEnvioData.nombre_cliente || 'N/A'}</strong></p>
            <p style="margin:1px 0; font-size: 0.9em;">${selectedEnvioData.client_location}</p>
            ${selectedEnvioData.tipo_parada !== 'retiro_empresa' ? `<p style="margin:1px 0; font-size: 0.9em;">Paq: ${selectedEnvioData.tipo_paquete_nombre || '-'} (${selectedEnvioData.package_weight != null ? selectedEnvioData.package_weight + 'kg' : '-'})</p>` : ''}
            ${selectedEnvioData.status ? `<p style="margin:1px 0; font-size: 0.9em;">Estado: <span style="text-transform: capitalize;">${selectedEnvioData.status.replace(/_/g, ' ')}</span></p>`: ''}
            ${selectedEnvioData.orden !== null && selectedEnvioData.tipo_parada !== 'retiro_empresa' ? `<p style="margin:1px 0; font-size: 0.9em;">Orden: ${selectedEnvioData.orden}</p>` : ''}
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
    if (!map || !infoWindow || !googleApi) return;

    // Clear existing markers from map and state
    markers.forEach(marker => marker.setMap(null));
    const newMarkersMap = new Map<string, google.maps.Marker>();
    
    if (currentPolyline) currentPolyline.setMap(null);

    const bounds = new googleApi.maps.LatLngBounds();
    const validEnviosForMap = envios.filter(e => e.latitud != null && e.longitud != null);
    const pathCoordinates: google.maps.LatLngLiteral[] = [];

    if (isFilteredByReparto) {
        // Sort by 'orden' only if it's a filtered reparto view
        validEnviosForMap.sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity));
    }

    validEnviosForMap.forEach((envio, index) => {
      const position = { lat: envio.latitud!, lng: envio.longitud! };
      bounds.extend(position);
      if(isFilteredByReparto || envio.tipo_parada === 'retiro_empresa') { // Only add to polyline if part of a specific reparto
         pathCoordinates.push(position);
      }

      const isSelected = envio.id === selectedEnvioIdForPopup;
      const markerIcon = getEnvioMarkerIcon(envio.status, envio.tipo_parada, isSelected, googleApi);
      
      let labelText = "";
      if(envio.tipo_parada === 'retiro_empresa') labelText = "R";
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
        zIndex: isSelected ? 1000 : (envio.tipo_parada === 'retiro_empresa' ? 500 : undefined)
      });

      marker.addListener('click', () => {
        // Logic to open info window is now handled by selectedEnvioIdForPopup effect
        // For direct clicks, you might want to call a prop function to update selectedEnvioIdForPopup
        // This part would need wiring up if direct map clicks should also select & open info window
        // e.g. onEnvioMarkerClick(envio.id)
        const tempInfoWindow = new googleApi.maps.InfoWindow();
        const content = `
            <div style="font-family: sans-serif; font-size: 13px; padding: 3px; max-width: 230px; line-height: 1.4;">
            <h4 style="margin:0 0 4px 0; font-weight: 600; color: ${getEnvioMarkerIcon(envio.status, envio.tipo_parada, true, googleApi)?.fillColor || '#000'};">
                ${envio.tipo_parada === 'retiro_empresa' ? 'Retiro Empresa' : (envio.tipo_parada === 'retiro_individual_origen' ? 'Retiro Envío' : 'Entrega Cliente')}
            </h4>
            <p style="margin:1px 0;"><strong>${envio.nombre_cliente || 'N/A'}</strong></p>
            <p style="margin:1px 0; font-size: 0.9em;">${envio.client_location}</p>
            ${envio.tipo_parada !== 'retiro_empresa' ? `<p style="margin:1px 0; font-size: 0.9em;">Paq: ${envio.tipo_paquete_nombre || '-'} (${envio.package_weight != null ? envio.package_weight + 'kg' : '-'})</p>` : ''}
            ${envio.status ? `<p style="margin:1px 0; font-size: 0.9em;">Estado: <span style="text-transform: capitalize;">${envio.status.replace(/_/g, ' ')}</span></p>`: ''}
            ${envio.orden !== null && envio.tipo_parada !== 'retiro_empresa' ? `<p style="margin:1px 0; font-size: 0.9em;">Orden: ${envio.orden}</p>` : ''}
            </div>`;
        tempInfoWindow.setContent(content);
        tempInfoWindow.open(map, marker);

      });
      newMarkersMap.set(envio.id, marker);
    });
    setMarkers(newMarkersMap);

    if (isFilteredByReparto && pathCoordinates.length >= 2) {
      const newPoly = new googleApi.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#007BFF', // Blue
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
      }
    } else if (validEnviosForMap.length === 0) {
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
