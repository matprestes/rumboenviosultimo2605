
"use server";

import { supabase } from '@/lib/supabase/client';
import type { Reparto, ParadaReparto, RepartoConDetalles, EnvioConDetalles, Repartidor, Empresa } from '@/lib/schemas';
import { RepartoSchema } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

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

export async function getEmpresasForSelectAction(): Promise<Pick<Empresa, 'id' | 'nombre'>[]> {
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
    .eq('estado', 'pendiente_asignacion') // Only fetch envios pending assignment
    .order('created_at', { ascending: true });

  // Subquery to find envios already in an active or planned reparto
  const { data: paradasEnRepartosActivos, error: paradasError } = await supabase
    .from('paradas_reparto')
    .select('envio_id, reparto_id, repartos(estado)')
    .filter('repartos.estado', 'in', '("planificado","en_curso")');
  
  if (paradasError) {
    console.error("Error fetching paradas activas:", paradasError);
    return [];
  }

  const enviosEnRepartoIds = paradasEnRepartosActivos?.map(p => p.envio_id) || [];
  if (enviosEnRepartoIds.length > 0) {
    query = query.not('id', 'in', `(${enviosEnRepartoIds.join(',')})`);
  }
  
  if (empresaId) {
    // This is a bit complex because an envio can be linked to an empresa via
    // remitente_cliente_id -> clientes.empresa_id OR directly via envios.empresa_origen_id
    // For simplicity, we'll try to match on either. A more robust solution might involve a view or function in PG.
    
    // Fetch clients belonging to the specified company
    const { data: clientesDeEmpresa, error: clientesError } = await supabase
      .from('clientes')
      .select('id')
      .eq('empresa_id', empresaId);

    if (clientesError) {
      console.error("Error fetching clientes for empresa:", clientesError);
      // Continue without client filter if this fails, or handle error as appropriate
    }
    
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

  // 1. Create the Reparto
  const { data: newReparto, error: repartoError } = await supabase
    .from('repartos')
    .insert({
      ...repartoData,
      fecha_reparto: new Date(repartoData.fecha_reparto).toISOString().split('T')[0], // Ensure YYYY-MM-DD
      estado: 'planificado', // Default state for new repartos
      user_id: currentUserId,
    })
    .select()
    .single();

  if (repartoError || !newReparto) {
    console.error("Error creating reparto:", repartoError);
    return { success: false, error: repartoError?.message || "No se pudo crear el reparto." };
  }

  // 2. Create Paradas and Update Envios
  const paradasToInsert: Omit<ParadaReparto, 'id' | 'created_at' | 'updated_at' | 'user_id'>[] = envio_ids.map((envioId, index) => ({
    reparto_id: newReparto.id,
    envio_id: envioId,
    orden_visita: index + 1, // Simple initial ordering
    estado_parada: 'asignado',
  }));

  const { error: paradasError } = await supabase.from('paradas_reparto').insert(paradasToInsert);

  if (paradasError) {
    console.error("Error creating paradas:", paradasError);
    // Potentially rollback reparto creation or mark it as problematic
    await supabase.from('repartos').delete().eq('id', newReparto.id); // Attempt to clean up
    return { success: false, error: "Error al crear las paradas del reparto: " + paradasError.message };
  }

  // 3. Update Envios' status and repartidor_asignado_id
  const { error: enviosUpdateError } = await supabase
    .from('envios')
    .update({ estado: 'asignado', repartidor_asignado_id: newReparto.repartidor_id })
    .in('id', envio_ids);

  if (enviosUpdateError) {
    console.error("Error updating envios:", enviosUpdateError);
    // This is more complex to fully roll back. For now, log and report.
    return { success: false, error: "Reparto y paradas creadas, pero error al actualizar envíos: " + enviosUpdateError.message };
  }

  revalidatePath('/repartos');
  revalidatePath('/envios'); // Envios status changed
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
      paradas_count: (r.paradas_reparto as any)?.[0]?.count || 0 // Supabase returns count in an array
  }));

  return { repartos: repartosWithCounts as RepartoConDetalles[], count: count || 0 };
}

