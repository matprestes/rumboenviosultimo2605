
"use server";

import { supabase } from '@/lib/supabase/client';
import { 
    TipoServicioSchema, 
    type TipoServicio, 
    type TipoServicioFormValues,
    TarifaDistanciaCalculadoraSchema,
    type TarifaDistanciaCalculadora,
    type TarifaDistanciaFormValues
} from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

// Helper to get user_id
async function getUserId() {
  // const { data: { user } } = await supabase.auth.getUser();
  // return user?.id || null;
  return null; // Placeholder
}

// --- Tipos de Servicio Actions ---

export async function createTipoServicioAction(
  formData: TipoServicioFormValues
): Promise<{ success: boolean; data?: TipoServicio; error?: string }> {
  const validatedFields = TipoServicioSchema.omit({ 
    id: true, 
    created_at: true, 
    updated_at: true, 
    user_id: true 
  }).safeParse(formData);

  if (!validatedFields.success) {
    console.error("Validation Errors (createTipoServicioAction):", validatedFields.error.flatten());
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }

  const currentUserId = await getUserId();
  const dataToInsert = {
    ...validatedFields.data,
    user_id: currentUserId,
  };

  const { data: newTipoServicio, error } = await supabase
    .from('tipos_servicio')
    .insert(dataToInsert)
    .select()
    .single();

  if (error) {
    console.error("Error creating tipo_servicio in Supabase:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/configuracion/tipos-servicio');
  return { success: true, data: newTipoServicio as TipoServicio };
}

export async function getTiposServicioAction(): Promise<{ tiposServicio: TipoServicio[]; error?: string }> {
  const { data, error } = await supabase
    .from('tipos_servicio')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) {
    console.error("Error fetching tipos_servicio:", error);
    return { tiposServicio: [], error: error.message };
  }
  return { tiposServicio: data || [] };
}

export async function getTipoServicioByIdAction(id: string): Promise<{ tipoServicio?: TipoServicio; error?: string }> {
  if (!id) return { error: "ID de Tipo de Servicio inválido." };
  const { data, error } = await supabase
    .from('tipos_servicio')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("Error fetching tipo_servicio by ID:", error);
    return { error: error.message };
  }
  if (!data) {
    return { error: "Tipo de Servicio no encontrado." };
  }
  return { tipoServicio: data as TipoServicio };
}

export async function updateTipoServicioAction(
  id: string,
  formData: TipoServicioFormValues
): Promise<{ success: boolean; data?: TipoServicio; error?: string }> {
  const validatedFields = TipoServicioSchema.omit({ 
    id: true, 
    created_at: true, 
    updated_at: true, 
    user_id: true 
  }).safeParse(formData);

  if (!validatedFields.success) {
    console.error("Validation Errors (updateTipoServicioAction):", validatedFields.error.flatten());
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }
  
  const dataToUpdate = {
    ...validatedFields.data,
    updated_at: new Date().toISOString(),
  };

  const { data: updatedTipoServicio, error } = await supabase
    .from('tipos_servicio')
    .update(dataToUpdate)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating tipo_servicio in Supabase:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/configuracion/tipos-servicio');
  revalidatePath(`/configuracion/tipos-servicio/${id}/editar`);
  revalidatePath(`/configuracion/tipos-servicio/${id}/tarifas`);
  return { success: true, data: updatedTipoServicio as TipoServicio };
}

