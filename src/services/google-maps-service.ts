
// REMOVED 'use server'; directive. This module is for client-side Google Maps API interaction.

import { Loader, type LoaderOptions } from '@googlemaps/js-api-loader';
import type { MappableStop } from '@/lib/schemas'; // Import MappableStop

// Aproximado bounding box para Mar del Plata
const MAR_DEL_PLATA_BOUNDS = {
  north: -37.90,
  south: -38.10,
  west: -57.65,
  east: -57.50,
};

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!API_KEY && typeof window !== 'undefined') {
  console.warn(
    'La clave de Google Maps API falta. Geocodificación y mapas no funcionarán. Asegurate de definir NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en tu archivo .env.local.'
  );
}

// Libraries needed for your application.
const libraries: LoaderOptions['libraries'] = ['geocoding', 'places', 'marker', 'geometry', 'directions'];

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
    // This case should ideally be caught before calling, but as a safeguard:
    throw new Error('Google Maps API key no está configurada para la instancia del Loader.');
  }
  if (!loaderInstance) {
    loaderInstance = new Loader(loaderOptions);
  }
  return loaderInstance;
}

export async function getGoogleMapsApi(): Promise<typeof google> {
  if (typeof window === 'undefined') {
    console.warn('getGoogleMapsApi fue llamado desde un entorno no navegador.');
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
      googleMapsApiPromise = null; // Permitir reintentar

      let userMessage = 'Fallo al inicializar Google Maps. ';
      const errorMessage = (err as Error)?.message?.toLowerCase() || '';

      if (errorMessage.includes('apinotactivatedmaperror') || errorMessage.includes('keynotactivatedmaperror')) {
        userMessage += 'La API "Maps JavaScript API" podría no estar habilitada o la clave ser incorrecta. Verificá tu consola de Google Cloud.';
      } else if (errorMessage.includes('billingnotenabledmaperror')) {
         userMessage += 'La facturación no está habilitada para el proyecto en Google Cloud.';
      } else if (errorMessage.includes('referernotallowedmaperror')) {
        userMessage += 'La URL actual no está permitida por las restricciones de tu clave API. Verificá la configuración de "Referers HTTP" en Google Cloud Console.';
      } else {
        userMessage += 'Posibles causas: API no habilitada, problemas de facturación, o restricciones de clave. Verificá tu consola de Google Cloud y la consola del navegador.';
      }
      throw new Error(userMessage); // Throw the user-friendly message
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
    console.warn('geocodeAddress fue llamado desde un entorno no navegador.');
    return null;
  }
  if (!API_KEY) {
    console.error('Geocodificación omitida: falta la API Key de Google Maps.');
    return null;
  }

  try {
    const google = await getGoogleMapsApi();
    if (!google || !google.maps || !google.maps.Geocoder) {
      throw new Error('Geocoder no disponible. API de Google Maps no cargada.');
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
      const isInBounds = lat >= MAR_DEL_PLATA_BOUNDS.south && lat <= MAR_DEL_PLATA_BOUNDS.north && lng >= MAR_DEL_PLATA_BOUNDS.west && lng <= MAR_DEL_PLATA_BOUNDS.east;

      if (isMarDelPlataLocality || formattedAddressContainsMDP || isInBounds) {
        if (!isMarDelPlataLocality && !formattedAddressContainsMDP && isInBounds) {
          console.warn('Dirección en límites de MDP pero no identificada como tal por API:', result.formatted_address);
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
    // Propagar un error más genérico si no es un error de carga de API ya manejado
    if (error instanceof Error && !error.message.startsWith('Fallo al inicializar Google Maps')) {
      throw new Error(`Fallo en geocodificación: ${error.message}`);
    }
    // Si es error de carga, ya se manejó y se lanzó desde getGoogleMapsApi, o aquí retornamos null
    return null;
  }
}


export async function optimizeDeliveryRoute(stops: MappableStop[]): Promise<MappableStop[] | null> {
  if (stops.length < 2) {
    console.warn("Se necesitan al menos 2 paradas (origen y un destino) para optimizar la ruta.");
    return stops; // No hay nada que optimizar, o no es suficiente para la API
  }

  try {
    const google = await getGoogleMapsApi();
    if (!google || !google.maps || !google.maps.DirectionsService) {
      throw new Error('DirectionsService no disponible. API de Google Maps no cargada correctamente.');
    }

    const directionsService = new google.maps.DirectionsService();

    const origin = stops[0].location;
    let destination = origin; // Default if only one stop after origin
    const waypoints: google.maps.DirectionsWaypoint[] = [];

    if (stops.length > 1) {
      destination = stops[stops.length - 1].location;
      if (stops.length > 2) { // Waypoints only exist if there are more than 2 stops (origin, waypoint(s), destination)
        waypoints.push(...stops.slice(1, -1).map(stop => ({
          location: stop.location,
          stopover: true,
        })));
      }
    }
    
    // If only 2 stops, it's just origin and destination, no waypoints to optimize
    if (stops.length <= 2) {
        return stops; // Return original order
    }


    const request: google.maps.DirectionsRequest = {
      origin: origin,
      destination: destination,
      waypoints: waypoints,
      optimizeWaypoints: true, // Key for optimization!
      travelMode: google.maps.TravelMode.DRIVING,
    };

    const response = await directionsService.route(request);

    if (response.status === 'OK' && response.routes && response.routes.length > 0) {
      const route = response.routes[0];
      const optimizedStops: MappableStop[] = [];

      // Add origin
      optimizedStops.push(stops[0]);

      // Add waypoints in optimized order
      if (route.waypoint_order && route.waypoint_order.length > 0) {
        route.waypoint_order.forEach(orderIndex => {
          // waypoint_order refers to indices in the *original waypoints array*
          // The original waypoints array was stops.slice(1, -1)
          optimizedStops.push(stops[orderIndex + 1]); // +1 because stops[0] was origin
        });
      } else if (waypoints.length > 0) { // If no waypoint_order but waypoints were sent, add them in original order
         waypoints.forEach((wp, index) => optimizedStops.push(stops[index + 1]));
      }


      // Add destination (if it was different from origin, i.e., stops.length > 1)
      if (stops.length > 1) {
         optimizedStops.push(stops[stops.length - 1]);
      }
      
      return optimizedStops;
    } else {
      console.error('Error de Directions API:', response.status, response);
      throw new Error(`Error de Google Maps Directions API: ${response.status}`);
    }
  } catch (error) {
    console.error('Error en optimizeDeliveryRoute:', error);
    return null;
  }
}
