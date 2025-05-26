
"use server";

import { supabase } from '@/lib/supabase/client';
import { ClienteSchema, type Cliente, type ClienteFormValues } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

export async function createClienteAction(
  formData: ClienteFormValues
): Promise<{ success: boolean; data?: Cliente; error?: string }> {
  
  const dataToValidate = {
    ...formData,
    latitud: formData.latitud === '' ? null : formData.latitud,
    longitud: formData.longitud === '' ? null : formData.longitud,
    empresa_id: formData.empresa_id === 'no_empresa' || formData.empresa_id === '' ? null : formData.empresa_id,
  };

  const validatedFields = ClienteSchema.omit({ 
    id: true, 
    created_at: true, 
    updated_at: true, 
    user_id: true, 
    empresas: true // This is a joined field for display, not for insert/update
  }).safeParse(dataToValidate);

  if (!validatedFields.success) {
    console.error("Validation Errors (createClienteAction):", validatedFields.error.flatten());
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }

  const { data: newCliente, error } = await supabase
    .from('clientes')
    .insert(validatedFields.data)
    .select()
    .single();

  if (error) {
    console.error("Error creating cliente in Supabase:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/clientes');
  return { success: true, data: newCliente as Cliente };
}

export async function updateClienteAction(
  id: string,
  formData: ClienteFormValues
): Promise<{ success: boolean; data?: Cliente; error?: string }> {
  
  const dataToValidate = {
    ...formData,
    latitud: formData.latitud === '' ? null : formData.latitud,
    longitud: formData.longitud === '' ? null : formData.longitud,
    empresa_id: formData.empresa_id === 'no_empresa' || formData.empresa_id === '' ? null : formData.empresa_id,
  };

  const validatedFields = ClienteSchema.omit({ 
    id: true, 
    created_at: true, 
    updated_at: true, 
    user_id: true,
    empresas: true
  }).safeParse(dataToValidate);

  if (!validatedFields.success) {
    console.error("Validation Errors (updateClienteAction):", validatedFields.error.flatten());
    return { success: false, error: validatedFields.error.flatten().fieldErrorsToString() };
  }
  
  const dataToUpdate = {
    ...validatedFields.data,
    updated_at: new Date().toISOString(),
  };

  const { data: updatedCliente, error } = await supabase
    .from('clientes')
    .update(dataToUpdate)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating cliente in Supabase:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/clientes');
  revalidatePath(`/clientes/${id}/editar`);
  return { success: true, data: updatedCliente as Cliente };
}

export async function getClienteByIdAction(id: string): Promise<{ cliente?: Cliente; error?: string }> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*, empresas (id, nombre)') // Fetch associated empresa details
    .eq('id', id)
    .single();

  if (error) {
    console.error("Error fetching cliente by ID:", error);
    return { error: error.message };
  }
  if (!data) {
    return { error: "Cliente no encontrado." };
  }
  return { cliente: data as Cliente };
}
