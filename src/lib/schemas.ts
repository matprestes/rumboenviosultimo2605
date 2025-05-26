
import { z } from 'zod';

// Enum for estado
export const EstadoEnum = z.enum(["activo", "inactivo", "pendiente"], {
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
  id: z.string().uuid().optional(),
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
  empresas: z.object({ id: z.string(), nombre: z.string() }).optional().nullable(), // For UI join
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

// --- TipoPaquete Schemas ---
export const TipoPaqueteSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(3, "El nombre del tipo de paquete es requerido."),
  descripcion: z.string().optional().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type TipoPaquete = z.infer<typeof TipoPaqueteSchema>;

// --- TipoServicio Schemas ---
export const TipoServicioSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(3, "El nombre del tipo de servicio es requerido."),
  descripcion: z.string().optional().nullable(),
  precio_base: z.number().min(0, "El precio base no puede ser negativo.").optional().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type TipoServicio = z.infer<typeof TipoServicioSchema>;


// --- Envío Schemas ---
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/; // HH:MM format

export const EnvioBaseSchema = z.object({
  id: z.string().uuid().optional(),
  
  // Sender (Remitente) details
  remitente_cliente_id: z.string().uuid({ message: "Debe seleccionar un cliente remitente." }).nullable().optional(), // Nullable if not using this field in some contexts
  // The form based on the image will use remitente_cliente_id to fetch sender's name, phone, address

  // Recipient (Destinatario) details - for forms like "DosRuedas"
  nombre_destinatario: z.string().min(3, "El nombre del destinatario es requerido.").optional().nullable(),
  telefono_destinatario: z.string().min(7, "El teléfono del destinatario es requerido.").optional().nullable(),
  
  // Client details - for more comprehensive internal forms
  cliente_id: z.string().uuid().nullable().optional(), // This will be used by the internal form, could be sender or receiver based on context
  cliente_temporal_nombre: z.string().nullable().optional(),
  cliente_temporal_telefono: z.string().nullable().optional(),
  
  // Origin details
  direccion_origen: z.string().min(5, "La dirección de origen es requerida."),
  latitud_origen: z.number().nullable().optional(),
  longitud_origen: z.number().nullable().optional(),
  empresa_origen_id: z.string().uuid().nullable().optional(), 
  notas_origen: z.string().nullable().optional(),

  // Destination details
  direccion_destino: z.string().min(5, "La dirección de destino es requerida."),
  latitud_destino: z.number().nullable().optional(),
  longitud_destino: z.number().nullable().optional(),
  empresa_destino_id: z.string().uuid().nullable().optional(), 
  notas_destino: z.string().nullable().optional(),

  // Package and Service details
  tipo_paquete_id: z.string().uuid({ message: "Debe seleccionar un tipo de paquete."}).nullable().optional(),
  peso_kg: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : parseFloat(String(val))),
    z.number().positive("El peso debe ser un número positivo.").nullable().optional()
  ),
  tipo_servicio_id: z.string().uuid({ message: "Debe seleccionar un tipo de servicio."}).nullable().optional(),
  
  // Pricing and Status
  precio: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 0 : parseFloat(String(val))), 
    z.number().min(0, "El precio no puede ser negativo.")
  ),
  estado: EstadoEnvioEnum.default('pendiente_asignacion'),
  
  // Time and Date fields
  fecha_estimada_entrega: z.date().nullable().optional(),
  horario_retiro_desde: z.string().regex(timeRegex, "Formato HH:MM requerido para horario de retiro.").nullable().optional(),
  horario_entrega_hasta: z.string().regex(timeRegex, "Formato HH:MM requerido para horario de entrega.").nullable().optional(),
  
  // Assignment and Notes
  repartidor_asignado_id: z.string().uuid().nullable().optional(),
  notas_conductor: z.string().nullable().optional(), // General notes for driver (internal form)
  detalles_adicionales: z.string().nullable().optional(), // Specific notes for "DosRuedas" form
  
  // Timestamps and User
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
});

export const EnvioSchema = EnvioBaseSchema.superRefine((data, ctx) => {
  // This refinement is for the internal form where one of client_id or cliente_temporal_nombre is required.
  // For DosRuedasForm, remitente_cliente_id will be handled separately by that form's schema.
  if (!data.remitente_cliente_id && !data.cliente_id && !data.cliente_temporal_nombre) {
    // This condition might need adjustment based on which form is being validated
    // For a generic EnvioSchema, this is complex.
    // We'll handle specific form validations at the form level or with a more specific schema.
  }
  if (data.cliente_temporal_nombre && !data.cliente_temporal_telefono && !data.remitente_cliente_id) {
    // Only enforce if not using remitente_cliente_id and temporal name is provided
    // This rule is more for the internal form
   }
});
export type Envio = z.infer<typeof EnvioSchema>;

// Schema for the "Dos Ruedas" simplified form
export const DosRuedasEnvioFormSchema = z.object({
  remitente_cliente_id: z.string().uuid({ message: "Debe seleccionar un remitente." }),
  // Sender's name and phone will be derived from the selected client.
  // Sender's address (direccion_origen) will be derived.
  nombre_destinatario: z.string().min(3, "El nombre del destinatario es requerido."),
  telefono_destinatario: z.string().min(7, "El teléfono del destinatario es requerido."),
  direccion_destino: z.string().min(5, "La dirección de entrega es requerida."),
  horario_retiro_desde: z.string().regex(timeRegex, "Formato HH:MM requerido.").optional().nullable(),
  horario_entrega_hasta: z.string().regex(timeRegex, "Formato HH:MM requerido.").optional().nullable(),
  precio: z.preprocess( // "Monto a cobrar"
    (val) => (val === "" || val === null || val === undefined ? 0 : parseFloat(String(val))),
    z.number().min(0, "El monto a cobrar no puede ser negativo.")
  ),
  detalles_adicionales: z.string().optional().nullable(),
});
export type DosRuedasEnvioFormValues = z.infer<typeof DosRuedasEnvioFormSchema>;


// For UI representation, we might join related data
export interface EnvioConDetalles extends Envio {
  clientes?: Cliente | null; // Used for remitente_cliente_id or cliente_id
  empresas_origen?: Empresa | null;
  empresas_destino?: Empresa | null;
  tipos_paquete?: TipoPaquete | null;
  tipos_servicio?: TipoServicio | null;
  repartidores?: Repartidor | null;
}


// --- Reparto Schemas ---
export const RepartoSchema = z.object({
  id: z.string().uuid().optional(),
  fecha_reparto: z.date({ required_error: "La fecha de reparto es requerida."}),
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
  hora_estimada_llegada: z.string().nullable().optional(), // Could be HH:MM format
  hora_real_llegada: z.string().nullable().optional(), // Could be HH:MM format
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

    
