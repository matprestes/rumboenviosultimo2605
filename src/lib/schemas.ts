
import { z } from 'zod';

// Enum for estado
export const EstadoEnum = z.enum(["activo", "inactivo", "pendiente", "planificado"], {
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
  nombre: z.string().min(2, "El nombre de la empresa es requerido y debe tener al menos 2 caracteres.").default(""),
  direccion: z.string().min(5, "La dirección es requerida y debe tener al menos 5 caracteres.").default(""),
  latitud: z.number().optional().nullable(),
  longitud: z.number().optional().nullable(),
  telefono: z.string().optional().nullable().default(""),
  email: z.string().email("Ingrese un email válido.").optional().nullable().default(""),
  notas: z.string().optional().nullable().default(""),
  estado: EstadoEnum.default("activo"),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
});
export type Empresa = z.infer<typeof EmpresaSchema>;
export type EmpresaFormValues = Omit<Empresa, 'id' | 'created_at' | 'updated_at' | 'user_id'>;

// --- Cliente Schemas ---
export const ClienteSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(2, "El nombre es requerido y debe tener al menos 2 caracteres.").default(""),
  apellido: z.string().min(2, "El apellido es requerido y debe tener al menos 2 caracteres.").default(""),
  direccion: z.string().min(5, "La dirección es requerida y debe tener al menos 5 caracteres.").default(""),
  latitud: z.number().optional().nullable(),
  longitud: z.number().optional().nullable(),
  telefono: z.string().optional().nullable().default(""),
  email: z.string().email("Ingrese un email válido.").optional().nullable().default(""),
  empresa_id: z.string().uuid({message: "ID de empresa inválido"}).optional().nullable().default(null),
  notas: z.string().optional().nullable().default(""),
  estado: EstadoEnum.default("activo"),
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
  nombre: z.string().min(3, "El nombre del repartidor es requerido y debe tener al menos 3 caracteres.").default(""),
  estado: EstadoEnum.default("activo"),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
});
export type Repartidor = z.infer<typeof RepartidorSchema>;
export type RepartidorFormValues = Omit<Repartidor, 'id' | 'created_at' | 'updated_at' | 'user_id'>;

// --- TipoPaquete Schemas ---
export const TipoPaqueteSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(3, "El nombre del tipo de paquete es requerido.").default(""),
  descripcion: z.string().optional().nullable().default(""),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
});
export type TipoPaquete = z.infer<typeof TipoPaqueteSchema>;
export type TipoPaqueteFormValues = Omit<TipoPaquete, 'id' | 'created_at' | 'updated_at' | 'user_id'>;


// --- TipoServicio Schemas ---
export const TipoServicioSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(3, "El nombre del tipo de servicio es requerido.").default(""),
  descripcion: z.string().optional().nullable().default(""),
  precio_base: z.preprocess(
    (val) => (val === "" || val === null || val === undefined || isNaN(Number(val)) ? null : parseFloat(String(val))),
    z.number().min(0, "El precio base no puede ser negativo.").nullable().optional().default(null)
  ),
  precio_extra_km_default: z.preprocess(
    (val) => (val === "" || val === null || val === undefined || isNaN(Number(val)) ? null : parseFloat(String(val))),
    z.number().min(0, "El precio extra por KM no puede ser negativo.").nullable().optional().default(null)
  ),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
});
export type TipoServicio = z.infer<typeof TipoServicioSchema>;
export type TipoServicioFormValues = Omit<TipoServicio, 'id' | 'created_at' | 'updated_at' | 'user_id'>;


// --- TarifaDistanciaCalculadora Schemas ---
export const TarifaDistanciaCalculadoraSchema = z.object({
  id: z.string().uuid().optional(),
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
    (val) => (val === "" || val === null || val === undefined || isNaN(Number(val)) ? null : parseFloat(String(val))),
    z.number().min(0, "El precio base del rango no puede ser negativo.").nullable().optional().default(null)
  ),
  precio_por_km: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0,"El precio para el rango debe ser un número positivo.").default(0)
  ),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.distancia_min_km >= data.distancia_max_km) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La distancia mínima debe ser menor que la distancia máxima.",
      path: ["distancia_max_km"],
    });
  }
});
export type TarifaDistanciaCalculadora = z.infer<typeof TarifaDistanciaCalculadoraSchema>;
export type TarifaDistanciaFormValues = Omit<TarifaDistanciaCalculadora, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'tipo_servicio_id'>;


