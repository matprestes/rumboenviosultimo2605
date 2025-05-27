
"use server";

import { supabase } from '@/lib/supabase/client';
import { EnvioSchema, type Envio, type Cliente, type Empresa, type TipoPaquete, type TipoServicio, type EnvioConDetalles, type DosRuedasEnvioFormValues } from '@/lib/schemas';
// import { geocodeAddress } from '@/services/google-maps-service'; // REMOVED: Server Actions cannot use client-side geocoding
import { revalidatePath } from 'next/cache';

// Helper function to get user ID (placeholder for actual auth integration)
async function getUserId() {
  // In a real app, this would come from auth context e.g. const { data: { user } } = await supabase.auth.getUser(); return user?.id;
  // For now, let's assume no user or a default one for public forms if applicable
  // const { data: { user } } = await supabase.auth.getUser();
  // return user?.id || null;
  return null; // For DosRuedas, it might be a public form, so user_id could be null
}

// Helper function for server-side geocoding (requires a non-public API key and direct HTTP request)
// This is a placeholder and would need actual implementation if server-side geocoding is critical.
async function serverSideGeocodeAddress(address: string): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  console.warn("Server-side geocoding for \"" + address + "\" is NOT IMPLEMENTED. Relying on client-side geocoding.");
  // In a real app, you would use fetch() to call Google Geocoding API Web Service
  // with a server-only API key.
  // Example:
  // const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  // const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=AR&components=country:AR`);
  // const data = await response.json();
  // if (data.status === 'OK' && data.results.length > 0) { ... parse results ... }
  return null;
}

