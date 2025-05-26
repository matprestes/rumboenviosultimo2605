
"use server";

import { supabase } from '@/lib/supabase/client';
import { EnvioSchema, type Envio, type Cliente, type Empresa, type TipoPaquete, type TipoServicio, type EnvioConDetalles, type DosRuedasEnvioFormValues } from '@/lib/schemas';
import { geocodeAddress } from '@/services/google-maps-service';
import { revalidatePath } from 'next/cache';

// Helper function to get user ID (placeholder for actual auth integration)
async function getUserId() {
  // In a real app, this would come from auth context e.g. const { data: { user } } = await supabase.auth.getUser(); return user?.id;
  // For now, let's assume no user or a default one for public forms if applicable
  // const { data: { user } } = await supabase.auth.getUser();
  // return user?.id || null;
  return null; // For DosRuedas, it might be a public form, so user_id could be null
}

export async function createEnvioAction(
    formData: Envio | DosRuedasEnvioFormValues // Can accept both full Envio or simplified form
): Promise<{ success: boolean; data?: Envio; error?: string }> {
    
    const currentUserId = await getUserId();
    let dataToInsert: Partial<Envio> = {};

    // Differentiate payload based on presence of remitente_cliente_id (DosRuedas form)
    if ('remitente_cliente_id' in formData && formData.remitente_cliente_id) {
        const dosRuedasData = formData as DosRuedasEnvioFormValues;
        
        // Fetch sender (remitente) details
        const { data: remitenteData, error: remitenteError } = await supabase
            .from('clientes')
            .select('nombre, apellido, telefono, direccion, latitud, longitud')
            .eq('id', dosRuedasData.remitente_cliente_id)
            .single();

        if (remitenteError || !remitenteData) {
            return { success: false, error: "Remitente no encontrado o error al obtener sus datos." };
        }

        dataToInsert = {
            remitente_cliente_id: dosRuedasData.remitente_cliente_id,
            // nombre_remitente: `${remitenteData.nombre} ${remitenteData.apellido}`, // No such field in DB currently
            // telefono_remitente: remitenteData.telefono, // No such field
            direccion_origen: remitenteData.direccion,
            latitud_origen: remitenteData.latitud,
            longitud_origen: remitenteData.longitud,

            nombre_destinatario: dosRuedasData.nombre_destinatario,
            telefono_destinatario: dosRuedasData.telefono_destinatario,
            direccion_destino: dosRuedasData.direccion_destino,
            // latitud_destino and longitud_destino will be geocoded below

            horario_retiro_desde: dosRuedasData.horario_retiro_desde,
            horario_entrega_hasta: dosRuedasData.horario_entrega_hasta,
            precio: dosRuedasData.precio,
            detalles_adicionales: dosRuedasData.detalles_adicionales,
            estado: 'pendiente_asignacion', // Default status
            user_id: currentUserId,
        };
        
        // Geocode destination address for DosRuedas form
        if (dataToInsert.direccion_destino && (!dataToInsert.latitud_destino || !dataToInsert.longitud_destino)) {
            const geocodedDestination = await geocodeAddress(dataToInsert.direccion_destino);
            if (geocodedDestination) {
                dataToInsert.latitud_destino = geocodedDestination.lat;
                dataToInsert.longitud_destino = geocodedDestination.lng;
                dataToInsert.direccion_destino = geocodedDestination.formattedAddress;
            } else {
                 console.warn(`Geocoding failed for destination address: ${dataToInsert.direccion_destino}`);
                // Return error if geocoding fails for critical address
                return { success: false, error: `No se pudo verificar la dirección de destino: ${dataToInsert.direccion_destino}. Asegúrese que sea de Mar del Plata.` };
            }
        }
        
        // Assign default tipo_paquete_id and tipo_servicio_id for DosRuedas form
        // Fetch first available tipo_paquete
        const { data: defaultPaquete, error: paqueteError } = await supabase.from('tipos_paquete').select('id').limit(1).single();
        if (paqueteError || !defaultPaquete) {
            return { success: false, error: "No se pudo encontrar un tipo de paquete por defecto." };
        }
        dataToInsert.tipo_paquete_id = defaultPaquete.id;

        // Fetch first available tipo_servicio
        const { data: defaultServicio, error: servicioError } = await supabase.from('tipos_servicio').select('id').limit(1).single();
        if (servicioError || !defaultServicio) {
            return { success: false, error: "No se pudo encontrar un tipo de servicio por defecto." };
        }
        dataToInsert.tipo_servicio_id = defaultServicio.id;


    } else { // Handle full Envio form (internal)
        const fullEnvioData = formData as Envio;
        const validatedFields = EnvioSchema.safeParse(fullEnvioData);
        if (!validatedFields.success) {
            return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
        }
        let internalData = validatedFields.data;

        if (internalData.direccion_origen && (!internalData.latitud_origen || !internalData.longitud_origen)) {
            const geocodedOrigin = await geocodeAddress(internalData.direccion_origen);
            if (geocodedOrigin) {
                internalData.latitud_origen = geocodedOrigin.lat;
                internalData.longitud_origen = geocodedOrigin.lng;
                internalData.direccion_origen = geocodedOrigin.formattedAddress;
            } else {
                console.warn(`Geocoding failed for origin address: ${internalData.direccion_origen}`);
                 return { success: false, error: `No se pudo verificar la dirección de origen: ${internalData.direccion_origen}. Asegúrese que sea de Mar del Plata.` };
            }
        }
        if (internalData.direccion_destino && (!internalData.latitud_destino || !internalData.longitud_destino)) {
            const geocodedDestination = await geocodeAddress(internalData.direccion_destino);
            if (geocodedDestination) {
                internalData.latitud_destino = geocodedDestination.lat;
                internalData.longitud_destino = geocodedDestination.lng;
                internalData.direccion_destino = geocodedDestination.formattedAddress;
            } else {
                console.warn(`Geocoding failed for destination address: ${internalData.direccion_destino}`);
                return { success: false, error: `No se pudo verificar la dirección de destino: ${internalData.direccion_destino}. Asegúrese que sea de Mar del Plata.` };
            }
        }
        dataToInsert = {
            ...internalData,
            user_id: currentUserId,
            fecha_estimada_entrega: internalData.fecha_estimada_entrega ? internalData.fecha_estimada_entrega.toISOString().split('T')[0] : null, // Format as YYYY-MM-DD for DATE type
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
  if ('remitente_cliente_id' in formData) revalidatePath('/dos-ruedas'); // Revalidate public form page
  return { success: true, data: newEnvio as Envio };
}

export async function updateEnvioAction(id: string, formData: Envio): Promise<{ success: boolean; data?: Envio; error?: string }> {
  const validatedFields = EnvioSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }
  let { data } = validatedFields;

   if (data.direccion_origen && (!data.latitud_origen || !data.longitud_origen || data.direccion_origen !== formData.direccion_origen)) {
    const geocodedOrigin = await geocodeAddress(data.direccion_origen);
    if (geocodedOrigin) {
      data.latitud_origen = geocodedOrigin.lat;
      data.longitud_origen = geocodedOrigin.lng;
      data.direccion_origen = geocodedOrigin.formattedAddress;
    }  else {
       return { success: false, error: `No se pudo verificar la dirección de origen: ${data.direccion_origen}. Asegúrese que sea de Mar del Plata.` };
    }
  }

  if (data.direccion_destino && (!data.latitud_destino || !data.longitud_destino || data.direccion_destino !== formData.direccion_destino)) {
    const geocodedDestination = await geocodeAddress(data.direccion_destino);
    if (geocodedDestination) {
      data.latitud_destino = geocodedDestination.lat;
      data.longitud_destino = geocodedDestination.lng;
      data.direccion_destino = geocodedDestination.formattedAddress;
    } else {
      return { success: false, error: `No se pudo verificar la dirección de destino: ${data.direccion_destino}. Asegúrese que sea de Mar del Plata.` };
    }
  }
  
  const dataToUpdate = {
    ...data,
    fecha_estimada_entrega: data.fecha_estimada_entrega ? data.fecha_estimada_entrega.toISOString().split('T')[0] : null,
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
  revalidatePath(`/envios/${id}/editar`);
  return { success: true, data: updatedEnvio as Envio };
}

export async function getEnvioByIdAction(id: string): Promise<{ envio?: EnvioConDetalles; error?: string }> {
  const { data, error } = await supabase
    .from('envios')
    .select(`
      *,
      clientes:remitente_cliente_id (*), 
      empresas_origen:empresa_origen_id (*),
      empresas_destino:empresa_destino_id (*),
      tipos_paquete (*),
      tipos_servicio (*),
      repartidores:repartidor_asignado_id (*)
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

  const envioData = { ...data } as any;
  if (envioData.fecha_estimada_entrega) {
    // Ensure it's treated as local date by adding time part before parsing
    // Supabase DATE type returns YYYY-MM-DD string.
    const dateStr = envioData.fecha_estimada_entrega;
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      envioData.fecha_estimada_entrega = new Date(dateStr + "T00:00:00");
    } else if (dateStr instanceof Date) {
       envioData.fecha_estimada_entrega = dateStr; // Already a Date object
    } else {
      envioData.fecha_estimada_entrega = null; // Invalid date string
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
    .select(`
      *,
      clientes:remitente_cliente_id (id, nombre, apellido),
      tipos_servicio (id, nombre),
      repartidores:repartidor_asignado_id (id, nombre)
    `, { count: 'exact' });

  if (filters.searchTerm) {
    query = query.or(`direccion_origen.ilike.%${filters.searchTerm}%,direccion_destino.ilike.%${filters.searchTerm}%,nombre_destinatario.ilike.%${filters.searchTerm}%`);
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
    .select('id, nombre, apellido, direccion, telefono, latitud, longitud') // Added more fields for DosRuedasForm
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

    
