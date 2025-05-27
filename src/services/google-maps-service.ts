
// REMOVED 'use server'; directive. This module is for client-side Google Maps API interaction.

import { Loader, type LoaderOptions } from '@googlemaps/js-api-loader';
import type { MappableStop } from '@/lib/schemas'; 

// Aproximado bounding box para Mar del Plata
const MAR_DEL_PLATA_BOUNDS = {
  north: -37.90,
  south: -38.10,
  west: -57.65,
  east: -57.50,
};

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!API_KEY && typeof window !== 'undefined') { // Check for window to avoid server-side warnings during build
  console.warn(
    'La clave de Google Maps API falta. Geocodificación y mapas no funcionarán. Asegurate de definir NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en tu archivo .env.local.'
  );
}

const libraries: LoaderOptions['libraries'] = ['geocoding', 'places', 'marker', 'geometry', 'directions'];

const loaderOptions: LoaderOptions = {
  apiKey: API_KEY || '', // Loader handles empty string gracefully, but our getGoogleMapsApi throws error
  version: 'weekly',
  libraries,
  id: '__googleMapsScriptId', 
};

let googleMapsApiPromise: Promise<typeof google> | null = null;
let loaderInstance: Loader | null = null;

function getLoaderInstance(): Loader {
  if (!API_KEY) { // Should not be hit if getGoogleMapsApi pre-check works
    throw new Error('Google Maps API key no está configurada para la instancia del Loader.');
  }
  if (!loaderInstance) {
    loaderInstance = new Loader(loaderOptions);
  }
  return loaderInstance;
}

export async function getGoogleMapsApi(): Promise<typeof google> {
  if (typeof window === 'undefined') {
    // console.warn('getGoogleMapsApi fue llamado desde un entorno no navegador. Google Maps API solo funciona en el cliente.');
    return Promise.reject(new Error('Google Maps API no puede cargarse en el servidor.'));
  }

  if (!API_KEY) {
    const errorMessage = 'La clave API de Google Maps no está configurada. Verifique la variable de entorno NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.';
    console.error(errorMessage);
    return Promise.reject(new Error(errorMessage));
  }

  if (!googleMapsApiPromise) {
    const loader = getLoaderInstance();
    googleMapsApiPromise = loader.load().catch(err => {
      console.error("Error cargando Google Maps API:", err);
      googleMapsApiPromise = null; 

      let userMessage = 'Fallo al inicializar Google Maps. ';
      const errorMessage = (err as Error)?.message?.toLowerCase() || '';

      if (errorMessage.includes('apinotactivatedmaperror') || errorMessage.includes('keynotactivatedmaperror')) {
        userMessage += 'La API "Maps JavaScript API" podría no estar habilitada o la clave ser incorrecta. Verificá tu consola de Google Cloud.';
      } else if (errorMessage.includes('billingnotenabledmaperror')) {
         userMessage += 'La facturación no está habilitada para el proyecto en Google Cloud.';
      } else if (errorMessage.includes('referernotallowedmaperror')) {
        userMessage += 'La URL actual no está permitida por las restricciones de tu clave API. Verificá la configuración de "Referers HTTP" en Google Cloud Console.';
      } else if (errorMessage.includes('library directions is unknown')) { // Should be caught by correct libraries array
        userMessage += 'Se intentó cargar la librería "directions" incorrectamente. Ya está incluida en el core o no es un nombre válido de librería para cargar explícitamente.';
      } else {
        userMessage += 'Posibles causas: API no habilitada, problemas de facturación, restricciones de clave, o problemas de red. Verificá tu consola de Google Cloud y la consola del navegador.';
      }
      throw new Error(userMessage); 
    });
  }
  return googleMapsApiPromise;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  city?: string;
  country?: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!API_KEY) {
    return null;
  }

  try {
    const google = await getGoogleMapsApi();
    if (!google || !google.maps || !google.maps.Geocoder) {
      throw new Error('Geocoder no disponible. API de Google Maps no cargada o incompleta.');
    }

    const geocoder = new google.maps.Geocoder();
    let contextualAddress = address;
    if (!address.toLowerCase().includes('mar del plata')) {
      contextualAddress = `${address}, Mar del Plata`;
    }
    if (!contextualAddress.toLowerCase().includes('argentina')) {
      contextualAddress = `${contextualAddress}, Argentina`;
    }

    const request: google.maps.GeocoderRequest = {
      address: contextualAddress,
      componentRestrictions: { country: 'AR' },
      bounds: new google.maps.LatLngBounds(
        new google.maps.LatLng(MAR_DEL_PLATA_BOUNDS.south, MAR_DEL_PLATA_BOUNDS.west),
        new google.maps.LatLng(MAR_DEL_PLATA_BOUNDS.north, MAR_DEL_PLATA_BOUNDS.east)
      ),
    };

    const response = await geocoder.geocode(request);

    if (response.results && response.results.length > 0) {
      const result = response.results[0];
      const location = result.geometry.location;
      const lat = location.lat();
      const lng = location.lng();
      let cityComponent = '';
      let countryComponent = '';
      let isMarDelPlataLocality = false;

      result.address_components.forEach(component => {
        if (component.types.includes('locality')) cityComponent = component.long_name;
        if (component.types.includes('country')) countryComponent = component.long_name;
        if (component.long_name.toLowerCase() === 'mar del plata') isMarDelPlataLocality = true;
      });

      const formattedAddressContainsMDP = result.formatted_address.toLowerCase().includes('mar del plata');
      const isInBounds = lat >= MAR_DEL_PLATA_BOUNDS.south && lat <= MAR_DEL_PLATA_BOUNDS.north &&
                         lng >= MAR_DEL_PLATA_BOUNDS.west && lng <= MAR_DEL_PLATA_BOUNDS.east;

      if (isMarDelPlataLocality || formattedAddressContainsMDP || isInBounds) {
        if (!isMarDelPlataLocality && !formattedAddressContainsMDP && isInBounds) {
          console.warn('Dirección en límites de MDP pero no identificada como tal por API (considerada válida):', result.formatted_address);
        }
        return {
          lat,
          lng,
          formattedAddress: result.formatted_address,
          city: cityComponent || 'Mar del Plata', 
          country: countryComponent || 'Argentina',
        };
      } else {
        console.warn('La dirección geocodificada no parece estar en Mar del Plata:', result.formatted_address, { cityComponent, lat, lng });
        return null; 
      }
    } else {
      console.warn('No se encontraron resultados para la dirección (con contexto):', contextualAddress);
      return null;
    }
  } catch (error) {
    console.error('Error en geocodeAddress:', error);
    if (error instanceof Error && !error.message.startsWith('Fallo al inicializar Google Maps')) {
      throw new Error(`Fallo en geocodificación: ${error.message}`);
    }
    return null;
  }
}

