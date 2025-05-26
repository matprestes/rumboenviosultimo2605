
// REMOVED 'use server'; directive if it was present. This module is for client-side Google Maps API interaction.

import { Loader, type LoaderOptions } from '@googlemaps/js-api-loader';

const MAR_DEL_PLATA_BOUNDS = { // Approximate bounding box for Mar del Plata
  north: -37.90,
  south: -38.10,
  west: -57.65,
  east: -57.50,
};

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!API_KEY && typeof window !== 'undefined') { // Check for window to avoid server-side warnings during build
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
let loaderInstance: Loader | null = null;

function getLoaderInstance(): Loader {
  if (!API_KEY) {
    // This case should ideally be handled by the API_KEY check above or in consuming components
    // For robustness, we'll still throw if somehow instantiated without an API key at this stage
    throw new Error('Google Maps API key is not configured for Loader instantiation.');
  }
  if (!loaderInstance) {
    loaderInstance = new Loader(loaderOptions);
  }
  return loaderInstance;
}

export async function getGoogleMapsApi(): Promise<typeof google> {
  if (typeof window === 'undefined') {
    // Prevent execution on the server during build/SSR for non-Server Action contexts
    return Promise.reject(new Error('Google Maps API cannot be loaded on the server. Call from client-side component.'));
  }
  if (!API_KEY) {
    return Promise.reject(new Error('Google Maps API key is not configured.'));
  }
  if (!googleMapsApiPromise) {
    const loader = getLoaderInstance();
    googleMapsApiPromise = loader.load().catch(err => {
      console.error("Failed to load Google Maps API via Loader:", err);
      googleMapsApiPromise = null; // Reset promise on failure to allow retry if applicable
      throw err; // Re-throw to be caught by calling code
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

// This function is intended for client-side use only as it uses the JS Maps API
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (typeof window === 'undefined' || typeof google === 'undefined' || typeof google.maps === 'undefined') {
    console.warn('geocodeAddress called in a non-browser environment or before Maps API loaded.');
    return null;
  }
  if (!API_KEY) {
    console.error('Geocoding skipped: Google Maps API key is missing.');
    return null;
  }

  try {
    // getGoogleMapsApi ensures the 'google' object is loaded.
    // However, geocodeAddress might be called before the promise from getGoogleMapsApi resolves in some components.
    // A robust way is to ensure 'google' is available directly.
    const maps = (await getGoogleMapsApi()).maps;
    const geocoder = new maps.Geocoder();

    const request: google.maps.GeocoderRequest = {
      address: address,
      componentRestrictions: {
        country: 'AR',
      },
       bounds: new maps.LatLngBounds(
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
    console.error('Geocoding error in geocodeAddress:', error);
    return null;
  }
}
