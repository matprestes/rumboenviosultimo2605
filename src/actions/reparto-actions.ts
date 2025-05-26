
"use server";

import { supabase } from '@/lib/supabase/client';
import type { Reparto, ParadaReparto, RepartoConDetalles, EnvioConDetalles, Repartidor, Empresa, RepartoFormValues, RepartoLoteFormValues } from '@/lib/schemas';
import { RepartoSchema, RepartoLoteFormSchema } from '@/lib/schemas'; // Added RepartoLoteFormSchema
import { revalidatePath } from 'next/cache';
import { getTiposPaqueteForSelect } from './envio-actions'; // Assuming this is a shared helper

// Helper function to get user ID (placeholder for actual auth integration)
async function getUserId() {
  // const { data: { user } } = await supabase.auth.getUser();
  // return user?.id || null; 
  return null; // Placeholder
}

export async function getRepartidoresForSelectAction(): Promise<Pick<Repartidor, 'id' | 'nombre'>[]> {
  const { data, error } = await supabase
    .from('repartidores')
    .select('id, nombre')
    .eq('estado', 'activo')
    .order('nombre');
  if (error) {
    console.error("Error fetching repartidores for select:", error);
    return [];
  }
  return data || [];
}

export async function getEmpresasForSelectAction(): Promise<Pick<Empresa, 'id' | 'nombre' | 'direccion' | 'latitud' | 'longitud'>[]> {
    const { data, error } = await supabase
      .from('empresas')
      .select('id, nombre, direccion, latitud, longitud') // Added address and coords for lote
      .eq('estado', 'activo')
      .order('nombre');
    if (error) {
      console.error("Error fetching empresas for select:", error);
      return [];
    }
    return data || [];
}

export async function getClientesByEmpresaIdAction(empresaId: string): Promise<Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'telefono' | 'latitud' | 'longitud'>[]> {
  if (!empresaId) return [];
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, apellido, direccion, telefono, latitud, longitud')
    .eq('empresa_id', empresaId)
    .eq('estado', 'activo')
    .order('apellido')
    .order('nombre');
  if (error) {
    console.error("Error fetching clientes by empresa ID:", error);
    return [];
  }
  return data || [];
}


