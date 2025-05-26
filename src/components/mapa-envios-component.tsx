
"use client";

import * as React from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import type { EnvioExtendido } from '@/app/mapa-envios/page'; // Using type from page
import { useToast } from '@/hooks/use-toast';

interface MapaEnviosComponentProps {
  envios: EnvioExtendido[];
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const MAR_DEL_PLATA_CENTER = { lat: -38.00228, lng: -57.55754 };

const loader = new Loader({
  apiKey: API_KEY || '',
  version: 'weekly',
  libraries: ['marker', 'geometry', 'places'], // Added 'marker' for advanced markers if needed
});

const getStatusColor = (status: EnvioExtendido['estado']): string => {
  switch (status) {
    case 'pendiente_asignacion': return '#FFC107'; // Amarillo
    case 'asignado': return '#2196F3';             // Azul
    case 'en_camino': return '#FF9800';            // Naranja
    case 'entregado': return '#4CAF50';             // Verde
    case 'no_entregado': return '#F44336';         // Rojo
    case 'cancelado': return '#9E9E9E';            // Gris
    default: return '#757575';                     // Gris Oscuro por defecto
  }
};

export function MapaEnviosComponent({ envios }: MapaEnviosComponentProps) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [map, setMap] = React.useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = React.useState<google.maps.Marker[]>([]);
  const [infoWindow, setInfoWindow] = React.useState<google.maps.InfoWindow | null>(null);
   const [isLoadingMap, setIsLoadingMap] = React.useState(true);

  React.useEffect(() => {
    if (!API_KEY) {
      toast({ title: "Error de Configuración", description: "Falta la clave API de Google Maps.", variant: "destructive"});
      setIsLoadingMap(false);
      return;
    }

    loader.load().then((google) => {
      if (mapRef.current && !map) {
        const newMap = new google.maps.Map(mapRef.current, {
          center: MAR_DEL_PLATA_CENTER,
          zoom: 12,
          mapId: 'RUMBOS_ENVIOS_MAP', // Optional: for cloud-based map styling
        });
        setMap(newMap);
        setInfoWindow(new google.maps.InfoWindow());
      }
      setIsLoadingMap(false);
    }).catch(e => {
      console.error("Error loading Google Maps API:", e);
      toast({ title: "Error al cargar Mapa", description: "No se pudo inicializar Google Maps.", variant: "destructive"});
      setIsLoadingMap(false);
    });
  }, [map, toast]);


  React.useEffect(() => {
    if (!map || !google.maps) { // Ensure google.maps is available
        if (map && envios.length === 0 && markers.length > 0) { // Clear markers if envios become empty
            markers.forEach(marker => marker.setMap(null));
            setMarkers([]);
        }
        return;
    }

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

    envios.forEach(envio => {
      if (envio.latitud_destino && envio.longitud_destino) {
        const marker = new google.maps.Marker({
          position: { lat: envio.latitud_destino, lng: envio.longitud_destino },
          map: map,
          title: `Envío ID: ${envio.id?.substring(0,8)}\nDestino: ${envio.direccion_destino}\nEstado: ${envio.estado}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: getStatusColor(envio.estado),
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: '#ffffff' // White border for better visibility
          },
        });

        marker.addListener('click', () => {
          if (infoWindow) {
            const content = `
              <div style="font-family: sans-serif; padding: 5px;">
                <h4 style="margin:0 0 5px 0; font-size: 1em;">Envío ID: ${envio.id?.substring(0,8)}</h4>
                <p style="margin:0 0 3px 0; font-size: 0.9em;"><strong>Destino:</strong> ${envio.direccion_destino}</p>
                <p style="margin:0; font-size: 0.9em;"><strong>Estado:</strong> ${envio.estado || 'N/A'}</p>
                ${envio.cliente_temporal_nombre ? `<p style="margin:3px 0 0 0; font-size: 0.9em;"><strong>Cliente:</strong> ${envio.cliente_temporal_nombre}</p>` : ''}
              </div>
            `;
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
          }
        });
        newMarkers.push(marker);
      }
    });
    setMarkers(newMarkers);

  }, [map, envios, infoWindow]); // Add infoWindow to dependencies

  if (isLoadingMap && API_KEY) {
    return (
      <div className="w-full h-full flex justify-center items-center bg-muted/50 rounded-md">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando mapa...</p>
      </div>
    );
  }
  
  if (!API_KEY) {
     return (
      <div className="w-full h-full flex justify-center items-center bg-destructive/10 rounded-md p-4 text-center">
        <p className="text-destructive">La API Key de Google Maps no está configurada. El mapa no se puede mostrar.</p>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full rounded-md shadow-md" style={{ minHeight: '400px' }} />;
}
