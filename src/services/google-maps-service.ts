
'use server'; // Can be used client-side due to NEXT_PUBLIC, but good practice for potential future server use

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
    'Google Maps API key is missing. Geocoding will not work. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file.'
  );
}

const loaderOptions: LoaderOptions = {
  apiKey: API_KEY || '',
  version: 'weekly',
  libraries: ['geocoding', 'places'], // 'places' might be useful for autocomplete later
};

const loader = new Loader(loaderOptions);
let googleMapsApiPromise: Promise<typeof google> | null = null;

function getGoogleMapsApi(): Promise<typeof google> {
  if (!API_KEY) {
    return Promise.reject(new Error('Google Maps API key is not configured.'));
  }
  if (!googleMapsApiPromise) {
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
        country: 'AR', // Argentina
        // postalCode: 'B7600', // Example postal code prefix for Mar del Plata
        // administrativeArea: 'Buenos Aires Province',
        locality: 'Mar del Plata', // Bias results towards Mar del Plata
      },
      // bounds: new google.maps.LatLngBounds( // Bias results to MDP bounds
      //   new google.maps.LatLng(MAR_DEL_PLATA_BOUNDS.south, MAR_DEL_PLATA_BOUNDS.west),
      //   new google.maps.LatLng(MAR_DEL_PLATA_BOUNDS.north, MAR_DEL_PLATA_BOUNDS.east)
      // ),
    };
    
    const response = await geocoder.geocode(request);

    if (response.results && response.results.length > 0) {
      const result = response.results[0];
      const location = result.geometry.location;
      const lat = location.lat();
      const lng = location.lng();

      // Check if the result is within Mar del Plata (approximate check)
      // A more robust check would be to inspect address_components for locality or administrative_area_level_2
      let isInMarDelPlata = false;
      let cityComponent = '';
      let countryComponent = '';

      result.address_components.forEach(component => {
        if (component.types.includes('locality')) {
          cityComponent = component.long_name;
          if (component.long_name.toLowerCase().includes('mar del plata')) {
            isInMarDelPlata = true;
          }
        }
        if (component.types.includes('country')) {
          countryComponent = component.long_name;
        }
      });
      
      // Fallback to bounding box if locality check isn't conclusive or for broader matching
      if (!isInMarDelPlata) {
        if (
          lat >= MAR_DEL_PLATA_BOUNDS.south &&
          lat <= MAR_DEL_PLATA_BOUNDS.north &&
          lng >= MAR_DEL_PLATA_BOUNDS.west &&
          lng <= MAR_DEL_PLATA_BOUNDS.east
        ) {
          // If locality wasn't MDP but it's in bounds, we might still accept it,
          // or flag for review. For now, let's be a bit lenient if locality is missing.
          if (!cityComponent.toLowerCase().includes('mar del plata')) {
             // console.warn("Address geocoded within MDP bounds, but locality is not Mar del Plata:", result.formatted_address);
             // We might still allow this, or make the check stricter based on requirements
          }
          isInMarDelPlata = true; // If within bounds, consider it potentially valid
        }
      }


      if (isInMarDelPlata) {
        return {
          lat,
          lng,
          formattedAddress: result.formatted_address,
          city: cityComponent || undefined,
          country: countryComponent || undefined,
        };
      } else {
        console.warn('Address geocoded outside Mar del Plata:', result.formatted_address, {lat,lng});
        return null; // Address is outside Mar del Plata
      }
    } else {
      console.warn('No results found for address:', address);
      return null; // No results found
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}