export async function optimizeDeliveryRoute(stops: MappableStop[]): Promise<MappableStop[] | null> {
    if (typeof window === 'undefined') return null;
    if (stops.length < 2) return stops; // Not enough points to optimize or form a route

    try {
        const google = await getGoogleMapsApi();
        if (!google || !google.maps || !google.maps.DirectionsService) {
            throw new Error('DirectionsService no disponible. API de Google Maps no cargada o incompleta.');
        }

        const directionsService = new google.maps.DirectionsService();
        const origin = stops[0].location;
        const destination = stops[stops.length - 1].location;
        const waypoints: google.maps.DirectionsWaypoint[] = stops
            .slice(1, -1)
            .map(stop => ({ location: stop.location, stopover: true }));

        // No waypoints to optimize if only origin and destination
        if (stops.length === 2 || waypoints.length === 0) {
            return stops;
        }

        const request: google.maps.DirectionsRequest = {
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            optimizeWaypoints: true,
            travelMode: google.maps.TravelMode.DRIVING,
        };

        return new Promise((resolve, reject) => {
            directionsService.route(request, (response, status) => {
                if (status === google.maps.DirectionsStatus.OK && response && response.routes && response.routes.length > 0) {
                    const route = response.routes[0];
                    const optimizedWaypoints: MappableStop[] = [];
                    if (route.waypoint_order && route.waypoint_order.length > 0) {
                        route.waypoint_order.forEach(orderIndex => {
                            optimizedWaypoints.push(stops.slice(1, -1)[orderIndex]);
                        });
                    } else {
                         // If no waypoint_order but waypoints were provided, keep original waypoint order
                        optimizedWaypoints.push(...stops.slice(1,-1));
                    }
                    
                    const finalOrderedStops = [stops[0], ...optimizedWaypoints, stops[stops.length - 1]];
                    // Deduplicate in case origin/destination were also waypoints (unlikely with optimizeWaypoints)
                    const uniqueOptimizedStops = Array.from(new Map(finalOrderedStops.map(item => [item.id, item])).values());
                    resolve(uniqueOptimizedStops);

                } else {
                    console.error('Error de Directions API:', status, response);
                    reject({ message: `Error de Google Maps Directions API: ${status}`, status });
                }
            });
        });
    } catch (error: any) {
        console.error('Error en optimizeDeliveryRoute:', error);
        throw error instanceof Error ? error : new Error(String(error?.message || 'Error desconocido durante la optimización de ruta.'));
    }
}


export async function serverSideGeocodeAddress(address: string): Promise<GeocodeResult | null> {
  console.warn("Server-side geocoding for \"" + address + "\" is NOT IMPLEMENTED. Esta función es un placeholder.");
  return null;
}

    