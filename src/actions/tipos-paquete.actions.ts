
"use server";

import { supabase } from '@/lib/supabase/client';
import { TipoPaqueteSchema, type TipoPaquete, type TipoPaqueteFormValues } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

// Helper to get user_id, replace with your actual auth logic
async function getUserId() {
  // const { data: { user } } = await supabase.auth.getUser();
  // return user?.id || null;
  return null; // Placeholder
}

export async function createTipoPaqueteAction(
  formData: TipoPaqueteFormValues
): Promise<{ success: boolean; data?: TipoPaquete; error?: string }> {
  const validatedFields = TipoPaqueteSchema.omit({ 
    id: true, 
    created_at: true, 
    updated_at: true, 
    user_id: true 
  }).safeParse(formData);

  if (!validatedFields.success) {
    console.error("Validation Errors (createTipoPaqueteAction):", validatedFields.error.flatten());
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }

  const currentUserId = await getUserId();
  const dataToInsert = {
    ...validatedFields.data,
    user_id: currentUserId,
  };

  const { data: newTipoPaquete, error } = await supabase
    .from('tipos_paquete')
    .insert(dataToInsert)
    .select()
    .single();

  if (error) {
    console.error("Error creating tipo_paquete in Supabase:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/configuracion/tipos-paquete');
  return { success: true, data: newTipoPaquete as TipoPaquete };
}

export async function getTiposPaqueteAction(): Promise<{ tiposPaquete: TipoPaquete[]; error?: string }> {
  const { data, error } = await supabase
    .from('tipos_paquete')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) {
    console.error("Error fetching tipos_paquete:", error);
    return { tiposPaquete: [], error: error.message };
  }
  return { tiposPaquete: data || [] };
}

export async function getTipoPaqueteByIdAction(id: string): Promise<{ tipoPaquete?: TipoPaquete; error?: string }> {
  if (!id) return { error: "ID de Tipo de Paquete inválido." };
  const { data, error } = await supabase
    .from('tipos_paquete')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("Error fetching tipo_paquete by ID:", error);
    return { error: error.message };
  }
  if (!data) {
    return { error: "Tipo de Paquete no encontrado." };
  }
  return { tipoPaquete: data as TipoPaquete };
}

export async function updateTipoPaqueteAction(
  id: string,
  formData: TipoPaqueteFormValues
): Promise<{ success: boolean; data?: TipoPaquete; error?: string }> {
  const validatedFields = TipoPaqueteSchema.omit({ 
    id: true, 
    created_at: true, 
    updated_at: true, 
    user_id: true 
  }).safeParse(formData);

  if (!validatedFields.success) {
    console.error("Validation Errors (updateTipoPaqueteAction):", validatedFields.error.flatten());
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }
  
  const dataToUpdate = {
    ...validatedFields.data,
    updated_at: new Date().toISOString(), // Manually set updated_at, trigger will also fire
  };

  const { data: updatedTipoPaquete, error } = await supabase
    .from('tipos_paquete')
    .update(dataToUpdate)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating tipo_paquete in Supabase:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/configuracion/tipos-paquete');
  revalidatePath(`/configuracion/tipos-paquete/${id}/editar`);
  return { success: true, data: updatedTipoPaquete as TipoPaquete };
}

export async function deleteTipoPaqueteAction(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('tipos_paquete')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting tipo_paquete:", error);
    // Check for foreign key violation (e.g., if envios reference this tipo_paquete)
    if (error.code === '23503') { // PostgreSQL foreign key violation error code
        return { success: false, error: "No se puede eliminar: este tipo de paquete está siendo utilizado en envíos." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/configuracion/tipos-paquete');
  return { success: true };
}

    