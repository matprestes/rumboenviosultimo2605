
"use server";

import { supabase } from '@/lib/supabase/client';
import { EmpresaSchema, type EmpresaFormValues, type Empresa } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

export async function createEmpresaAction(
  formData: EmpresaFormValues
): Promise<{ success: boolean; data?: Empresa; error?: string }> {
  // Ensure that latitud and longitud are numbers or null, not empty strings
  const dataToValidate = {
    ...formData,
    latitud: formData.latitud === '' ? null : formData.latitud,
    longitud: formData.longitud === '' ? null : formData.longitud,
  };

  const validatedFields = EmpresaSchema.omit({ 
    id: true, 
    created_at: true, 
    updated_at: true, 
    user_id: true 
  }).safeParse(dataToValidate);

  if (!validatedFields.success) {
    console.error("Validation Errors (createEmpresaAction):", validatedFields.error.flatten());
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }

  const { data: newEmpresa, error } = await supabase
    .from('empresas')
    .insert(validatedFields.data)
    .select()
    .single();

  if (error) {
    console.error("Error creating empresa in Supabase:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/empresas');
  return { success: true, data: newEmpresa as Empresa };
}
