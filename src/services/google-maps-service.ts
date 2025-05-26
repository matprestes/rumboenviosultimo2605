
// REMOVED 'use server'; directive. This module is for client-side Google Maps API interaction.

import { Loader, type LoaderOptions } from '@googlemaps/js-api-loader';

const MAR_DEL_PLATA_BOUNDS = { // Approximate bounding box for Mar del Plata
  north: -37.90,
  south: -38.10,
  west: -57.65,
  east: -57.50,
};

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!API_KEY && typeof window !== 'undefined') {
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
    // This case should ideally be caught before calling getGoogleMapsApi if !API_KEY
    throw new Error('Google Maps API key is not configured for Loader instantiation.');
  }
  if (!loaderInstance) {
    loaderInstance = new Loader(loaderOptions);
  }
  return loaderInstance;
}

export async function getGoogleMapsApi(): Promise<typeof google> {
  if (typeof window === 'undefined') {
    // This function should not be called server-side.
    console.warn('getGoogleMapsApi called in a non-browser environment.');
    return Promise.reject(new Error('Google Maps API cannot be loaded on the server.'));
  }
  if (!API_KEY) {
    // Logged by the warning above, but good to reject explicitly.
    return Promise.reject(new Error('Google Maps API key is not configured.'));
  }

  if (!googleMapsApiPromise) {
    const loader = getLoaderInstance();
    googleMapsApiPromise = loader.load().catch(err => {
      console.error("Failed to load Google Maps API via Loader in service:", err);
      googleMapsApiPromise = null; // Reset promise on failure to allow retry if applicable
      
      let userFriendlyMessage = 'Failed to initialize Google Maps. ';
      if (err && typeof err.message === 'string' && err.message.toLowerCase().includes('network error')) {
        userFriendlyMessage += 'A network error occurred. Please check your internet connection.';
      } else {
        // This is a common point of failure. Guide the user.
        userFriendlyMessage += 'Common issues include: the "Maps JavaScript API" not being activated in your Google Cloud Console, billing not being enabled for your project, or an incorrect/restricted API key. Please check your Google Cloud Console settings. The browser console might show a specific error like "ApiNotActivatedMapError", "RefererNotAllowedMapError", or other API-related messages from Google.';
      }
      throw new Error(userFriendlyMessage);
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
    console.warn('geocodeAddress called in a non-browser environment.');
    return null;
  }
   if (!API_KEY) {
    // This case is handled by getGoogleMapsApi, but double-check.
    console.error('Geocoding skipped: Google Maps API key is missing.');
    // It's better to let getGoogleMapsApi throw the error so consuming components handle it.
    await getGoogleMapsApi(); // This will throw if API_KEY is missing.
    return null; // Should not be reached if API_KEY is missing.
  }

  try {
    const google = await getGoogleMapsApi();
    if (!google || !google.maps || !google.maps.Geocoder) {
        // This should ideally not happen if getGoogleMapsApi resolved successfully.
        console.error('Google Maps Geocoder API is not available after load attempt.');
        throw new Error('Google Maps Geocoder is unavailable. The API might not have loaded correctly.');
    }
    const geocoder = new google.maps.Geocoder();

    const request: google.maps.GeocoderRequest = {
      address: address,
      componentRestrictions: {
        country: 'AR', // Restrict to Argentina
      },
      // Bias towards Mar del Plata
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

      result.address_components.forEach(component => {
        if (component.types.includes('locality')) { // 'locality' usually represents the city
          cityComponent = component.long_name;
        }
        if (component.types.includes('country')) {
          countryComponent = component.long_name;
        }
      });
      
      // Check if the result is within the defined bounds for Mar del Plata
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
          city: cityComponent || undefined, // Store city if found
          country: countryComponent || undefined, // Store country if found
        };
      } else {
        console.warn('Address geocoded outside Mar del Plata bounds:', result.formatted_address, {lat,lng});
        return null; // Address is outside Mar del Plata
      }
    } else {
      console.warn('No results found for address:', address);
      return null;
    }
  } catch (error) {
    console.error('Geocoding error in geocodeAddress:', error);
    // Re-throw the error if it's already the user-friendly one from getGoogleMapsApi,
    // or wrap it if it's a different error.
    if (error instanceof Error && error.message.startsWith('Failed to initialize Google Maps')) {
        throw error;
    }
    throw new Error(`Geocoding failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