export async function deleteTipoServicioAction(id: string): Promise<{ success: boolean; error?: string }> {
  // First, check if there are associated tarifas
  const { data: tarifas, error: tarifasError } = await supabase
    .from('tarifas_distancia_calculadora')
    .select('id')
    .eq('tipo_servicio_id', id) 
    .limit(1);

  if (tarifasError) {
    console.error("Error checking for associated tarifas:", tarifasError);
    return { success: false, error: `Error al verificar tarifas asociadas: ${tarifasError.message}` };
  }

  if (tarifas && tarifas.length > 0) {
    return { success: false, error: "No se puede eliminar: este tipo de servicio tiene tarifas de distancia asociadas. Elimínelas primero." };
  }
  
  // Then, check if there are associated envios
  const { data: envios, error: enviosError } = await supabase
    .from('envios')
    .select('id')
    .eq('tipo_servicio_id', id)
    .limit(1);
  
  if (enviosError) {
    console.error("Error checking for associated envios:", enviosError);
    return { success: false, error: `Error al verificar envíos asociados: ${enviosError.message}` };
  }

  if (envios && envios.length > 0) {
    return { success: false, error: "No se puede eliminar: este tipo de servicio está siendo utilizado en envíos." };
  }


  const { error } = await supabase
    .from('tipos_servicio')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting tipo_servicio:", error);
    if (error.code === '23503') { 
        return { success: false, error: "No se puede eliminar: este tipo de servicio está siendo utilizado." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/configuracion/tipos-servicio');
  return { success: true };
}

// --- Tarifas por Distancia Actions ---

export async function getTarifasByTipoServicioAction(tipoServicioId: string): Promise<{ tarifas: TarifaDistanciaCalculadora[]; error?: string }> {
  if (!tipoServicioId) return { tarifas: [], error: "ID de Tipo de Servicio no provisto." };
  
  const { data, error } = await supabase
    .from('tarifas_distancia_calculadora')
    .select('*')
    .eq('tipo_servicio_id', tipoServicioId)
    .order('distancia_min_km', { ascending: true });

  if (error) {
    console.error("Error fetching tarifas por tipo de servicio:", error);
    return { tarifas: [], error: error.message };
  }
  return { tarifas: data || [] };
}

async function checkOverlap(
    tipoServicioId: string, 
    newMin: number, 
    newMax: number, 
    excludeTarifaId?: string
): Promise<boolean> {
    let query = supabase
        .from('tarifas_distancia_calculadora')
        .select('id, distancia_min_km, distancia_max_km')
        .eq('tipo_servicio_id', tipoServicioId); // Changed from tipo_servicio to tipo_servicio_id

    if (excludeTarifaId) {
        query = query.not('id', 'eq', excludeTarifaId);
    }
    
    const { data: existingTarifas, error } = await query;

    if (error) {
        console.error("Error fetching existing tarifas for overlap check:", error);
        return true; // Assume overlap on error to be safe
    }

    if (!existingTarifas) return false;

    for (const tarifa of existingTarifas) {
        // Check for overlap: (StartA < EndB) and (EndA > StartB)
        if (newMin < tarifa.distancia_max_km && newMax > tarifa.distancia_min_km) {
            return true; // Overlap detected
        }
    }
    return false; // No overlap
}


export async function createTarifaDistanciaAction(
  formData: TarifaDistanciaFormValues & { tipo_servicio_id: string } 
): Promise<{ success: boolean; data?: TarifaDistanciaCalculadora; error?: string }> {
  
  // tipo_servicio_id is now part of formData directly
  const validatedFields = TarifaDistanciaCalculadoraSchema.omit({ 
    id: true, 
    created_at: true, 
    updated_at: true, 
    user_id: true,
  }).safeParse(formData); // formData now includes tipo_servicio_id

  if (!validatedFields.success) {
    console.error("Validation Errors (createTarifaDistanciaAction):", validatedFields.error.flatten());
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }

  const { tipo_servicio_id, distancia_min_km, distancia_max_km } = validatedFields.data;

  const hasOverlap = await checkOverlap(tipo_servicio_id, distancia_min_km, distancia_max_km);
  if (hasOverlap) {
    return { success: false, error: "El rango de distancia ingresado se solapa con una tarifa existente para este tipo de servicio." };
  }

  const currentUserId = await getUserId();
  const dataToInsert = {
    ...validatedFields.data,
    user_id: currentUserId,
  };

  const { data: newTarifa, error } = await supabase
    .from('tarifas_distancia_calculadora')
    .insert(dataToInsert)
    .select()
    .single();

  if (error) {
    console.error("Error creating tarifa_distancia_calculadora in Supabase:", error);
     if (error.code === '23505') { 
      return { success: false, error: "Ya existe una tarifa con este rango exacto para este servicio." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(`/configuracion/tipos-servicio/${tipo_servicio_id}/tarifas`);
  return { success: true, data: newTarifa as TarifaDistanciaCalculadora };
}

export async function updateTarifaDistanciaAction(
  id: string, // tarifa_id
  formData: TarifaDistanciaFormValues & { tipo_servicio_id: string }
): Promise<{ success: boolean; data?: TarifaDistanciaCalculadora; error?: string }> {
  const validatedFields = TarifaDistanciaCalculadoraSchema.omit({ 
    id: true, 
    created_at: true, 
    updated_at: true, 
    user_id: true,
  }).safeParse(formData); // formData now includes tipo_servicio_id

  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }

  const { tipo_servicio_id, distancia_min_km, distancia_max_km } = validatedFields.data;
  
  const hasOverlap = await checkOverlap(tipo_servicio_id, distancia_min_km, distancia_max_km, id);
  if (hasOverlap) {
    return { success: false, error: "El rango de distancia ingresado se solapa con otra tarifa existente para este tipo de servicio." };
  }
  
  const dataToUpdate = {
    ...validatedFields.data,
    updated_at: new Date().toISOString(),
  };

  const { data: updatedTarifa, error } = await supabase
    .from('tarifas_distancia_calculadora')
    .update(dataToUpdate)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating tarifa_distancia_calculadora in Supabase:", error);
    if (error.code === '23505') { 
      return { success: false, error: "Ya existe una tarifa con este rango exacto para este servicio." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(`/configuracion/tipos-servicio/${tipo_servicio_id}/tarifas`);
  return { success: true, data: updatedTarifa as TarifaDistanciaCalculadora };
}

export async function deleteTarifaDistanciaAction(id: string, tipoServicioId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('tarifas_distancia_calculadora')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting tarifa_distancia_calculadora:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/configuracion/tipos-servicio/${tipoServicioId}/tarifas`);
  return { success: true };
}
