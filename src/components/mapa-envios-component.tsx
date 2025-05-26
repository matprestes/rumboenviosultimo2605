
"use client";

import * as React from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import type { UnassignedEnvioListItem, ActiveRepartoListItem } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { TruckIcon, PackageQuestion, MapPin } from 'lucide-react'; // Added PackageQuestion

interface MapaEnviosComponentProps {
  unassignedEnvios: UnassignedEnvioListItem[];
  // activeRepartos: ActiveRepartoListItem[]; // We might not display active repartos directly on this map view for now
  onUnassignedEnvioSelect: (envio: UnassignedEnvioListItem) => void;
  selectedEnvioId?: string | null;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAR_DEL_PLATA_CENTER = { lat: -38.00228, lng: -57.55754 };

const loader = new Loader({
  apiKey: API_KEY || '',
  version: 'weekly',
  libraries: ['marker', 'geometry', 'places'],
});

const UNASSIGNED_COLOR = '#FF5722'; // Deep Orange for unassigned
const SELECTED_UNASSIGNED_COLOR = '#FFC107'; // Amber for selected unassigned

export function MapaEnviosComponent({ 
  unassignedEnvios, 
  onUnassignedEnvioSelect,
  selectedEnvioId
}: MapaEnviosComponentProps) {
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
          mapId: 'RUMBOS_ENVIOS_ASIGNACION_MAP',
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
    if (!map || !google.maps) return;

    markers.forEach(marker => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

    unassignedEnvios.forEach(envio => {
      if (envio.latitud_destino && envio.longitud_destino) {
        const isSelected = envio.id === selectedEnvioId;
        const marker = new google.maps.Marker({
          position: { lat: envio.latitud_destino, lng: envio.longitud_destino },
          map: map,
          title: `Envío ID: ${envio.id?.substring(0,8)}\nDestino: ${envio.direccion_destino}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE, // Default to circle
            scale: isSelected ? 10 : 7, // Larger if selected
            fillColor: isSelected ? SELECTED_UNASSIGNED_COLOR : UNASSIGNED_COLOR,
            fillOpacity: 1,
            strokeWeight: 1.5,
            strokeColor: '#ffffff'
          },
          zIndex: isSelected ? 100 : 1,
        });

        marker.addListener('click', () => {
          onUnassignedEnvioSelect(envio);
          if (infoWindow) {
            const clienteInfo = envio.clientes ? `${envio.clientes.nombre} ${envio.clientes.apellido}` : envio.cliente_temporal_nombre;
            const content = `
              <div style="font-family: sans-serif; padding: 5px; max-width: 250px;">
                <h4 style="margin:0 0 5px 0; font-size: 1em; color: ${UNASSIGNED_COLOR};">Envío No Asignado</h4>
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
        newMarkers.push(marker);
      }
    });
    setMarkers(newMarkers);

  }, [map, unassignedEnvios, onUnassignedEnvioSelect, infoWindow, selectedEnvioId]);

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
