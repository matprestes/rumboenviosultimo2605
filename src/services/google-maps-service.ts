
import { Loader, type LoaderOptions } from '@googlemaps/js-api-loader';

const MAR_DEL_PLATA_BOUNDS = { // Approximate bounding box for Mar del Plata
  north: -37.90,
  south: -38.10,
  west: -57.65,
  east: -57.50,
};

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
  console.warn(
    'Google Maps API key is missing. Geocoding and maps will not work. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file.'
  );
}

// Define the superset of all libraries needed by the application
const comprehensiveLibraries: LoaderOptions['libraries'] = ['geocoding', 'places', 'marker', 'geometry'];

const loaderOptions: LoaderOptions = {
  apiKey: API_KEY || '',
  version: 'weekly',
  libraries: comprehensiveLibraries,
  id: '__googleMapsScriptId', // Ensure a consistent ID for the script tag
};

let googleMapsApiPromise: Promise<typeof google> | null = null;
let loaderInstance: Loader | null = null; // Singleton Loader instance

function getLoaderInstance(): Loader {
  if (!API_KEY) {
    throw new Error('Google Maps API key is not configured for Loader instantiation.');
  }
  if (!loaderInstance) {
    // console.log("Instantiating Google Maps Loader with options:", loaderOptions); // For debugging
    loaderInstance = new Loader(loaderOptions);
  }
  return loaderInstance;
}

export async function getGoogleMapsApi(): Promise<typeof google> {
  if (!API_KEY) {
    return Promise.reject(new Error('Google Maps API key is not configured.'));
  }
  if (!googleMapsApiPromise) {
    // Ensures Loader is instantiated only once via getLoaderInstance,
    // and .load() is called only once on that singleton instance.
    const loader = getLoaderInstance();
    googleMapsApiPromise = loader.load();
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
  if (!API_KEY) {
    console.error('Geocoding skipped: Google Maps API key is missing.');
    return null;
  }

  try {
    const google = await getGoogleMapsApi();
    const geocoder = new google.maps.Geocoder();

    const request: google.maps.GeocoderRequest = {
      address: address,
      componentRestrictions: {
        country: 'AR',
      },
       bounds: new google.maps.LatLngBounds(
        { lat: MAR_DEL_PLATA_BOUNDS.south, lng: MAR_DEL_PLATA_BOUNDS.west },
        { lat: MAR_DEL_PLATA_BOUNDS.north, lng: MAR_DEL_PLATA_BOUNDS.east }
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

      result.address_components.forEach(component => {
        if (component.types.includes('locality')) {
          cityComponent = component.long_name;
        }
        if (component.types.includes('country')) {
          countryComponent = component.long_name;
        }
      });
      
      const isInMarDelPlataStrictBounds =
        lat >= MAR_DEL_PLATA_BOUNDS.south &&
        lat <= MAR_DEL_PLATA_BOUNDS.north &&
        lng >= MAR_DEL_PLATA_BOUNDS.west &&
        lng <= MAR_DEL_PLATA_BOUNDS.east;
      
      // Consider valid if strictly within bounds OR if locality is Mar del Plata (for edge cases)
      // However, for this service, let's be strict with bounds for now.
      if (isInMarDelPlataStrictBounds) {
        return {
          lat,
          lng,
          formattedAddress: result.formatted_address,
          city: cityComponent || undefined,
          country: countryComponent || undefined,
        };
      } else {
        console.warn('Address geocoded outside Mar del Plata bounds:', result.formatted_address, {lat,lng});
        return null;
      }
    } else {
      console.warn('No results found for address:', address);
      return null;
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    if (error instanceof Error && (error.message.includes("google is not defined") || error.message.includes("Cannot read properties of undefined (reading 'Geocoder')"))) {
        console.error("Google Maps API might not have loaded correctly before geocodeAddress was called.");
    }
    return null;
  }
}
