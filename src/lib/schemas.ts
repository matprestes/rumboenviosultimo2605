
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

export const EstadoRepartoEnum = z.enum([
  "planificado",
  "en_curso",
  "completado",
  "cancelado",
], {
  errorMap: () => ({ message: "Seleccione un estado de reparto válido." }),
});
export type EstadoReparto = z.infer<typeof EstadoRepartoEnum>;


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
  user_id: z.string().uuid().nullable().optional(),
});
export type Empresa = z.infer<typeof EmpresaSchema>;
export type EmpresaFormValues = Omit<Empresa, 'id' | 'created_at' | 'updated_at' | 'user_id'>;

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
  user_id: z.string().uuid().nullable().optional(),
});
export type Cliente = z.infer<typeof ClienteSchema>;
export type ClienteFormValues = Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'empresas' | 'user_id'>;


// --- Repartidor Schemas ---
export const RepartidorSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(3, "El nombre del repartidor es requerido y debe tener al menos 3 caracteres."),
  estado: EstadoEnum,
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
});
export type Repartidor = z.infer<typeof RepartidorSchema>;
export type RepartidorFormValues = Omit<Repartidor, 'id' | 'created_at' | 'updated_at' | 'user_id'>;

// --- TipoPaquete Schemas ---
export const TipoPaqueteSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(3, "El nombre del tipo de paquete es requerido."),
  descripcion: z.string().optional().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
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
  user_id: z.string().uuid().nullable().optional(),
});
export type TipoServicio = z.infer<typeof TipoServicioSchema>;


// --- Envío Schemas ---
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/; // HH:MM format

export const EnvioBaseSchema = z.object({
  id: z.string().uuid().optional(),
  remitente_cliente_id: z.string().uuid({ message: "Debe seleccionar un cliente remitente." }).nullable().optional(),
  nombre_destinatario: z.string().min(3, "El nombre del destinatario es requerido.").optional().nullable(), // Made optional for internal form
  telefono_destinatario: z.string().min(7, "El teléfono del destinatario es requerido.").optional().nullable(), // Made optional for internal form
  cliente_temporal_nombre: z.string().nullable().optional(),
  cliente_temporal_telefono: z.string().nullable().optional(),
  direccion_origen: z.string().min(5, "La dirección de origen es requerida."),
  latitud_origen: z.number().nullable().optional(),
  longitud_origen: z.number().nullable().optional(),
  empresa_origen_id: z.string().uuid().nullable().optional(),
  notas_origen: z.string().nullable().optional(),
  direccion_destino: z.string().min(5, "La dirección de destino es requerida."),
  latitud_destino: z.number().nullable().optional(),
  longitud_destino: z.number().nullable().optional(),
  empresa_destino_id: z.string().uuid().nullable().optional(),
  notas_destino: z.string().nullable().optional(),
  tipo_paquete_id: z.string().uuid({ message: "Debe seleccionar un tipo de paquete."}).nullable().optional(),
  peso_kg: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : parseFloat(String(val))),
    z.number().positive("El peso debe ser un número positivo.").nullable().optional()
  ),
  tipo_servicio_id: z.string().uuid({ message: "Debe seleccionar un tipo de servicio."}).nullable().optional(),
  precio: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 0 : parseFloat(String(val))),
    z.number().min(0, "El precio no puede ser negativo.")
  ),
  estado: EstadoEnvioEnum.default('pendiente_asignacion'),
  fecha_estimada_entrega: z.date().nullable().optional(),
  horario_retiro_desde: z.string().regex(timeRegex, "Formato HH:MM requerido.").nullable().optional(),
  horario_entrega_hasta: z.string().regex(timeRegex, "Formato HH:MM requerido.").nullable().optional(),
  repartidor_asignado_id: z.string().uuid().nullable().optional(),
  notas_conductor: z.string().nullable().optional(),
  detalles_adicionales: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
});

export const EnvioSchema = EnvioBaseSchema.superRefine((data, ctx) => {
  if (!data.remitente_cliente_id && !data.cliente_temporal_nombre && !data.empresa_origen_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debe seleccionar un cliente remitente, una empresa de origen, o ingresar un nombre de cliente temporal.",
      path: ["remitente_cliente_id"], 
    });
  }
  if (data.cliente_temporal_nombre && !data.cliente_temporal_telefono) {
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Si ingresa un cliente temporal, el teléfono es requerido.",
      path: ["cliente_temporal_telefono"],
    });
  }
  if (!data.nombre_destinatario && !data.empresa_destino_id) { // For general envio form, either a recipient name or a destination company is expected.
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debe ingresar un nombre de destinatario o seleccionar una empresa de destino.",
      path: ["nombre_destinatario"],
    });
  }
});
export type Envio = z.infer<typeof EnvioSchema>;

