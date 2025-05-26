import { z } from 'zod';

// Enum for estado
export const EstadoEnum = z.enum(["activo", "inactivo"], {
  errorMap: () => ({ message: "Seleccione un estado válido." }),
});
export type Estado = z.infer<typeof EstadoEnum>;

// --- Empresa Schemas ---
export const EmpresaSchema = z.object({
  id: z.string().uuid().optional(), // Optional for creation, present for update
  nombre: z.string().min(2, "El nombre de la empresa es requerido y debe tener al menos 2 caracteres."),
  direccion: z.string().min(5, "La dirección es requerida y debe tener al menos 5 caracteres."),
  latitud: z.number().optional().nullable(),
  longitud: z.number().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email("Ingrese un email válido.").optional().nullable(),
  notas: z.string().optional().nullable(),
  estado: EstadoEnum,
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Empresa = z.infer<typeof EmpresaSchema>;
export type EmpresaFormValues = Omit<Empresa, 'id' | 'created_at' | 'updated_at' | 'latitud' | 'longitud'>; // For form input, lat/lon handled separately

// --- Cliente Schemas ---
export const ClienteSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(2, "El nombre es requerido y debe tener al menos 2 caracteres."),
  apellido: z.string().min(2, "El apellido es requerido y debe tener al menos 2 caracteres."),
  direccion: z.string().min(5, "La dirección es requerida y debe tener al menos 5 caracteres."),
  latitud: z.number().optional().nullable(),
  longitud: z.number().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email("Ingrese un email válido.").optional().nullable(),
  empresa_id: z.string().uuid().optional().nullable(),
  notas: z.string().optional().nullable(),
  estado: EstadoEnum,
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Cliente = z.infer<typeof ClienteSchema>;
export type ClienteFormValues = Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'latitud' | 'longitud'>;

// --- Repartidor Schemas ---
export const RepartidorSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(3, "El nombre del repartidor es requerido y debe tener al menos 3 caracteres."),
  estado: EstadoEnum,
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Repartidor = z.infer<typeof RepartidorSchema>;
export type RepartidorFormValues = Omit<Repartidor, 'id' | 'created_at' | 'updated_at'>;


// --- Original Schemas from previous step (AddressInputForm & ShipmentRequestForm) ---
// Keeping them here for context, but they might be refactored or integrated later.

const addressSchema = z.object({
  street: z.string().min(3, "La calle es requerida y debe tener al menos 3 caracteres."),
  city: z.string().min(2, "La ciudad es requerida y debe tener al menos 2 caracteres."),
  postalCode: z.string().min(3, "El código postal es requerido y debe tener al menos 3 caracteres."),
  country: z.string().min(2, "El país es requerido y debe tener al menos 2 caracteres."),
});

export const AddressInputFormSchema = z.object({
  address: addressSchema,
  serviceType: z.enum(["standard", "express", "sameday"], {
    errorMap: () => ({ message: "Seleccione un tipo de servicio." }),
  }),
});

export type AddressInputFormValues = z.infer<typeof AddressInputFormSchema>;
export type AddressDetails = z.infer<typeof addressSchema>;


export const ShipmentRequestFormSchema = z.object({
  comments: z.string().optional(),
});

export type ShipmentRequestFormValues = z.infer<typeof ShipmentRequestFormSchema>;