export async function createEnvioAction(
    formData: Envio | DosRuedasEnvioFormValues
): Promise<{ success: boolean; data?: Envio; error?: string }> {

    const currentUserId = await getUserId();
    let dataToInsert: Partial<Envio> = {};

    if ('remitente_cliente_id' in formData && formData.remitente_cliente_id) {
        // This is from DosRuedasEnvioForm
        const dosRuedasData = formData as DosRuedasEnvioFormValues;

        const { data: remitenteData, error: remitenteError } = await supabase
            .from('clientes')
            .select('nombre, apellido, telefono, direccion, latitud, longitud')
            .eq('id', dosRuedasData.remitente_cliente_id)
            .single();

        if (remitenteError || !remitenteData) {
            return { success: false, error: "Remitente no encontrado o error al obtener sus datos." };
        }
        if (!remitenteData.latitud || !remitenteData.longitud) {
            return { success: false, error: "El remitente \"" + remitenteData.nombre + " " + remitenteData.apellido + "\" no tiene coordenadas geocodificadas. Actualice los datos del cliente." };
        }

        if (!dosRuedasData.tipo_servicio_id) {
            return { success: false, error: "Debe seleccionar un tipo de servicio." };
        }

        dataToInsert = {
            remitente_cliente_id: dosRuedasData.remitente_cliente_id,
            direccion_origen: remitenteData.direccion,
            latitud_origen: remitenteData.latitud,
            longitud_origen: remitenteData.longitud,
            nombre_destinatario: dosRuedasData.nombre_destinatario,
            telefono_destinatario: dosRuedasData.telefono_destinatario,
            direccion_destino: dosRuedasData.direccion_destino,
            latitud_destino: dosRuedasData.latitud_destino ?? null, // Use from form if available
            longitud_destino: dosRuedasData.longitud_destino ?? null, // Use from form if available
            tipo_servicio_id: dosRuedasData.tipo_servicio_id,
            horario_retiro_desde: dosRuedasData.horario_retiro_desde || null,
            horario_entrega_hasta: dosRuedasData.horario_entrega_hasta || null,
            precio: dosRuedasData.precio,
            detalles_adicionales: dosRuedasData.detalles_adicionales || null,
            estado: 'pendiente_asignacion',
            user_id: currentUserId,
            // Fields not present in DosRuedas form will be null or default by DB
            cliente_temporal_nombre: null,
            cliente_temporal_telefono: null,
            empresa_origen_id: null,
            notas_origen: null,
            empresa_destino_id: null,
            notas_destino: null,
            peso_kg: null,
            fecha_estimada_entrega: null,
            repartidor_asignado_id: null,
            notas_conductor: null,
        };

        // Fallback to server-side geocoding only if client-side coordinates are explicitly missing AND address is present
        if (dosRuedasData.direccion_destino && (dataToInsert.latitud_destino === null || dataToInsert.longitud_destino === null)) {
            console.warn("Client-side destination coordinates missing for DosRuedas, attempting server-side geocoding for: " + dosRuedasData.direccion_destino);
            const geocodedDestination = await serverSideGeocodeAddress(dosRuedasData.direccion_destino);
            if (geocodedDestination) {
               dataToInsert.latitud_destino = geocodedDestination.lat;
               dataToInsert.longitud_destino = geocodedDestination.lng;
            } else {
                console.warn("Server-side geocoding fallback failed for destination in createEnvioAction (DosRuedas): " + dosRuedasData.direccion_destino);
                // Optionally, you could return an error here if geocoding is strictly required
                // return { success: false, error: "No se pudieron obtener las coordenadas para la dirección de destino." };
            }
        }

        // Assign a default tipo_paquete_id if not provided by form (DosRuedas form doesn't have it)
        const { data: defaultPaquete, error: paqueteError } = await supabase.from('tipos_paquete').select('id').order('created_at').limit(1).single();
        if (paqueteError || !defaultPaquete) {
             dataToInsert.tipo_paquete_id = null;
             console.warn("No se pudo encontrar un tipo de paquete por defecto para envío DosRuedas. Asignando NULL.");
        } else {
            dataToInsert.tipo_paquete_id = defaultPaquete.id;
        }

    } else { // Handle full Envio form (internal)
        const fullEnvioData = formData as Envio;
        // Ensure all optional fields that might be empty strings are converted to null if schema expects nullable
        const dataForValidation = {
            ...fullEnvioData,
            remitente_cliente_id: fullEnvioData.remitente_cliente_id || null,
            cliente_temporal_nombre: fullEnvioData.cliente_temporal_nombre || null,
            cliente_temporal_telefono: fullEnvioData.cliente_temporal_telefono || null,
            empresa_origen_id: fullEnvioData.empresa_origen_id || null,
            notas_origen: fullEnvioData.notas_origen || null,
            empresa_destino_id: fullEnvioData.empresa_destino_id || null,
            notas_destino: fullEnvioData.notas_destino || null,
            tipo_paquete_id: fullEnvioData.tipo_paquete_id || null,
            peso_kg: fullEnvioData.peso_kg === 0 || fullEnvioData.peso_kg === undefined ? null : fullEnvioData.peso_kg,
            tipo_servicio_id: fullEnvioData.tipo_servicio_id || null,
            fecha_estimada_entrega: fullEnvioData.fecha_estimada_entrega ? new Date(fullEnvioData.fecha_estimada_entrega).toISOString().split('T')[0] : null,
            horario_retiro_desde: fullEnvioData.horario_retiro_desde || null,
            horario_entrega_hasta: fullEnvioData.horario_entrega_hasta || null,
            repartidor_asignado_id: fullEnvioData.repartidor_asignado_id || null,
            notas_conductor: fullEnvioData.notas_conductor || null,
            detalles_adicionales: fullEnvioData.detalles_adicionales || null,
        };

        const validatedFields = EnvioSchema.safeParse(dataForValidation);
        if (!validatedFields.success) {
            console.error("Validation Errors (createEnvioAction - Full Form):", validatedFields.error.flatten());
            return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
        }
        let internalData = validatedFields.data;

        if (!internalData.latitud_origen || !internalData.longitud_origen) {
            console.warn("Envío creado sin coordenadas de origen para: " + internalData.direccion_origen + ". Asegúrese que el cliente geocodifique.");
            // Optionally, attempt server-side geocoding here too if address_origen is present
        }
        if (!internalData.latitud_destino || !internalData.longitud_destino) {
           console.warn("Envío creado sin coordenadas de destino para: " + internalData.direccion_destino + ". Asegúrese que el cliente geocodifique.");
           // Optionally, attempt server-side geocoding here too if address_destino is present
        }

        dataToInsert = {
            ...internalData,
            user_id: currentUserId,
        };
    }

  const { data: newEnvio, error } = await supabase
    .from('envios')
    .insert(dataToInsert)
    .select()
    .single();

  if (error) {
    console.error("Error creating envio:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/envios');
  if ('remitente_cliente_id' in formData) revalidatePath('/dos-ruedas');
  return { success: true, data: newEnvio as Envio };
}

export async function updateEnvioAction(id: string, formData: Envio): Promise<{ success: boolean; data?: Envio; error?: string }> {
   const dataForValidation = {
    ...formData,
    remitente_cliente_id: formData.remitente_cliente_id || null,
    cliente_temporal_nombre: formData.cliente_temporal_nombre || null,
    cliente_temporal_telefono: formData.cliente_temporal_telefono || null,
    empresa_origen_id: formData.empresa_origen_id || null,
    notas_origen: formData.notas_origen || null,
    empresa_destino_id: formData.empresa_destino_id || null,
    notas_destino: formData.notas_destino || null,
    tipo_paquete_id: formData.tipo_paquete_id || null,
    peso_kg: formData.peso_kg === 0 || formData.peso_kg === undefined ? null : formData.peso_kg,
    tipo_servicio_id: formData.tipo_servicio_id || null,
    fecha_estimada_entrega: formData.fecha_estimada_entrega ? new Date(formData.fecha_estimada_entrega).toISOString().split('T')[0] : null,
    horario_retiro_desde: formData.horario_retiro_desde || null,
    horario_entrega_hasta: formData.horario_entrega_hasta || null,
    repartidor_asignado_id: formData.repartidor_asignado_id || null,
    notas_conductor: formData.notas_conductor || null,
    detalles_adicionales: formData.detalles_adicionales || null,
  };
  const validatedFields = EnvioSchema.safeParse(dataForValidation);
  if (!validatedFields.success) {
    console.error("Validation Errors (updateEnvioAction):", validatedFields.error.flatten());
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }
  let { data } = validatedFields;

  // If address changed and no new coords provided, warn (client should have geocoded)
  // For simplicity, we are currently not re-geocoding on server for updates if coords are missing and address changed.
  // This logic could be added similar to createEnvioAction if needed.

  const dataToUpdate = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  // Remove fields that should not be in the update payload or are handled by DB
  const { id: envioId, created_at, user_id, ...updatePayload } = dataToUpdate;


  const { data: updatedEnvio, error } = await supabase
    .from('envios')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating envio:", error);
    return { success: false, error: error.message };
  }
  revalidatePath('/envios');
  revalidatePath(`/envios/${id}/editar`);
  return { success: true, data: updatedEnvio as Envio };
}

export async function getEnvioByIdAction(id: string): Promise<{ envio?: EnvioConDetalles; error?: string }> {
  const { data, error } = await supabase
    .from('envios')
    .select(
      "*, clientes:remitente_cliente_id (*), empresas_origen:empresa_origen_id (*), empresas_destino:empresa_destino_id (*), tipos_paquete (*), tipos_servicio (*), repartidores:repartidor_asignado_id (*)"
    )
    .eq('id', id)
    .single();

  if (error) {
    console.error("Error fetching envio by ID:", error);
    return { error: error.message };
  }
  if (!data) {
    return { error: "Envío no encontrado." };
  }

  const envioData = { ...data } as any;
  // Convert DATE string from Supabase to Date object for form compatibility
  if (envioData.fecha_estimada_entrega && typeof envioData.fecha_estimada_entrega === 'string') {
    const dateStr = envioData.fecha_estimada_entrega;
    // Supabase DATE columns return as 'YYYY-MM-DD'. We need to parse it carefully.
    // Appending 'T00:00:00Z' makes it parse as UTC midnight, which is often desired for date-only fields
    // to avoid timezone shifts when converting back and forth.
    const parsedDate = new Date(dateStr + "T00:00:00Z");
    if (!isNaN(parsedDate.getTime())) { // Check if parsedDate is valid
      envioData.fecha_estimada_entrega = parsedDate;
    } else {
      console.warn("Invalid date string for fecha_estimada_entrega:", dateStr);
      envioData.fecha_estimada_entrega = null; // Or undefined, depending on how your form handles it
    }
  } else if (envioData.fecha_estimada_entrega instanceof Date && isNaN(envioData.fecha_estimada_entrega.getTime())) {
      console.warn("Invalid Date object received for fecha_estimada_entrega:", envioData.fecha_estimada_entrega);
      envioData.fecha_estimada_entrega = null;
  }


  return { envio: envioData as EnvioConDetalles };
}

export async function getEnviosAction(
  filters: { searchTerm?: string; estado?: string; fechaDesde?: string; fechaHasta?: string },
  page: number = 1,
  pageSize: number = 10
): Promise<{ envios: EnvioConDetalles[]; count: number; error?: string }> {

  let query = supabase
    .from('envios')
    .select(
      "*, clientes:remitente_cliente_id (id, nombre, apellido), tipos_servicio (id, nombre), repartidores:repartidor_asignado_id (id, nombre)",
      { count: 'exact' }
    );

  if (filters.searchTerm) {
    query = query.or(`direccion_origen.ilike.%${filters.searchTerm}%,direccion_destino.ilike.%${filters.searchTerm}%,nombre_destinatario.ilike.%${filters.searchTerm}%,cliente_temporal_nombre.ilike.%${filters.searchTerm}%`);
  }
  if (filters.estado) {
    query = query.eq('estado', filters.estado);
  }
  if (filters.fechaDesde) {
    query = query.gte('created_at', filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    // Add one day to fechaHasta to include the entire day
    const dateHasta = new Date(filters.fechaHasta);
    dateHasta.setDate(dateHasta.getDate() + 1);
    query = query.lt('created_at', dateHasta.toISOString().split('T')[0]);
  }

  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching envios:", error);
    return { envios: [], count: 0, error: error.message };
  }
  return { envios: data as EnvioConDetalles[], count: count || 0 };
}


// --- Helper actions for form dropdowns ---
export async function getClientesForSelect(): Promise<Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'telefono' | 'latitud' | 'longitud'>[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, apellido, direccion, telefono, latitud, longitud')
    .eq('estado', 'activo')
    .order('apellido')
    .order('nombre');
  if (error) {
    console.error("Error fetching clientes for select:", error);
    return [];
  }
  return data || [];
}

export async function getEmpresasForSelect(): Promise<Pick<Empresa, 'id' | 'nombre'>[]> {
  const { data, error } = await supabase
    .from('empresas')
    .select('id, nombre')
    .eq('estado', 'activo')
    .order('nombre');
  if (error) {
    console.error("Error fetching empresas for select:", error);
    return [];
  }
  return data || [];
}

export async function getTiposPaqueteForSelect(): Promise<TipoPaquete[]> {
    const { data, error } = await supabase.from('tipos_paquete').select('*').order('nombre');
    if (error) {
        console.error('Error fetching tipos_paquete', error);
        return [];
    }
    return data || [];
}

export async function getTiposServicioForSelect(): Promise<TipoServicio[]> {
    const { data, error } = await supabase.from('tipos_servicio').select('*').order('nombre');
    if (error) {
        console.error('Error fetching tipos_servicio', error);
        return [];
    }
    return data || [];
}

export async function deleteEnvioAction(id: string): Promise<{ success: boolean; error?: string }> {
  // Check if the envio is part of any active or planned reparto
  const { data: paradas, error: paradasError } = await supabase
    .from('paradas_reparto')
    .select('reparto_id, repartos(estado)')
    .eq('envio_id', id)
    .in('repartos.estado', ['planificado', 'en_curso']);

  if (paradasError) {
    console.error('Error checking for associated paradas:', paradasError);
    return { success: false, error: `Error al verificar paradas asociadas: ${paradasError.message}` };
  }

  if (paradas && paradas.length > 0) {
    return { success: false, error: "No se puede eliminar: este envío forma parte de un reparto activo o planificado." };
  }
  
  const { error } = await supabase.from('envios').delete().eq('id', id);
  if (error) {
    console.error('Error deleting envio:', error);
    return { success: false, error: error.message };
  }
  revalidatePath('/envios');
  revalidatePath('/dos-ruedas'); // If it might be listed there
  revalidatePath('/repartos'); // If it might affect reparto lists
  return { success: true };
}
