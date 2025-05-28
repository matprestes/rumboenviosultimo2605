
// src/services/google-maps-service.ts

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

if (typeof window !== 'undefined' && !API_KEY) {
  console.warn(
    'La clave de Google Maps API falta. Geocodificación y mapas no funcionarán. Asegurate de definir NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en tu archivo .env.local.'
  );
}

// Define the libraries needed across the application.
// "marker" library is needed for AdvancedMarkerElement.
// "directions" is part of the core API, no need to list it here.
const libraries: LoaderOptions['libraries'] = ['geocoding', 'places', 'marker', 'geometry'];

const loaderOptions: LoaderOptions = {
  apiKey: API_KEY || '',
  version: 'weekly',
  libraries,
  id: '__googleMapsScriptId', // Consistent ID for the script tag
};

let googleMapsApiPromise: Promise<typeof google> | null = null;
let loaderInstance: Loader | null = null;

function getLoaderInstance(): Loader {
  if (!API_KEY) {
    throw new Error('Google Maps API key no está configurada para la instancia del Loader.');
  }
  if (!loaderInstance) {
    loaderInstance = new Loader(loaderOptions);
  }
  return loaderInstance;
}

export async function getGoogleMapsApi(): Promise<typeof google> {
  if (typeof window === 'undefined') {
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
      console.error("Error cargando Google Maps API desde el loader:", err);
      googleMapsApiPromise = null; 

      let userMessage = 'Fallo al inicializar Google Maps. ';
      const errorMessage = (err as Error)?.message?.toLowerCase() || '';

      if (errorMessage.includes('apinotactivatedmaperror') || errorMessage.includes('keynotactivatedmaperror')) {
        userMessage += 'La API "Maps JavaScript API" podría no estar habilitada o la clave ser incorrecta. Verificá tu consola de Google Cloud.';
      } else if (errorMessage.includes('billingnotenabledmaperror')) {
         userMessage += 'La facturación no está habilitada para el proyecto en Google Cloud.';
      } else if (errorMessage.includes('referernotallowedmaperror')) {
        userMessage += 'La URL actual no está permitida por las restricciones de tu clave API. Verificá la configuración de "Referers HTTP" en Google Cloud Console.';
      } else if (errorMessage.includes('invalidkeymaperror')) {
        userMessage += 'La clave API proporcionada es inválida. Verifícala.';
      } else {
        userMessage += `Detalle: ${errorMessage}. Posibles causas: API no habilitada, problemas de facturación, restricciones de clave, o problemas de red. Verificá tu consola de Google Cloud y la consola del navegador.`;
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
  if (typeof window === 'undefined' || !API_KEY) return null;
  if (stops.length < 2) return stops; // Not enough stops to optimize

  try {
    const google = await getGoogleMapsApi();
    if (!google || !google.maps || !google.maps.DirectionsService) {
      throw new Error('DirectionsService no disponible. API de Google Maps no cargada o incompleta.');
    }
    // Dynamically import the directions library if not already available (it should be part of core)
    // await google.maps.importLibrary("directions"); // Not strictly necessary, as it's core

    const directionsService = new google.maps.DirectionsService();

    if (stops.length === 2) { // Origin and Destination only
      return stops;
    }

    const origin = stops[0].location;
    const destination = stops[stops.length - 1].location;
    const waypointsInput = stops.slice(1, -1);

    if (waypointsInput.length === 0) { // Still only origin and destination after slicing
        return stops;
    }

    const waypoints: google.maps.DirectionsWaypoint[] = waypointsInput.map(stop => ({
      location: stop.location,
      stopover: true,
    }));

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
          const orderedWaypoints: MappableStop[] = [];
          if (route.waypoint_order && route.waypoint_order.length > 0) {
            route.waypoint_order.forEach(orderIndex => {
              orderedWaypoints.push(waypointsInput[orderIndex]);
            });
          } else { // No reordering occurred or only one waypoint
            orderedWaypoints.push(...waypointsInput);
          }
          
          const finalRoute: MappableStop[] = [stops[0], ...orderedWaypoints];
          // Add destination only if it's different from origin or if there were waypoints
          if (stops.length > 1) {
            finalRoute.push(stops[stops.length - 1]);
          }
          
          // Deduplicate by ID in case origin/destination were also passed as waypoints accidentally
          const uniqueRoute = Array.from(new Map(finalRoute.map(item => [item.id, item])).values());
          resolve(uniqueRoute);

        } else {
          console.error('Error de Google Maps Directions API:', status, response);
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
  if (typeof window !== 'undefined') {
    console.error("serverSideGeocodeAddress fue llamada en el cliente. Esta función es solo para servidor.");
    return null;
  }
  return null;
}