export async function getEnviosPendientesAction(empresaId?: string | null): Promise<EnvioConDetalles[]> {
  let query = supabase
    .from('envios')
    .select(`
      id,
      direccion_origen,
      direccion_destino,
      estado,
      remitente_cliente_id,
      empresa_origen_id,
      clientes:remitente_cliente_id (id, nombre, apellido, empresa_id),
      empresas_origen:empresa_origen_id (id, nombre)
    `)
    .eq('estado', 'pendiente_asignacion') 
    .order('created_at', { ascending: true });

  const { data: paradasEnRepartosActivos, error: paradasError } = await supabase
    .from('paradas_reparto')
    .select('envio_id, reparto_id, repartos(estado)')
    .filter('repartos.estado', 'in', '("planificado","en_curso")');
  
  if (paradasError) {
    console.error("Error fetching paradas activas:", paradasError);
    return [];
  }

  const enviosEnRepartoIds = paradasEnRepartosActivos?.map(p => p.envio_id).filter(id => id !== null) || [];
  if (enviosEnRepartoIds.length > 0) {
    query = query.not('id', 'in', `(${enviosEnRepartoIds.join(',')})`);
  }
  
  if (empresaId) {
    const { data: clientesDeEmpresa, error: clientesError } = await supabase
      .from('clientes')
      .select('id')
      .eq('empresa_id', empresaId);

    if (clientesError) console.error("Error fetching clientes for empresa:", clientesError);
    
    const clienteIdsDeEmpresa = clientesDeEmpresa?.map(c => c.id) || [];

    if (clienteIdsDeEmpresa.length > 0) {
      query = query.or(`empresa_origen_id.eq.${empresaId},remitente_cliente_id.in.(${clienteIdsDeEmpresa.join(',')})`);
    } else {
      query = query.eq('empresa_origen_id', empresaId);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching envios pendientes:", error);
    return [];
  }
  return data as EnvioConDetalles[] || [];
}


export async function createRepartoAction(
  formData: RepartoFormValues
): Promise<{ success: boolean; data?: Reparto; error?: string }> {
  const validatedFields = RepartoSchema.omit({ id: true, created_at: true, updated_at: true, user_id: true }).safeParse(formData);

  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }

  const currentUserId = await getUserId();
  const { envio_ids, ...repartoData } = validatedFields.data;

  const { data: newReparto, error: repartoError } = await supabase
    .from('repartos')
    .insert({
      ...repartoData,
      fecha_reparto: new Date(repartoData.fecha_reparto).toISOString().split('T')[0], 
      estado: 'planificado', 
      user_id: currentUserId,
    })
    .select()
    .single();

  if (repartoError || !newReparto) {
    console.error("Error creating reparto:", repartoError);
    return { success: false, error: repartoError?.message || "No se pudo crear el reparto." };
  }

  const paradasToInsert: Omit<ParadaReparto, 'id' | 'created_at' | 'updated_at' | 'user_id'>[] = envio_ids.map((envioId, index) => ({
    reparto_id: newReparto.id,
    envio_id: envioId,
    orden_visita: index + 1, 
    estado_parada: 'asignado',
  }));

  const { error: paradasError } = await supabase.from('paradas_reparto').insert(paradasToInsert);

  if (paradasError) {
    console.error("Error creating paradas:", paradasError);
    await supabase.from('repartos').delete().eq('id', newReparto.id); 
    return { success: false, error: "Error al crear las paradas del reparto: " + paradasError.message };
  }

  const { error: enviosUpdateError } = await supabase
    .from('envios')
    .update({ estado: 'asignado', repartidor_asignado_id: newReparto.repartidor_id })
    .in('id', envio_ids);

  if (enviosUpdateError) {
    console.error("Error updating envios:", enviosUpdateError);
    return { success: false, error: "Reparto y paradas creadas, pero error al actualizar envíos: " + enviosUpdateError.message };
  }

  revalidatePath('/repartos');
  revalidatePath('/envios'); 
  return { success: true, data: newReparto as Reparto };
}


