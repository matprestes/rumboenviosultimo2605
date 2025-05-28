
// src/types/supabase.ts
// These types are specific to the repartoprueba page and might need to be aligned
// or merged with existing types in src/lib/schemas.ts if functionality overlaps.

import type { Database } from "@/lib/supabase/database.types";

export type EnvioBase = Database["public"]["Tables"]["envios"]["Row"];
export type ClienteBase = Database["public"]["Tables"]["clientes"]["Row"];
export type EmpresaBase = Database["public"]["Tables"]["empresas"]["Row"];
export type RepartidorBase = Database["public"]["Tables"]["repartidores"]["Row"];
export type ParadaRepartoBase = Database["public"]["Tables"]["paradas_reparto"]["Row"];
export type RepartoBase = Database["public"]["Tables"]["repartos"]["Row"];
export type TipoPaqueteBase = Database["public"]["Tables"]["tipos_paquete"]["Row"];

export type TipoParada = 'retiro_empresa' | 'entrega_cliente' | 'retiro_individual_origen' | 'otro';

export interface EnvioMapa {
  id: string; // Can be envio_id or parada_id depending on context
  latitud: number | null;
  longitud: number | null;
  nombre_cliente: string | null; // Could be remitente, destinatario, or empresa name
  client_location: string | null; // Address
  status: Database["public"]["Enums"]["estado_envio_enum"] | null;
  tipo_paquete_nombre: string | null;
  package_weight: number | null;
  tipo_parada: TipoParada | null; // 'retiro_empresa', 'entrega_cliente', etc.
  orden: number | null; // orden_visita
  envio_id_original?: string | null; // Original envio.id if this EnvioMapa represents a parada
  reparto_id?: string | null;
  repartidor_nombre?: string | null;
  empresa_nombre?: string | null;
  fecha_reparto?: string | null;
}

export interface RepartoParaFiltro {
  id: string;
  label: string; // e.g., "25/05 - Juan Perez" or "25/05 - Farmacia Sur (Ana G)"
  tipo_reparto: 'individual' | 'viaje_empresa' | 'viaje_empresa_lote'; // Added for context
  empresa_nombre?: string | null;
  repartidor_nombre?: string | null;
  fecha_reparto?: string | null;
}

// Placeholder for Google Maps Coordinate type if needed more broadly
export interface Coordenada {
    lat: number;
    lng: number;
}
