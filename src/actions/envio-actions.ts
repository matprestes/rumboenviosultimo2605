
"use server";

import { supabase } from '@/lib/supabase/client';
import { EnvioSchema, type Envio, type Cliente, type Empresa, type TipoPaquete, type TipoServicio, type EnvioConDetalles } from '@/lib/schemas';
import { geocodeAddress } from '@/services/google-maps-service';
import { revalidatePath } from 'next/cache';

// Helper function to get user ID (placeholder for actual auth integration)
async function getUserId() {
  // In a real app, this would come from auth context e.g. const { data: { user } } = await supabase.auth.getUser(); return user?.id;
  return null; // Or a default/test user ID if auth isn't fully set up
}

export async function createEnvioAction(formData: Envio): Promise<{ success: boolean; data?: Envio; error?: string }> {
  const validatedFields = EnvioSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }
  let { data } = validatedFields;
  const currentUserId = await getUserId();

  // Geocode origin address if lat/lng not provided
  if (data.direccion_origen && (!data.latitud_origen || !data.longitud_origen)) {
    const geocodedOrigin = await geocodeAddress(data.direccion_origen);
    if (geocodedOrigin) {
      data.latitud_origen = geocodedOrigin.lat;
      data.longitud_origen = geocodedOrigin.lng;
      data.direccion_origen = geocodedOrigin.formattedAddress; // Use Google's formatted address
    } else {
      // Optionally, handle geocoding failure more gracefully or return an error
      console.warn(`Geocoding failed for origin address: ${data.direccion_origen}`);
    }
  }

  // Geocode destination address if lat/lng not provided
  if (data.direccion_destino && (!data.latitud_destino || !data.longitud_destino)) {
    const geocodedDestination = await geocodeAddress(data.direccion_destino);
    if (geocodedDestination) {
      data.latitud_destino = geocodedDestination.lat;
      data.longitud_destino = geocodedDestination.lng;
      data.direccion_destino = geocodedDestination.formattedAddress; // Use Google's formatted address
    } else {
      console.warn(`Geocoding failed for destination address: ${data.direccion_destino}`);
    }
  }
  
  const dataToInsert = {
    ...data,
    user_id: currentUserId,
    fecha_estimada_entrega: data.fecha_estimada_entrega ? data.fecha_estimada_entrega.toISOString() : null,
  };

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
  return { success: true, data: newEnvio as Envio };
}

export async function updateEnvioAction(id: string, formData: Envio): Promise<{ success: boolean; data?: Envio; error?: string }> {
  const validatedFields = EnvioSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }
  let { data } = validatedFields;

  // Geocode origin address if changed and lat/lng not directly updated
   if (data.direccion_origen && (!data.latitud_origen || !data.longitud_origen || data.direccion_origen !== formData.direccion_origen)) {
    const geocodedOrigin = await geocodeAddress(data.direccion_origen);
    if (geocodedOrigin) {
      data.latitud_origen = geocodedOrigin.lat;
      data.longitud_origen = geocodedOrigin.lng;
      data.direccion_origen = geocodedOrigin.formattedAddress;
    }
  }

  // Geocode destination address if changed and lat/lng not directly updated
  if (data.direccion_destino && (!data.latitud_destino || !data.longitud_destino || data.direccion_destino !== formData.direccion_destino)) {
    const geocodedDestination = await geocodeAddress(data.direccion_destino);
    if (geocodedDestination) {
      data.latitud_destino = geocodedDestination.lat;
      data.longitud_destino = geocodedDestination.lng;
      data.direccion_destino = geocodedDestination.formattedAddress;
    }
  }
  
  const dataToUpdate = {
    ...data,
    fecha_estimada_entrega: data.fecha_estimada_entrega ? data.fecha_estimada_entrega.toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  // Remove id and created_at from data to prevent trying to update them
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
    .select(`
      *,
      clientes (*),
      empresas_origen:empresa_origen_id (*),
      empresas_destino:empresa_destino_id (*),
      tipos_paquete (*),
      tipos_servicio (*),
      repartidores (*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error("Error fetching envio by ID:", error);
    return { error: error.message };
  }
  if (!data) {
    return { error: "Envío no encontrado." };
  }
  // Convert date strings to Date objects for the form
  const envioData = { ...data } as any;
  if (envioData.fecha_estimada_entrega) {
    envioData.fecha_estimada_entrega = new Date(envioData.fecha_estimada_entrega);
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
    .select(`
      *,
      clientes (id, nombre, apellido),
      tipos_servicio (id, nombre),
      repartidores (id, nombre)
    `, { count: 'exact' });

  if (filters.searchTerm) {
    // This is a basic search, a more advanced FTS or multiple ilike would be better
    query = query.or(`direccion_origen.ilike.%${filters.searchTerm}%,direccion_destino.ilike.%${filters.searchTerm}%,cliente_temporal_nombre.ilike.%${filters.searchTerm}%`);
    // Searching on joined client name would require a more complex query or view
  }
  if (filters.estado) {
    query = query.eq('estado', filters.estado);
  }
  if (filters.fechaDesde) {
    query = query.gte('created_at', filters.fechaDesde); // Assuming filtering by creation date
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
export async function getClientesForSelect(): Promise<Pick<Cliente, 'id' | 'nombre' | 'apellido'>[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, apellido')
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
  return { success: true };
}

    