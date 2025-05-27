
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
import { z } from 'zod';

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
    precio_base: validatedFields.data.precio_base === undefined || validatedFields.data.precio_base === null || isNaN(Number(validatedFields.data.precio_base)) ? null : Number(validatedFields.data.precio_base),
    precio_extra_km_default: validatedFields.data.precio_extra_km_default === undefined || validatedFields.data.precio_extra_km_default === null || isNaN(Number(validatedFields.data.precio_extra_km_default)) ? null : Number(validatedFields.data.precio_extra_km_default),
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
    precio_base: validatedFields.data.precio_base === undefined || validatedFields.data.precio_base === null || isNaN(Number(validatedFields.data.precio_base)) ? null : Number(validatedFields.data.precio_base),
    precio_extra_km_default: validatedFields.data.precio_extra_km_default === undefined || validatedFields.data.precio_extra_km_default === null || isNaN(Number(validatedFields.data.precio_extra_km_default)) ? null : Number(validatedFields.data.precio_extra_km_default),
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
        .eq('tipo_servicio_id', tipoServicioId); 

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
        if (newMin < tarifa.distancia_max_km && newMax > tarifa.distancia_min_km) {
            return true; 
        }
    }
    return false; 
}

// Define the base fields for tarifa actions once, as a plain object.
const BaseTarifaActionInputFields = {
  tipo_servicio_id: z.string().uuid("Debe seleccionar un tipo de servicio."),
  distancia_min_km: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0, "La distancia mínima no puede ser negativa.")
  ),
  distancia_max_km: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().positive("La distancia máxima debe ser un número positivo.")
  ),
  precio_base: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : parseFloat(String(val))),
    z.number().min(0, "El precio base no puede ser negativo.").nullable().optional().default(null)
  ),
  precio_por_km: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().positive("El precio por km debe ser un número positivo.")
  ),
};

// Common refinement logic
const tarifaRangeRefinement = (data: { distancia_min_km: number, distancia_max_km: number }, ctx: z.RefinementCtx) => {
  if (data.distancia_min_km >= data.distancia_max_km) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La distancia mínima debe ser menor que la distancia máxima.",
      path: ["distancia_max_km"],
    });
  }
};

// Schema for validating the input to createTarifaDistanciaAction
const CreateTarifaActionInputSchema = z.object(BaseTarifaActionInputFields)
  .superRefine(tarifaRangeRefinement);


export async function createTarifaDistanciaAction(
  formData: TarifaDistanciaFormValues & { tipo_servicio_id: string } 
): Promise<{ success: boolean; data?: TarifaDistanciaCalculadora; error?: string }> {
  
  const validatedFields = CreateTarifaActionInputSchema.safeParse(formData);

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
  const dataToInsert: Omit<TarifaDistanciaCalculadora, 'id' | 'created_at' | 'updated_at'> = {
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

// Schema for validating the input to updateTarifaDistanciaAction
const UpdateTarifaActionInputSchema = z.object({
    ...BaseTarifaActionInputFields, // Spread the base fields
    id: z.string().uuid(),         // Add the id field
  })
  .superRefine(tarifaRangeRefinement); // Apply the same refinement


export async function updateTarifaDistanciaAction(
  id: string, 
  formData: TarifaDistanciaFormValues & { tipo_servicio_id: string }
): Promise<{ success: boolean; data?: TarifaDistanciaCalculadora; error?: string }> {

  const dataForValidation = { ...formData, id }; 
  const validatedFields = UpdateTarifaActionInputSchema.safeParse(dataForValidation); 

  if (!validatedFields.success) {
    console.error("Validation Errors (updateTarifaDistanciaAction):", validatedFields.error.flatten());
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }

  // Omitting 'id' from restOfData as it's used in .eq() and not in the update payload itself
  const { tipo_servicio_id, distancia_min_km, distancia_max_km, id: validatedId, ...restOfData } = validatedFields.data;
  
  const hasOverlap = await checkOverlap(tipo_servicio_id, distancia_min_km, distancia_max_km, validatedId);
  if (hasOverlap) {
    return { success: false, error: "El rango de distancia ingresado se solapa con otra tarifa existente para este tipo de servicio." };
  }
  
  const currentUserId = await getUserId();
  const dataToUpdate: Omit<TarifaDistanciaCalculadora, 'id' | 'created_at' | 'updated_at' | 'user_id'> & { user_id?: string | null } = {
    tipo_servicio_id: tipo_servicio_id,
    distancia_min_km: distancia_min_km,
    distancia_max_km: distancia_max_km,
    precio_base: restOfData.precio_base,
    precio_por_km: restOfData.precio_por_km,
    user_id: currentUserId,
  };

  const { data: updatedTarifa, error } = await supabase
    .from('tarifas_distancia_calculadora')
    .update(dataToUpdate) 
    .eq('id', validatedId) // Use validatedId here (which is the original id passed to the function)
    .select()
    .single();

  if (error) {
    console.error("Error updating tarifa_distancia_calculadora in Supabase:", error);
    if (error.code === '23505') { 
      return { success: false, error: "Ya existe una tarifa con este rango exacto para este servicio (al actualizar)." };
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
    