export async function createRepartoLoteAction(
  formData: RepartoLoteFormValues
): Promise<{ success: boolean; data?: Reparto; error?: string; errors?: any }> {
  const validatedFields = RepartoLoteFormSchema.safeParse(formData);
  if (!validatedFields.success) {
    console.error("Validation errors (Lote):", validatedFields.error.flatten());
    return { success: false, error: "Datos del formulario inválidos.", errors: validatedFields.error.flatten() };
  }

  const currentUserId = await getUserId();
  const { empresa_id, fecha_reparto, repartidor_id, notas_reparto, asignaciones_clientes } = validatedFields.data;

  // 1. Fetch Empresa Details
  const { data: empresaData, error: empresaError } = await supabase
    .from('empresas')
    .select('id, nombre, direccion, latitud, longitud')
    .eq('id', empresa_id)
    .single();

  if (empresaError || !empresaData) {
    return { success: false, error: "Empresa no encontrada o error al obtener sus datos." };
  }
  if (!empresaData.direccion || empresaData.latitud == null || empresaData.longitud == null) {
    return { success: false, error: `La empresa "${empresaData.nombre}" no tiene una dirección o coordenadas geocodificadas. Por favor, actualice los datos de la empresa.` };
  }

  // 2. Fetch Default Tipo Paquete
  const tiposPaquete = await getTiposPaqueteForSelect(); // Reuse existing action
  if (tiposPaquete.length === 0) {
    return { success: false, error: "No se encontraron tipos de paquete. Configure al menos uno." };
  }
  const defaultTipoPaqueteId = tiposPaquete[0].id;

  // 3. Create Envios for each client
  const createdEnvios: Partial<Envio>[] = [];
  for (const asignacion of asignaciones_clientes) {
    const { data: clienteData, error: clienteError } = await supabase
      .from('clientes')
      .select('id, nombre, apellido, direccion, telefono, latitud, longitud')
      .eq('id', asignacion.cliente_id)
      .single();

    if (clienteError || !clienteData) {
      return { success: false, error: `Cliente con ID ${asignacion.cliente_id} no encontrado.` };
    }
    if (!clienteData.direccion || clienteData.latitud == null || clienteData.longitud == null) {
       return { success: false, error: `El cliente "${clienteData.nombre} ${clienteData.apellido}" no tiene dirección/coordenadas. Actualice sus datos.` };
    }

    const newEnvioData: Omit<Envio, 'id' | 'created_at' | 'updated_at'> = {
      remitente_cliente_id: null, // Origin is the empresa
      empresa_origen_id: empresaData.id,
      direccion_origen: empresaData.direccion,
      latitud_origen: empresaData.latitud,
      longitud_origen: empresaData.longitud,
      nombre_destinatario: `${clienteData.nombre} ${clienteData.apellido}`,
      telefono_destinatario: clienteData.telefono,
      direccion_destino: clienteData.direccion,
      latitud_destino: clienteData.latitud,
      longitud_destino: clienteData.longitud,
      tipo_paquete_id: defaultTipoPaqueteId,
      tipo_servicio_id: asignacion.tipo_servicio_id,
      precio: asignacion.precio,
      estado: 'asignado', // Will be part of this reparto immediately
      repartidor_asignado_id: repartidor_id,
      notas_conductor: asignacion.notas_envio,
      user_id: currentUserId,
      // Fields not relevant for this flow or set to default
      cliente_temporal_nombre: null,
      cliente_temporal_telefono: null,
      empresa_destino_id: null,
      notas_origen: null,
      notas_destino: null,
      peso_kg: null,
      fecha_estimada_entrega: null,
      horario_retiro_desde: null,
      horario_entrega_hasta: null,
      detalles_adicionales: `Envío de lote para ${empresaData.nombre}`,
    };

    const { data: createdEnvio, error: envioCreationError } = await supabase
      .from('envios')
      .insert(newEnvioData)
      .select('id')
      .single();

    if (envioCreationError || !createdEnvio) {
      return { success: false, error: `Error creando envío para ${clienteData.nombre}: ${envioCreationError?.message}` };
    }
    createdEnvios.push(createdEnvio);
  }

  // 4. Create Reparto Record
  const { data: newReparto, error: repartoError } = await supabase
    .from('repartos')
    .insert({
      fecha_reparto: new Date(fecha_reparto).toISOString().split('T')[0],
      repartidor_id,
      empresa_asociada_id: empresa_id,
      estado: 'planificado',
      notas: notas_reparto,
      user_id: currentUserId,
    })
    .select()
    .single();

  if (repartoError || !newReparto) {
    // Attempt to clean up created envios if reparto creation fails
    const idsToDelete = createdEnvios.map(e => e.id).filter(id => !!id);
    if (idsToDelete.length > 0) await supabase.from('envios').delete().in('id', idsToDelete);
    return { success: false, error: `Error creando el reparto: ${repartoError?.message}` };
  }

  // 5. Create Paradas
  const paradasToInsert: Omit<ParadaReparto, 'id' | 'created_at' | 'updated_at' | 'user_id'>[] = [];

  // Parada de Retiro en Empresa
  paradasToInsert.push({
    reparto_id: newReparto.id,
    envio_id: null, // No specific envío for pickup stop
    descripcion_parada: `Retiro en ${empresaData.nombre} (${empresaData.direccion})`,
    orden_visita: 1, 
    estado_parada: 'asignado', 
  });

  // Paradas de Entrega para cada envío creado
  createdEnvios.forEach((envio, index) => {
    if (envio.id) {
      paradasToInsert.push({
        reparto_id: newReparto.id,
        envio_id: envio.id,
        orden_visita: index + 2, // Start after empresa pickup
        estado_parada: 'asignado',
      });
    }
  });

  const { error: paradasError } = await supabase.from('paradas_reparto').insert(paradasToInsert);

  if (paradasError) {
    // Attempt to clean up reparto and envios
    const idsToDelete = createdEnvios.map(e => e.id).filter(id => !!id);
    if (idsToDelete.length > 0) await supabase.from('envios').delete().in('id', idsToDelete);
    await supabase.from('repartos').delete().eq('id', newReparto.id);
    return { success: false, error: `Error creando paradas del reparto: ${paradasError.message}` };
  }

  revalidatePath('/repartos');
  revalidatePath('/repartos/lote/nuevo');
  revalidatePath('/envios');
  return { success: true, data: newReparto as Reparto };
}


