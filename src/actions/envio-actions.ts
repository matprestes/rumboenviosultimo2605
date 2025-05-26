
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

        dataToInsert = {
            remitente_cliente_id: dosRuedasData.remitente_cliente_id,
            direccion_origen: remitenteData.direccion,
            latitud_origen: remitenteData.latitud,
            longitud_origen: remitenteData.longitud,
            nombre_destinatario: dosRuedasData.nombre_destinatario,
            telefono_destinatario: dosRuedasData.telefono_destinatario,
            direccion_destino: dosRuedasData.direccion_destino, // Client should provide geocoded version if possible
            // latitud_destino and longitud_destino should ideally come pre-geocoded from client for this form type
            // OR, if not, implement robust server-side geocoding here.
            // For now, we assume client-side form tries to geocode it first.
            // If not provided, it will be null.
            latitud_destino: null, // Placeholder, client should fill via its geocoding
            longitud_destino: null, // Placeholder
            horario_retiro_desde: dosRuedasData.horario_retiro_desde,
            horario_entrega_hasta: dosRuedasData.horario_entrega_hasta,
            precio: dosRuedasData.precio,
            detalles_adicionales: dosRuedasData.detalles_adicionales,
            estado: 'pendiente_asignacion',
            user_id: currentUserId,
        };
        
        // For DosRuedas, rely on client-side geocoding. If server-side geocoding for destination is needed here
        // (e.g. if client-side form couldn't do it), implement proper server-side call.
        // For now, we'll just use the address as is, assuming client-side did its best.
        // A proper server-side geocode would be needed here if client values are missing/untrusted.
        if (dosRuedasData.direccion_destino && (!dataToInsert.latitud_destino || !dataToInsert.longitud_destino)) {
            const geocodedDestination = await serverSideGeocodeAddress(dosRuedasData.direccion_destino);
            if (geocodedDestination) {
               dataToInsert.latitud_destino = geocodedDestination.lat;
               dataToInsert.longitud_destino = geocodedDestination.lng;
               dataToInsert.direccion_destino = geocodedDestination.formattedAddress; // Update with formatted address
            } else {
                console.warn("Server-side geocoding failed for destination in createEnvioAction (DosRuedas): " + dosRuedasData.direccion_destino);
                // Proceeding without coordinates for destination if server-side geocoding fails
            }
        }


        const { data: defaultPaquete, error: paqueteError } = await supabase.from('tipos_paquete').select('id').limit(1).single();
        if (paqueteError || !defaultPaquete) return { success: false, error: "No se pudo encontrar un tipo de paquete por defecto." };
        dataToInsert.tipo_paquete_id = defaultPaquete.id;

        const { data: defaultServicio, error: servicioError } = await supabase.from('tipos_servicio').select('id').limit(1).single();
        if (servicioError || !defaultServicio) return { success: false, error: "No se pudo encontrar un tipo de servicio por defecto." };
        dataToInsert.tipo_servicio_id = defaultServicio.id;

    } else { // Handle full Envio form (internal)
        const fullEnvioData = formData as Envio;
        const validatedFields = EnvioSchema.safeParse(fullEnvioData);
        if (!validatedFields.success) {
            return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
        }
        let internalData = validatedFields.data;

        // For internal form, client-side form is responsible for geocoding and passing lat/lng.
        // Server actions should not rely on client-side JS API loader.
        if (!internalData.latitud_origen || !internalData.longitud_origen) {
            console.warn("Envío creado sin coordenadas de origen para: " + internalData.direccion_origen + ". Asegúrese que el cliente geocodifique.");
        }
        if (!internalData.latitud_destino || !internalData.longitud_destino) {
           console.warn("Envío creado sin coordenadas de destino para: " + internalData.direccion_destino + ". Asegúrese que el cliente geocodifique.");
        }

        dataToInsert = {
            ...internalData,
            user_id: currentUserId,
            fecha_estimada_entrega: internalData.fecha_estimada_entrega ? new Date(internalData.fecha_estimada_entrega).toISOString().split('T')[0] : null,
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
  const validatedFields = EnvioSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }
  let { data } = validatedFields;

  // Client-side form is responsible for geocoding if addresses change.
  if ((formData.direccion_origen !== data.direccion_origen || !data.latitud_origen || !data.longitud_origen) && data.direccion_origen) {
    console.warn("Actualizando envío " + id + ". Dirección de origen cambiada o sin coordenadas: " + data.direccion_origen + ". Asegúrese que el cliente geocodifique.");
  }

  if ((formData.direccion_destino !== data.direccion_destino || !data.latitud_destino || !data.longitud_destino) && data.direccion_destino) {
    console.warn("Actualizando envío " + id + ". Dirección de destino cambiada o sin coordenadas: " + data.direccion_destino + ". Asegúrese que el cliente geocodifique.");
  }
  
  const dataToUpdate = {
    ...data,
    fecha_estimada_entrega: data.fecha_estimada_entrega ? new Date(data.fecha_estimada_entrega).toISOString().split('T')[0] : null,
    updated_at: new Date().toISOString(),
  };

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
  revalidatePath("/envios/" + id + "/editar");
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
  if (envioData.fecha_estimada_entrega) {
    const dateStr = envioData.fecha_estimada_entrega;
    if (typeof dateStr === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(dateStr)) {
      envioData.fecha_estimada_entrega = new Date(dateStr + "T00:00:00");
    } else if (dateStr instanceof Date) {
       envioData.fecha_estimada_entrega = dateStr;
    } else {
      envioData.fecha_estimada_entrega = null;
    }
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
    query = query.or("direccion_origen.ilike.%" + filters.searchTerm + "%,direccion_destino.ilike.%" + filters.searchTerm + "%,nombre_destinatario.ilike.%" + filters.searchTerm + "%");
  }
  if (filters.estado) {
    query = query.eq('estado', filters.estado);
  }
  if (filters.fechaDesde) {
    query = query.gte('created_at', filters.fechaDesde); 
  }
  if (filters.fechaHasta) {
    query = query.lte('created_at', filters.fechaHasta);
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
  const { error } = await supabase.from('envios').delete().eq('id', id);
  if (error) {
    console.error('Error deleting envio:', error);
    return { success: false, error: error.message };
  }
  revalidatePath('/envios');
  revalidatePath('/dos-ruedas');
  return { success: true };
}