// --- Envío Schemas ---
const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const EnvioBaseSchema = z.object({
  id: z.string().uuid().optional(),
  remitente_cliente_id: z.string().uuid({ message: "Debe seleccionar un cliente remitente." }).nullable().optional(),
  nombre_destinatario: z.string().min(3, "El nombre del destinatario es requerido.").optional().nullable().default(null),
  telefono_destinatario: z.string().min(7, "El teléfono del destinatario es requerido.").optional().nullable().default(null),
  cliente_temporal_nombre: z.string().min(3, "El nombre del cliente temporal es requerido.").nullable().optional().default(null),
  cliente_temporal_telefono: z.string().min(7, "El teléfono del cliente temporal es requerido.").nullable().optional().default(null),
  direccion_origen: z.string().min(5, "La dirección de origen es requerida.").default(""),
  latitud_origen: z.number().nullable().optional(),
  longitud_origen: z.number().nullable().optional(),
  empresa_origen_id: z.string().uuid().nullable().optional(),
  notas_origen: z.string().nullable().optional().default(""),
  direccion_destino: z.string().min(5, "La dirección de destino es requerida.").default(""),
  latitud_destino: z.number().nullable().optional(),
  longitud_destino: z.number().nullable().optional(),
  empresa_destino_id: z.string().uuid().nullable().optional(),
  notas_destino: z.string().nullable().optional().default(""),
  tipo_paquete_id: z.string().uuid({ message: "Debe seleccionar un tipo de paquete."}).nullable().optional(),
  peso_kg: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return null;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    },
    z.number().positive("El peso debe ser un número positivo.").nullable().optional().default(null)
  ),
  tipo_servicio_id: z.string().uuid({ message: "Debe seleccionar un tipo de servicio."}).nullable().optional(),
  precio: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return 0;
      const num = parseFloat(String(val));
      return isNaN(num) ? 0 : num;
    },
    z.number().min(0, "El precio no puede ser negativo.").default(0)
  ),
  estado: EstadoEnvioEnum.default('pendiente_asignacion'),
  fecha_estimada_entrega: z.date().nullable().optional(),
  horario_retiro_desde: z.string()
    .regex(timeRegex, { message: "Formato HH:MM inválido para horario de retiro." })
    .optional().nullable().default(null).or(z.literal("")),
  horario_entrega_hasta: z.string()
    .regex(timeRegex, { message: "Formato HH:MM inválido para horario de entrega." })
    .optional().nullable().default(null).or(z.literal("")),
  repartidor_asignado_id: z.string().uuid().nullable().optional(),
  notas_conductor: z.string().nullable().optional().default(""),
  detalles_adicionales: z.string().nullable().optional().default(""),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
});

export const EnvioSchema = EnvioBaseSchema.superRefine((data, ctx) => {
  if (!data.remitente_cliente_id && !data.cliente_temporal_nombre && !data.empresa_origen_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debe seleccionar un cliente remitente, una empresa de origen, o ingresar un nombre de cliente temporal.",
      path: ["remitente_cliente_id"], // Or a more general path if appropriate
    });
  }
  if (data.cliente_temporal_nombre && !data.cliente_temporal_telefono) {
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Si ingresa un cliente temporal, el teléfono es requerido.",
      path: ["cliente_temporal_telefono"],
    });
  }
   if (!data.nombre_destinatario && !data.empresa_destino_id) { // Requires recipient name OR destination company
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debe ingresar un nombre de destinatario o seleccionar una empresa de destino.",
      path: ["nombre_destinatario"], // Or a more general path
    });
  }
});
export type Envio = z.infer<typeof EnvioSchema>;

export const DosRuedasEnvioFormSchema = z.object({
  remitente_cliente_id: z.string().uuid({ message: "Debe seleccionar un remitente." }),
  nombre_destinatario: z.string().min(3, "El nombre del destinatario es requerido."),
  telefono_destinatario: z.string().min(7, "El teléfono del destinatario es requerido."),
  direccion_destino: z.string().min(5, "La dirección de entrega es requerida."),
  latitud_destino: z.number().nullable().optional(),
  longitud_destino: z.number().nullable().optional(),
  tipo_servicio_id: z.string().uuid("Debe seleccionar un tipo de servicio."),
  horario_retiro_desde: z.string()
    .regex(timeRegex, { message: "Formato HH:MM inválido para horario de retiro." })
    .optional().nullable().default("").or(z.literal("")),
  horario_entrega_hasta: z.string()
    .regex(timeRegex, { message: "Formato HH:MM inválido para horario de entrega." })
    .optional().nullable().default("").or(z.literal("")),
  precio: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return 0;
      const num = parseFloat(String(val));
      return isNaN(num) ? 0 : num;
    },
    z.number().min(0, "El monto a cobrar no puede ser negativo.").default(0)
  ),
  detalles_adicionales: z.string().optional().nullable().default(""),
});
export type DosRuedasEnvioFormValues = z.infer<typeof DosRuedasEnvioFormSchema>;