export async function getRepartosAction(
  filters: { repartidorId?: string; fecha?: string; estado?: string },
  page: number = 1,
  pageSize: number = 10
): Promise<{ repartos: RepartoConDetalles[]; count: number; error?: string }> {
  let query = supabase
    .from('repartos')
    .select(`
      *,
      repartidores (id, nombre),
      empresas:empresa_asociada_id (id, nombre),
      paradas_reparto (count)
    `, { count: 'exact' });

  if (filters.repartidorId) {
    query = query.eq('repartidor_id', filters.repartidorId);
  }
  if (filters.fecha) {
    query = query.eq('fecha_reparto', filters.fecha);
  }
  if (filters.estado) {
    query = query.eq('estado', filters.estado);
  }

  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize - 1).order('fecha_reparto', { ascending: false }).order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching repartos:", error);
    return { repartos: [], count: 0, error: error.message };
  }
  
  const repartosWithCounts = data.map(r => ({
      ...r,
      paradas_count: (r.paradas_reparto as any)?.[0]?.count || 0 
  }));

  return { repartos: repartosWithCounts as RepartoConDetalles[], count: count || 0 };
}


export async function getRepartoByIdAction(id: string): Promise<{ reparto?: RepartoConDetalles & { paradas: ParadaReparto[] } ; error?: string }> {
  const { data, error } = await supabase
    .from('repartos')
    .select(`
      *,
      repartidores (id, nombre),
      empresas:empresa_asociada_id (id, nombre),
      paradas_reparto (
        *,
        envios (
            *,
            clientes:remitente_cliente_id(id, nombre, apellido),
            tipos_paquete(id, nombre)
        )
      )
    `)
    .eq('id', id)
    .single();
    
  if (error) {
    console.error(`Error fetching reparto by ID ${id}:`, error);
    return { error: error.message };
  }
  if (!data) {
    return { error: "Reparto no encontrado." };
  }

  const repartoData = data as any;
  if (repartoData.fecha_reparto && typeof repartoData.fecha_reparto === 'string') {
    repartoData.fecha_reparto = new Date(repartoData.fecha_reparto + "T00:00:00");
  }
  
  return { reparto: repartoData as RepartoConDetalles & { paradas: ParadaReparto[] } };
}

export async function updateRepartoEstadoAction(id: string, estado: Reparto['estado']): Promise<{ success: boolean; error?: string }> {
  const currentUserId = await getUserId();
  const { error } = await supabase
    .from('repartos')
    .update({ estado, updated_at: new Date().toISOString(), user_id: currentUserId })
    .eq('id', id);
  if (error) {
    console.error("Error updating reparto estado:", error);
    return { success: false, error: error.message };
  }
  revalidatePath(`/repartos`);
  revalidatePath(`/repartos/${id}`);
  return { success: true };
}

