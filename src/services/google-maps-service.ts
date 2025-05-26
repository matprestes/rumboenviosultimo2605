// REMOVED 'use server'; directive. This module is for client-side Google Maps API interaction.

import { Loader, type LoaderOptions } from '@googlemaps/js-api-loader';

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
    'La clave de Google Maps API falta. Geocodificación y mapas no funcionarán. Asegurate de definir NEXT_PUBLIC_Maps_API_KEY en tu archivo .env.local.'
  );
}

// Libraries needed for your application. Geocoder is available by default.
// 'places' might be for autocomplete, 'geometry' for calculations.
const libraries: LoaderOptions['libraries'] = ['places', 'geometry'];

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
    console.warn('getGoogleMapsApi fue llamado desde un entorno no navegador.');
    return Promise.reject(new Error('Google Maps API no puede cargarse en el servidor.'));
  }

  if (!API_KEY) {
    console.warn('La clave API de Google Maps no está configurada.'); // Log warning
    return Promise.reject(new Error('La clave API de Google Maps no está configurada.'));
  }

  if (!googleMapsApiPromise) {
    const loader = getLoaderInstance();
    googleMapsApiPromise = loader.load().catch(err => {
      console.error("Error cargando Google Maps API:", err);
      googleMapsApiPromise = null; // Permitir reintentar

      let userMessage = 'Fallo al inicializar Google Maps. ';
      const errorMessage = (err as Error)?.message?.toLowerCase() || '';

      if (errorMessage.includes('network error')) {
        userMessage += 'Verificá tu conexión de red.';
      } else if (errorMessage.includes('apinotactivatedmaperror') ||
                 errorMessage.includes('keynotactivatedmaperror') ||
                 errorMessage.includes('billingnotenabledmaperror')) {
        userMessage += 'La API "Maps JavaScript API" podría no estar habilitada, la facturación podría no estar activa para tu proyecto, o la clave API no tiene permisos. Verificá tu consola de Google Cloud.';
      } else if (errorMessage.includes('referernotallowedmaperror')) {
        userMessage += 'La URL actual no está permitida por las restricciones de tu clave API. Verificá la configuración de "Referers HTTP" en Google Cloud Console.';
      } else {
        userMessage += 'Posibles causas: la API "Maps JavaScript API" no está habilitada, falta facturación en tu proyecto, o la clave API tiene restricciones mal configuradas. Verificá tu consola de Google Cloud y la consola del navegador para más detalles.';
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
    console.warn('geocodeAddress fue llamado desde un entorno no navegador.');
    return null;
  }

  if (!API_KEY) {
    console.error('Geocodificación omitida: falta la API Key.');
    // Intentar cargar la API para que falle y muestre el error de configuración si es el caso
    try {
      await getGoogleMapsApi();
    } catch (apiError) {
      // El error ya se logueó o se lanzó desde getGoogleMapsApi
    }
    return null;
  }

  try {
    const google = await getGoogleMapsApi();

    // Asegurarse de que Geocoder esté disponible
    if (!google || !google.maps || !google.maps.Geocoder) {
      console.error('Google Maps Geocoder no está disponible. La API pudo no haberse cargado correctamente.');
      throw new Error('Geocoder no disponible. Puede que la API no haya cargado correctamente.');
    }

    const geocoder = new google.maps.Geocoder();

    // --- MODIFICACIÓN CLAVE AQUÍ ---
    // Añadir contexto de ciudad y país a la dirección si no está presente
    let contextualAddress = address;
    if (!address.toLowerCase().includes('mar del plata')) {
      contextualAddress = `${address}, Mar del Plata`;
    }
    if (!contextualAddress.toLowerCase().includes('argentina')) {
      contextualAddress = `${contextualAddress}, Argentina`;
    }
    // --- FIN DE MODIFICACIÓN CLAVE ---

    const request: google.maps.GeocoderRequest = {
      address: contextualAddress, // Usar la dirección con contexto
      componentRestrictions: { country: 'AR' }, // Restringir a Argentina sigue siendo una buena práctica
      bounds: new google.maps.LatLngBounds( // El bounding box ayuda a sesgar los resultados
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
        if (component.types.includes('locality')) {
          cityComponent = component.long_name;
          if (component.long_name.toLowerCase() === 'mar del plata') {
            isMarDelPlataLocality = true;
          }
        }
        if (component.types.includes('country')) {
          countryComponent = component.long_name;
          if (component.short_name === 'AR') {
             // Confirmación adicional de que es Argentina
          }
        }
      });

      // --- LÓGICA DE VALIDACIÓN AJUSTADA ---
      // 1. Priorizar si la API identifica la localidad como "Mar del Plata"
      // 2. Como segunda opción, verificar si la dirección formateada contiene "Mar del Plata"
      // 3. Como última opción, verificar si las coordenadas caen dentro de tus límites estrictos.
      const formattedAddressContainsMDP = result.formatted_address.toLowerCase().includes('mar del plata');
      
      if (isMarDelPlataLocality || formattedAddressContainsMDP) {
        // Adicionalmente, podrías verificar los límites si quieres ser extra estricto,
        // pero si la API ya lo identifica como MDP, suele ser suficiente.
        // const isInStrictBounds =
        //   lat >= MAR_DEL_PLATA_BOUNDS.south &&
        //   lat <= MAR_DEL_PLATA_BOUNDS.north &&
        //   lng >= MAR_DEL_PLATA_BOUNDS.west &&
        //   lng <= MAR_DEL_PLATA_BOUNDS.east;
        // if (!isInStrictBounds) console.warn("Identificado como MDP pero fuera de límites estrictos:", result.formatted_address);

        return {
          lat,
          lng,
          formattedAddress: result.formatted_address,
          city: cityComponent || 'Mar del Plata', // Asegurar que la ciudad se popule
          country: countryComponent || 'Argentina',
        };
      } else {
         // Si no es la localidad MDP ni la dirección formateada lo incluye,
         // entonces recurrir a la comprobación de límites como última instancia.
        const isInMarDelPlataStrictBounds =
            lat >= MAR_DEL_PLATA_BOUNDS.south &&
            lat <= MAR_DEL_PLATA_BOUNDS.north &&
            lng >= MAR_DEL_PLATA_BOUNDS.west &&
            lng <= MAR_DEL_PLATA_BOUNDS.east;
        
        if (isInMarDelPlataStrictBounds) {
            console.warn('La dirección está dentro de los límites de MDP pero no fue identificada como localidad MDP:', result.formatted_address, { cityComponent });
            return {
                lat,
                lng,
                formattedAddress: result.formatted_address,
                city: cityComponent || 'Mar del Plata',
                country: countryComponent || 'Argentina',
            };
        }

        console.warn('La dirección geocodificada no parece estar en Mar del Plata:', result.formatted_address, { cityComponent, lat, lng });
        return null;
      }
    } else {
      console.warn('No se encontraron resultados para la dirección (con contexto):', contextualAddress);
      return null;
    }
  } catch (error) {
    console.error('Error en geocodeAddress:', error);
    // Re-lanzar el error si es de inicialización de Maps para que sea manejado más arriba si es necesario.
    if (error instanceof Error && error.message.startsWith('Fallo al inicializar Google Maps')) {
      throw error;
    }
    // Para otros errores de geocodificación, lanzar uno nuevo o el mismo.
    throw new Error(`Fallo en geocodificación: ${error instanceof Error ? error.message : String(error)}`);
  }
}