export const DosRuedasEnvioFormSchema = z.object({
  remitente_cliente_id: z.string().uuid({ message: "Debe seleccionar un remitente." }),
  nombre_destinatario: z.string().min(3, "El nombre del destinatario es requerido."),
  telefono_destinatario: z.string().min(7, "El teléfono del destinatario es requerido."),
  direccion_destino: z.string().min(5, "La dirección de entrega es requerida."),
  horario_retiro_desde: z.string().regex(timeRegex, "Formato HH:MM requerido.").optional().nullable(),
  horario_entrega_hasta: z.string().regex(timeRegex, "Formato HH:MM requerido.").optional().nullable(),
  precio: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 0 : parseFloat(String(val))),
    z.number().min(0, "El monto a cobrar no puede ser negativo.")
  ),
  detalles_adicionales: z.string().optional().nullable(),
});
export type DosRuedasEnvioFormValues = z.infer<typeof DosRuedasEnvioFormSchema>;

export interface EnvioConDetalles extends Envio {
  clientes?: Pick<Cliente, 'id' | 'nombre' | 'apellido'> | null; 
  empresas_origen?: Pick<Empresa, 'id' | 'nombre'> | null;
  empresas_destino?: Pick<Empresa, 'id' | 'nombre'> | null;
  tipos_paquete?: Pick<TipoPaquete, 'id' | 'nombre'> | null;
  tipos_servicio?: Pick<TipoServicio, 'id' | 'nombre'> | null;
  repartidores?: Pick<Repartidor, 'id' | 'nombre'> | null;
}

// --- Reparto Schemas ---
export const RepartoSchema = z.object({
  id: z.string().uuid().optional(),
  fecha_reparto: z.date({
    required_error: "La fecha de reparto es requerida.",
    invalid_type_error: "Fecha inválida.",
  }),
  repartidor_id: z.string().uuid("Debe seleccionar un repartidor."),
  empresa_asociada_id: z.string().uuid().nullable().optional(),
  estado: EstadoRepartoEnum.default('planificado'),
  notas: z.string().nullable().optional(),
  envio_ids: z.array(z.string().uuid()).min(1, "Debe seleccionar al menos un envío para el reparto."),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
});
export type Reparto = z.infer<typeof RepartoSchema>;
export type RepartoFormValues = Omit<Reparto, 'id' | 'created_at' | 'updated_at' | 'user_id'>;

export interface RepartoConDetalles extends Reparto {
  repartidores?: Pick<Repartidor, 'id' | 'nombre'> | null;
  empresas?: Pick<Empresa, 'id' | 'nombre' | 'latitud' | 'longitud'> | null; // Added lat/lng for empresa origin
  paradas_count?: number;
}

// --- ParadaReparto Schemas ---
export const ParadaRepartoSchema = z.object({
  id: z.string().uuid().optional(),
  reparto_id: z.string().uuid(),
  envio_id: z.string().uuid().nullable().optional(), 
  descripcion_parada: z.string().nullable().optional(), 
  orden_visita: z.number().int().positive().nullable().optional(),
  estado_parada: EstadoEnvioEnum.default('asignado'), 
  hora_estimada_llegada: z.string().nullable().optional(),
  hora_real_llegada: z.string().nullable().optional(),
  notas_parada: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
});
export type ParadaReparto = z.infer<typeof ParadaRepartoSchema>;

export interface ParadaConDetalles extends ParadaReparto {
  envios?: EnvioConDetalles | null; 
}

// --- Reparto Lote Schemas ---
export const RepartoLoteClientAssignmentSchema = z.object({
  cliente_id: z.string().uuid(),
  tipo_servicio_id: z.string().uuid({ message: "Seleccione un tipo de servicio." }),
  precio: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 0 : parseFloat(String(val))),
    z.number().min(0, "El precio debe ser 0 o mayor.")
  ),
  notas_envio: z.string().optional().nullable(),
});
export type RepartoLoteClientAssignment = z.infer<typeof RepartoLoteClientAssignmentSchema>;

export const RepartoLoteFormSchema = z.object({
  empresa_id: z.string().uuid({ message: "Debe seleccionar una empresa." }),
  fecha_reparto: z.date({ required_error: "La fecha de reparto es requerida." }),
  repartidor_id: z.string().uuid({ message: "Debe seleccionar un repartidor." }),
  notas_reparto: z.string().optional().nullable(),
  asignaciones_clientes: z.array(RepartoLoteClientAssignmentSchema).min(1, "Debe asignar al menos un cliente al reparto."),
});
export type RepartoLoteFormValues = z.infer<typeof RepartoLoteFormSchema>;


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


// --- Types for MapaEnviosPage ---
export type UnassignedEnvioListItem = Pick<Envio, 'id' | 'direccion_origen' | 'latitud_origen' | 'longitud_origen' | 'direccion_destino' | 'latitud_destino' | 'longitud_destino' | 'estado' | 'cliente_temporal_nombre'> & {
  clientes?: Pick<Cliente, 'nombre' | 'apellido'> | null;
};

export type ActiveRepartoListItem = Pick<Reparto, 'id' | 'fecha_reparto' | 'estado' | 'empresa_asociada_id'> & {
  repartidores?: Pick<Repartidor, 'nombre'> | null;
  empresas?: Pick<Empresa, 'nombre' | 'latitud' | 'longitud'> | null;
  paradas: Array<Pick<ParadaReparto, 'orden_visita'> & {
    envios?: Pick<Envio, 'latitud_destino' | 'longitud_destino' | 'direccion_destino'> | null;
  }>;
};