export async function updateParadaEstadoAction(
  paradaId: string, 
  nuevoEstadoParada: ParadaReparto['estado_parada'],
  envioId: string | null // EnvioId can be null for non-delivery stops
): Promise<{ success: boolean; error?: string }> {
  const currentUserId = await getUserId();
  
  const { error: paradaError } = await supabase
    .from('paradas_reparto')
    .update({ estado_parada: nuevoEstadoParada, updated_at: new Date().toISOString(), user_id: currentUserId })
    .eq('id', paradaId);

  if (paradaError) {
    console.error("Error updating parada estado:", paradaError);
    return { success: false, error: paradaError.message };
  }

  if (envioId && nuevoEstadoParada && (nuevoEstadoParada === 'entregado' || nuevoEstadoParada === 'no_entregado' || nuevoEstadoParada === 'cancelado')) {
    let nuevoEstadoEnvio: Envio['estado'] = 'asignado'; 
    if (nuevoEstadoParada === 'entregado') nuevoEstadoEnvio = 'entregado';
    else if (nuevoEstadoParada === 'no_entregado') nuevoEstadoEnvio = 'no_entregado';
    else if (nuevoEstadoParada === 'cancelado') nuevoEstadoEnvio = 'cancelado';

    const { error: envioError } = await supabase
      .from('envios')
      .update({ estado: nuevoEstadoEnvio, updated_at: new Date().toISOString(), user_id: currentUserId })
      .eq('id', envioId);

    if (envioError) {
      console.error("Error updating envio estado from parada:", envioError);
      return { success: false, error: `Parada actualizada, pero error al actualizar envío: ${envioError.message}` };
    }
  }
  
  const { data: parada } = await supabase.from('paradas_reparto').select('reparto_id').eq('id', paradaId).single();
  if (parada?.reparto_id) {
    revalidatePath(`/repartos/${parada.reparto_id}`);
  }
  revalidatePath('/envios');
  return { success: true };
}

export async function reorderParadasAction(repartoId: string, orderedParadaIds: string[]): Promise<{ success: boolean; error?: string }> {
  const currentUserId = await getUserId();
  try {
    for (let i = 0; i < orderedParadaIds.length; i++) {
      const parada_id = orderedParadaIds[i];
      const orden_visita = i + 1;
      const { error } = await supabase
        .from('paradas_reparto')
        .update({ orden_visita, updated_at: new Date().toISOString(), user_id: currentUserId })
        .eq('id', parada_id)
        .eq('reparto_id', repartoId); 

      if (error) throw error;
    }
    revalidatePath(`/repartos/${repartoId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error reordering paradas:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteRepartoAction(id: string): Promise<{ success: boolean; error?: string }> {
    const { data: paradas, error: paradasError } = await supabase
      .from('paradas_reparto')
      .select('envio_id')
      .eq('reparto_id', id);

    if (paradasError) {
      console.error('Error fetching paradas for reparto deletion:', paradasError);
      return { success: false, error: `Error al obtener paradas: ${paradasError.message}` };
    }

    const envioIds = paradas.map(p => p.envio_id).filter(id => id !== null); // Filter out null envio_ids

    const { error: deleteParadasError } = await supabase
      .from('paradas_reparto')
      .delete()
      .eq('reparto_id', id);

    if (deleteParadasError) {
      console.error('Error deleting paradas:', deleteParadasError);
      return { success: false, error: `Error al eliminar paradas: ${deleteParadasError.message}` };
    }

    const { error: deleteRepartoError } = await supabase
      .from('repartos')
      .delete()
      .eq('id', id);

    if (deleteRepartoError) {
      console.error('Error deleting reparto:', deleteRepartoError);
      return { success: false, error: `Error al eliminar reparto: ${deleteRepartoError.message}` };
    }

    if (envioIds.length > 0) {
      const { error: updateEnviosError } = await supabase
        .from('envios')
        .update({ estado: 'pendiente_asignacion', repartidor_asignado_id: null })
        .in('id', envioIds);

      if (updateEnviosError) {
        console.error('Error updating envios after reparto deletion:', updateEnviosError);
      }
    }

    revalidatePath('/repartos');
    revalidatePath('/envios');
    return { success: true };
}