export interface DosRuedasCalculatedShipment {
  remitenteNombre: string;
  remitenteDireccion: string;
  remitenteTelefono: string | null;
  destinatarioNombre: string;
  destinatarioTelefono: string;
  destinatarioDireccion: string;
  destinatarioLat: number | null;
  destinatarioLng: number | null;
  tipoServicioNombre: string;
  horarioRetiro: string | null;
  horarioEntrega: string | null;
  precioCalculado: number;
  distanciaKm: number | null;
  detallesAdicionales: string | null;
  calculationMethod?: string;
}

export interface EnvioConDetalles extends Envio {
  clientes?: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'empresa_id'> | null;
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
  notas: z.string().nullable().optional().default(""),
  envio_ids: z.array(z.string().uuid()).min(1, "Debe seleccionar al menos un envío para el reparto."),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
});
export type Reparto = z.infer<typeof RepartoSchema>;
export type RepartoFormValues = Omit<Reparto, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'estado'>;

export interface RepartoConDetalles extends Reparto {
  repartidores?: Pick<Repartidor, 'id' | 'nombre'> | null;
  empresas?: Pick<Empresa, 'id' | 'nombre' | 'latitud' | 'longitud' | 'direccion'> | null;
  paradas_count?: number;
  paradas_reparto?: ParadaConDetalles[]; // Esta es la clave para la relación con ParadaConDetalles
}

// --- ParadaReparto Schemas ---
export const ParadaRepartoSchema = z.object({
  id: z.string().uuid().optional(),
  reparto_id: z.string().uuid(),
  envio_id: z.string().uuid().nullable().optional(),
  descripcion_parada: z.string().nullable().optional().default(""),
  orden_visita: z.number().int().min(0, "El orden de visita no puede ser negativo.").nullable().optional(),
  estado_parada: EstadoEnvioEnum.default('asignado'),
  hora_estimada_llegada: z.string().regex(timeRegex, "Formato HH:MM inválido.").nullable().optional().default(null).or(z.literal("")),
  hora_real_llegada: z.string().regex(timeRegex, "Formato HH:MM inválido.").nullable().optional().default(null).or(z.literal("")),
  notas_parada: z.string().nullable().optional().default(""),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().nullable().optional(),
});
export type ParadaReparto = z.infer<typeof ParadaRepartoSchema>;

// ParadaConDetalles ahora anida EnvioConDetalles
export interface ParadaConDetalles extends ParadaReparto {
  envios?: EnvioConDetalles | null; // El envío asociado a esta parada
  repartos?: RepartoConDetalles | null; // El reparto al que pertenece esta parada
}


// --- Reparto Lote Schemas ---
export const RepartoLoteClientAssignmentSchema = z.object({
  cliente_id: z.string().uuid(),
  tipo_servicio_id: z.string().uuid({ message: "Seleccione un tipo de servicio." }),
  precio: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return 0;
      const num = parseFloat(String(val));
      return isNaN(num) ? 0 : num;
    },
    z.number().min(0, "El precio debe ser 0 o mayor.").default(0)
  ),
  notas_envio: z.string().optional().nullable().default(""),
});
export type RepartoLoteClientAssignment = z.infer<typeof RepartoLoteClientAssignmentSchema>;

export const RepartoLoteFormSchema = z.object({
  empresa_id: z.string().uuid({ message: "Debe seleccionar una empresa." }),
  fecha_reparto: z.date({ required_error: "La fecha de reparto es requerida." }),
  repartidor_id: z.string().uuid({ message: "Debe seleccionar un repartidor." }),
  notas_reparto: z.string().optional().nullable().default(""),
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
  comments: z.string().optional().default(""),
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

// --- Type for Route Optimization ---
export interface MappableStop {
  id: string; // Unique ID for this point (e.g., parada.id + '_pickup' or parada.id + '_delivery' or 'ORIGIN_EMPRESA_ANCHOR')
  originalParadaId?: string | null; // The ID of the ParadaReparto table entry, if applicable
  envioId?: string | null; // The ID of the Envio if this point relates to one
  type: 'pickup_empresa' | 'pickup_envio' | 'delivery_envio';
  location: { lat: number; lng: number };
  displayName: string; // For map markers/tooltips
}

    