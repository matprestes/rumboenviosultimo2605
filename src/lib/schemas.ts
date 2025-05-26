
import { z } from 'zod';

// Enum for estado
export const EstadoEnum = z.enum(["activo", "inactivo", "pendiente"], { // Added pendiente as a general state option
  errorMap: () => ({ message: "Seleccione un estado válido." }),
});
export type Estado = z.infer<typeof EstadoEnum>;

export const EstadoEnvioEnum = z.enum([
    "pendiente_asignacion",
    "asignado",
    "en_camino",
    "entregado",
    "no_entregado",
    "cancelado",
  ], {
  errorMap: () => ({ message: "Seleccione un estado de envío válido." }),
});
export type EstadoEnvio = z.infer<typeof EstadoEnvioEnum>;


// --- Empresa Schemas ---
export const EmpresaSchema = z.object({
  id: z.string().uuid().optional(), // Optional for creation, present for update/display
  nombre: z.string().min(2, "El nombre de la empresa es requerido y debe tener al menos 2 caracteres."),
  direccion: z.string().min(5, "La dirección es requerida y debe tener al menos 5 caracteres."),
  latitud: z.number().optional().nullable(),
  longitud: z.number().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email("Ingrese un email válido.").optional().nullable(),
  notas: z.string().optional().nullable(),
  estado: EstadoEnum,
  created_at: z.string().datetime().optional(), // Supabase provides this
  updated_at: z.string().datetime().optional(), // Supabase provides this
});
export type Empresa = z.infer<typeof EmpresaSchema>;
export type EmpresaFormValues = Omit<Empresa, 'id' | 'created_at' | 'updated_at'>;

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
  // This field is not directly in DB, but used for UI representation
  empresas: z.object({ id: z.string(), nombre: z.string() }).optional().nullable(),
});
export type Cliente = z.infer<typeof ClienteSchema>;
export type ClienteFormValues = Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'empresas'>;


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


// --- Envío Schemas ---
export const EnvioSchema = z.object({
  id: z.string().uuid().optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  cliente_temporal_nombre: z.string().nullable().optional(),
  cliente_temporal_telefono: z.string().nullable().optional(),
  direccion_origen: z.string().min(5, "La dirección de origen es requerida."),
  latitud_origen: z.number().nullable().optional(),
  longitud_origen: z.number().nullable().optional(),
  empresa_origen_id: z.string().uuid().nullable().optional(),
  direccion_destino: z.string().min(5, "La dirección de destino es requerida."),
  latitud_destino: z.number().nullable().optional(),
  longitud_destino: z.number().nullable().optional(),
  empresa_destino_id: z.string().uuid().nullable().optional(),
  tipo_paquete_id: z.string().uuid().nullable().optional(), // Assuming types will be UUIDs
  peso_kg: z.number().positive("El peso debe ser un número positivo.").nullable().optional(),
  tipo_servicio_id: z.string().uuid(), // Assuming types will be UUIDs
  precio: z.number().min(0, "El precio no puede ser negativo."),
  estado: EstadoEnvioEnum.default('pendiente_asignacion'),
  fecha_estimada_entrega: z.string().datetime().nullable().optional(),
  repartidor_asignado_id: z.string().uuid().nullable().optional(),
  notas_conductor: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(), // Assuming user_id from auth
});
export type Envio = z.infer<typeof EnvioSchema>;


// --- Reparto Schemas ---
export const RepartoSchema = z.object({
  id: z.string().uuid().optional(),
  fecha_reparto: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Fecha de reparto inválida."}), // Store as ISO string, validate if parseable
  repartidor_id: z.string().uuid("Debe seleccionar un repartidor."),
  empresa_asociada_id: z.string().uuid().nullable().optional(),
  estado: EstadoEnum.default('pendiente'),
  notas: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
});
export type Reparto = z.infer<typeof RepartoSchema>;


// --- ParadaReparto Schemas ---
export const ParadaRepartoSchema = z.object({
  id: z.string().uuid().optional(),
  reparto_id: z.string().uuid(),
  envio_id: z.string().uuid(),
  orden_visita: z.number().int().positive().nullable().optional(),
  estado_parada: EstadoEnvioEnum.default('asignado'),
  hora_estimada_llegada: z.string().nullable().optional(), // Consider time format
  hora_real_llegada: z.string().nullable().optional(),     // Consider time format
  notas_parada: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
});
export type ParadaReparto = z.infer<typeof ParadaRepartoSchema>;


// --- Original Schemas from previous step (AddressInputForm & ShipmentRequestForm) ---
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
