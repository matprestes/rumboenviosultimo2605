
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
let loaderInstance: Loader | null = null; // Keep a single instance of the Loader

function getLoaderInstance(): Loader {
  if (!API_KEY) {
    throw new Error('Google Maps API key is not configured for Loader instantiation.');
  }
  if (!loaderInstance) {
    loaderInstance = new Loader(loaderOptions);
  }
  return loaderInstance;
}

export async function getGoogleMapsApi(): Promise<typeof google> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps API cannot be loaded on the server. Call from client-side component.'));
  }
  if (!API_KEY) {
    return Promise.reject(new Error('Google Maps API key is not configured.'));
  }

  if (!googleMapsApiPromise) {
    // Ensures Loader is instantiated only once and load is called only once on that instance.
    const loader = getLoaderInstance();
    googleMapsApiPromise = loader.load().catch(err => {
      console.error("Failed to load Google Maps API via Loader in service:", err);
      googleMapsApiPromise = null; // Reset promise on failure to allow retry if applicable
      // Check if the error message from the loader or a related global error indicates ApiNotActivatedMapError
      // This is a heuristic as the loader itself might not pass the exact Google error object directly.
      // The browser console will show the "ApiNotActivatedMapError" directly from Google's script.
      let userFriendlyMessage = 'Failed to load Google Maps API. Please check the browser console for details from Google.';
      if (err && typeof err.message === 'string' && err.message.toLowerCase().includes('network error')) {
        userFriendlyMessage = 'Network error while trying to load Google Maps API. Please check your internet connection.';
      } else {
        // Generic advice if API loading failed, which can be due to ApiNotActivatedMapError
         userFriendlyMessage = 'Failed to initialize Google Maps. Please ensure the API key is correct, billing is enabled, and the "Maps JavaScript API" is activated in your Google Cloud Console. Check browser console for more specific errors from Google.';
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
    console.error('Geocoding skipped: Google Maps API key is missing.');
    return null;
  }

  try {
    const google = await getGoogleMapsApi(); // Ensures API is loaded before trying to use it
    if (!google || !google.maps || !google.maps.Geocoder) {
        console.error('Google Maps Geocoder API is not available after load attempt.');
        return null;
    }
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
    // If the error from getGoogleMapsApi was already specific, re-throw it or a new one.
    if (error instanceof Error && error.message.includes("Google Maps JavaScript API is not activated")) {
        throw error; // Re-throw specific error
    }
    return null; // Or throw a new generic geocoding error
  }
}