// --- Placeholder for future actions ---
export async function getRepartoByIdAction(id: string): Promise<{ reparto?: RepartoConDetalles & { paradas: ParadaReparto[] } ; error?: string }> {
  // TODO: Implement this action to fetch full reparto details and its paradas with envio info
  // For now, returning a placeholder
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
  envioId: string // Need envioId to update the corresponding envio
): Promise<{ success: boolean; error?: string }> {
  const currentUserId = await getUserId();
  
  // 1. Update Parada Estado
  const { error: paradaError } = await supabase
    .from('paradas_reparto')
    .update({ estado_parada: nuevoEstadoParada, updated_at: new Date().toISOString(), user_id: currentUserId })
    .eq('id', paradaId);

  if (paradaError) {
    console.error("Error updating parada estado:", paradaError);
    return { success: false, error: paradaError.message };
  }

  // 2. Update corresponding Envio Estado
  let nuevoEstadoEnvio: Envio['estado'] = 'asignado'; // Default, should ideally not revert to this
  if (nuevoEstadoParada === 'entregado') nuevoEstadoEnvio = 'entregado';
  else if (nuevoEstadoParada === 'no_entregado') nuevoEstadoEnvio = 'no_entregado';
  // Add other mappings if necessary, e.g. 'cancelado' for parada might mean 'cancelado' for envio

  if (nuevoEstadoEnvio && (nuevoEstadoParada === 'entregado' || nuevoEstadoParada === 'no_entregado' || nuevoEstadoParada === 'cancelado')) {
    const { error: envioError } = await supabase
      .from('envios')
      .update({ estado: nuevoEstadoEnvio, updated_at: new Date().toISOString(), user_id: currentUserId })
      .eq('id', envioId);

    if (envioError) {
      console.error("Error updating envio estado from parada:", envioError);
      // Parada was updated, but envio was not. This state is inconsistent.
      // For now, report error but don't attempt rollback of parada.
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
  // This requires a transaction or careful handling in Supabase.
  // For simplicity, we'll update each parada individually.
  // A more robust solution would use an RPC function in PostgreSQL.
  const currentUserId = await getUserId();
  try {
    for (let i = 0; i < orderedParadaIds.length; i++) {
      const parada_id = orderedParadaIds[i];
      const orden_visita = i + 1;
      const { error } = await supabase
        .from('paradas_reparto')
        .update({ orden_visita, updated_at: new Date().toISOString(), user_id: currentUserId })
        .eq('id', parada_id)
        .eq('reparto_id', repartoId); // Ensure we only update paradas of this reparto

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
    // 1. Get all envio_ids associated with this reparto's paradas
    const { data: paradas, error: paradasError } = await supabase
      .from('paradas_reparto')
      .select('envio_id')
      .eq('reparto_id', id);

    if (paradasError) {
      console.error('Error fetching paradas for reparto deletion:', paradasError);
      return { success: false, error: `Error al obtener paradas: ${paradasError.message}` };
    }

    const envioIds = paradas.map(p => p.envio_id);

    // 2. Delete paradas for this reparto
    const { error: deleteParadasError } = await supabase
      .from('paradas_reparto')
      .delete()
      .eq('reparto_id', id);

    if (deleteParadasError) {
      console.error('Error deleting paradas:', deleteParadasError);
      return { success: false, error: `Error al eliminar paradas: ${deleteParadasError.message}` };
    }

    // 3. Delete the reparto itself
    const { error: deleteRepartoError } = await supabase
      .from('repartos')
      .delete()
      .eq('id', id);

    if (deleteRepartoError) {
      console.error('Error deleting reparto:', deleteRepartoError);
      return { success: false, error: `Error al eliminar reparto: ${deleteRepartoError.message}` };
    }

    // 4. Update status of associated envios back to 'pendiente_asignacion' and clear repartidor_asignado_id
    if (envioIds.length > 0) {
      const { error: updateEnviosError } = await supabase
        .from('envios')
        .update({ estado: 'pendiente_asignacion', repartidor_asignado_id: null })
        .in('id', envioIds);

      if (updateEnviosError) {
        console.error('Error updating envios after reparto deletion:', updateEnviosError);
        // The reparto and paradas are deleted, but envios couldn't be fully reset.
        // This is a partial success/failure state. For now, we'll report success on reparto deletion.
        // but log this issue.
      }
    }

    revalidatePath('/repartos');
    revalidatePath('/envios');
    return { success: true };
}
