
// src/app/repartoprueba/actions.ts
"use server";

import { supabase } from "@/lib/supabase/client";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import type {
    Envio,
    Cliente,
    Empresa,
    Repartidor,
    TipoPaquete,
    Reparto,
    ParadaReparto,
    EstadoEnvio, // Type alias
    TipoParada, // Type alias
    EstadoReparto // Type alias
} from "@/lib/schemas";
import { EstadoEnvioEnum, tipoParadaEnum } from "@/lib/schemas";


// Specific type for the filter dropdown items
export interface RepartoParaFiltro {
  id: string;
  label: string;
  tipo_reparto: 'individual' | 'viaje_empresa' | 'viaje_empresa_lote'; // For context
  empresa_nombre?: string | null;
  repartidor_nombre?: string | null;
  fecha_reparto?: string | null; // YYYY-MM-DD
  estado?: EstadoReparto | null; // ADDED
}

// Specific type for map markers / list items on this page
export interface EnvioMapa {
  id: string; // Can be envio_id or parada_id depending on context
  latitud: number | null;
  longitud: number | null;
  nombre_cliente: string | null;
  client_location: string | null; // Address
  status: EstadoEnvio | null; // Using the type alias here is fine
  tipo_paquete_nombre: string | null;
  package_weight: number | null;
  tipo_parada: TipoParada | null;
  orden: number | null; // orden_visita
  envio_id_original?: string | null;
  reparto_id?: string | null;
  repartidor_nombre?: string | null;
  empresa_nombre?: string | null;
  fecha_reparto?: string | null; // YYYY-MM-DD
}


export async function getRepartosForMapFilterAction(): Promise<{ data: RepartoParaFiltro[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("repartos")
    .select(`
      id,
      fecha_reparto,
      estado, 
      repartidores ( nombre ),
      empresas ( nombre )
    `)
    .order("fecha_reparto", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching repartos for map filter:", error);
    return { data: null, error: error.message };
  }

  const formattedData: RepartoParaFiltro[] = data.map((r) => {
    // Cast to include the nested structures correctly
    const reparto = r as Reparto & { 
        repartidores: Pick<Repartidor, 'nombre'> | null, 
        empresas: Pick<Empresa, 'nombre'> | null 
    };
    const fecha = reparto.fecha_reparto && isValid(parseISO(reparto.fecha_reparto)) 
        ? format(parseISO(reparto.fecha_reparto), "dd/MM/yy", { locale: es }) 
        : "Sin Fecha";
    const repartidor = reparto.repartidores?.nombre || "N/A";
    const empresa = reparto.empresas?.nombre;
    let label = `${fecha} - ${repartidor}`;
    let tipo_reparto_val: RepartoParaFiltro['tipo_reparto'] = 'individual';

    if (empresa) {
      label += ` (${empresa})`;
      tipo_reparto_val = 'viaje_empresa_lote'; // Assuming empresa_asociada_id implies lote
    }
    return {
      id: reparto.id!,
      label: label,
      tipo_reparto: tipo_reparto_val,
      empresa_nombre: empresa,
      repartidor_nombre: repartidor,
      fecha_reparto: reparto.fecha_reparto, // YYYY-MM-DD
      estado: reparto.estado, // ADDED
    };
  });

  return { data: formattedData, error: null };
}


export async function getEnviosNoAsignadosGeolocalizadosAction(): Promise<{ data: EnvioMapa[] | null; count: number | null; error: string | null }> {
  const { data, error, count } = await supabase
    .from("envios")
    .select(`
      id,
      direccion_destino,
      latitud_destino,
      longitud_destino,
      cliente_temporal_nombre,
      clientes!envios_remitente_cliente_id_fkey ( nombre, apellido ),
      tipos_paquete ( nombre ),
      peso_kg,
      estado
    `)
    .eq("estado", EstadoEnvioEnum.Values.pendiente_asignacion) 
    .not("latitud_destino", "is", null)
    .not("longitud_destino", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching unassigned geolocated envios:", error);
    return { data: null, count: 0, error: error.message };
  }

  const enviosMapa: EnvioMapa[] = (data as (Envio & { clientes: Pick<Cliente, 'nombre' | 'apellido'> | null, tipos_paquete: Pick<TipoPaquete, 'nombre'> | null})[]).map(e => ({
    id: e.id!,
    latitud: e.latitud_destino,
    longitud: e.longitud_destino,
    nombre_cliente: e.clientes ? `${e.clientes.nombre} ${e.clientes.apellido}` : e.cliente_temporal_nombre,
    client_location: e.direccion_destino,
    status: e.estado,
    tipo_paquete_nombre: e.tipos_paquete?.nombre || null,
    package_weight: e.peso_kg,
    tipo_parada: tipoParadaEnum.Values.entrega_cliente,
    orden: null, // Unassigned envíos don't have an order in a reparto yet
    envio_id_original: e.id,
  }));

  return { data: enviosMapa, count: count ?? 0, error: null };
}


export async function getEnviosGeolocalizadosAction(
  repartoId: string | null
): Promise<{ data: EnvioMapa[] | null; error: string | null }> {
  if (!repartoId || repartoId === "all") {
    // For "all", fetch all assigned envios that are geolocated. 
    // This could be very large, so consider pagination or more specific filters if needed.
    // For simplicity, we'll just fetch recent ones or limit.
    const { data, error } = await supabase
      .from("envios")
      .select(`
        id,
        direccion_origen, latitud_origen, longitud_origen,
        direccion_destino, latitud_destino, longitud_destino,
        estado,
        cliente_temporal_nombre,
        clientes!envios_remitente_cliente_id_fkey ( nombre, apellido ),
        tipos_paquete ( nombre ),
        peso_kg,
        paradas_reparto!inner ( orden_visita, reparto_id, repartos!inner ( repartidores ( nombre ), empresas ( nombre ), fecha_reparto ) )
      `)
      .not("latitud_destino", "is", null)
      .not("longitud_destino", "is", null)
      .not("paradas_reparto", "is", null) // Ensure it's part of a reparto
      .order("created_at", { ascending: false })
      .limit(100); // Limit for safety

    if (error) {
      console.error("Error fetching all geolocated assigned envios:", error);
      return { data: null, error: error.message };
    }
    const enviosMapa: EnvioMapa[] = (data as any[]).map(e => ({
      id: e.id!, // Use envio.id for the main ID here
      latitud: e.latitud_destino,
      longitud: e.longitud_destino,
      nombre_cliente: e.clientes ? `${e.clientes.nombre} ${e.clientes.apellido}` : e.cliente_temporal_nombre,
      client_location: e.direccion_destino,
      status: e.estado,
      tipo_paquete_nombre: e.tipos_paquete?.nombre || null,
      package_weight: e.peso_kg,
      tipo_parada: tipoParadaEnum.Values.entrega_cliente,
      orden: e.paradas_reparto?.[0]?.orden_visita ?? null,
      envio_id_original: e.id,
      reparto_id: e.paradas_reparto?.[0]?.reparto_id ?? null,
      repartidor_nombre: e.paradas_reparto?.[0]?.repartos?.repartidores?.nombre ?? null,
      empresa_nombre: e.paradas_reparto?.[0]?.repartos?.empresas?.nombre ?? null,
      fecha_reparto: e.paradas_reparto?.[0]?.repartos?.fecha_reparto ?? null,
    }));
    return { data: enviosMapa, error: null };

  } else if (repartoId === "unassigned") {
    const { data: unassignedData, error } = await getEnviosNoAsignadosGeolocalizadosAction();
    return { data: unassignedData, error };
  }

  // Fetch specific reparto and its paradas
  const { data: repartoData, error: repartoError } = await supabase
    .from("repartos")
    .select(`
      id,
      empresas (nombre, direccion, latitud, longitud),
      repartidores ( nombre ),
      fecha_reparto,
      paradas_reparto (
        id,
        orden_visita,
        descripcion_parada,
        estado_parada,
        envios (
          id,
          direccion_origen, latitud_origen, longitud_origen,
          direccion_destino, latitud_destino, longitud_destino,
          estado,
          cliente_temporal_nombre,
          clientes!envios_remitente_cliente_id_fkey ( nombre, apellido ),
          tipos_paquete ( nombre ),
          peso_kg
        )
      )
    `)
    .eq("id", repartoId)
    .single();

  if (repartoError || !repartoData) {
    console.error(`Error fetching reparto ${repartoId}:`, repartoError);
    return { data: null, error: repartoError?.message || "Reparto no encontrado." };
  }

  const reparto = repartoData as Reparto & {
    empresas: Pick<Empresa, 'nombre' | 'direccion' | 'latitud' | 'longitud'> | null,
    repartidores: Pick<Repartidor, 'nombre'> | null,
    paradas_reparto: (ParadaReparto & { envios: (Envio & { clientes: Pick<Cliente, 'nombre' | 'apellido'> | null, tipos_paquete: Pick<TipoPaquete, 'nombre'> | null}) | null })[]
  };

  const enviosMapa: EnvioMapa[] = [];

  // Add empresa pickup point if it exists and has coordinates (as "orden 0")
  if (reparto.empresas && reparto.empresas.latitud != null && reparto.empresas.longitud != null) {
    enviosMapa.push({
      id: `empresa_pickup_${reparto.id}`, 
      latitud: reparto.empresas.latitud,
      longitud: reparto.empresas.longitud,
      nombre_cliente: reparto.empresas.nombre,
      client_location: reparto.empresas.direccion,
      status: null, 
      tipo_paquete_nombre: null,
      package_weight: null,
      tipo_parada: tipoParadaEnum.Values.retiro_empresa,
      orden: 0, 
      reparto_id: reparto.id,
      repartidor_nombre: reparto.repartidores?.nombre || null,
      empresa_nombre: reparto.empresas.nombre,
      fecha_reparto: reparto.fecha_reparto,
    });
  }

  reparto.paradas_reparto.forEach(parada => {
    if (parada.envios && parada.envios.latitud_destino != null && parada.envios.longitud_destino != null) {
      enviosMapa.push({
        id: parada.id!, // Use parada_id as the unique key for map markers related to paradas
        latitud: parada.envios.latitud_destino,
        longitud: parada.envios.longitud_destino,
        nombre_cliente: parada.envios.clientes ? `${parada.envios.clientes.nombre} ${parada.envios.clientes.apellido}` : parada.envios.cliente_temporal_nombre,
        client_location: parada.envios.direccion_destino,
        status: parada.estado_parada, // Use parada.estado_parada for assigned envios
        tipo_paquete_nombre: parada.envios.tipos_paquete?.nombre || null,
        package_weight: parada.envios.peso_kg,
        tipo_parada: tipoParadaEnum.Values.entrega_cliente,
        orden: parada.orden_visita, // This should start from 1 for deliveries
        envio_id_original: parada.envios.id,
        reparto_id: reparto.id,
        repartidor_nombre: reparto.repartidores?.nombre || null,
        empresa_nombre: reparto.empresas?.nombre || null,
        fecha_reparto: reparto.fecha_reparto,
      });
    } else if (!parada.envios && parada.descripcion_parada && parada.descripcion_parada.toLowerCase().includes('retiro') && reparto.empresas?.latitud != null && reparto.empresas?.longitud != null) {
      // Handle explicit "Retiro en Empresa" paradas that might not have an envio_id
      // Only add if not already covered by the implicit company pickup point above
      if (!enviosMapa.some(e => e.id === `empresa_pickup_${reparto.id}` && e.tipo_parada === tipoParadaEnum.Values.retiro_empresa)) {
        enviosMapa.push({
            id: parada.id!, 
            latitud: reparto.empresas.latitud,
            longitud: reparto.empresas.longitud,
            nombre_cliente: reparto.empresas.nombre,
            client_location: reparto.empresas.direccion || parada.descripcion_parada,
            status: parada.estado_parada, 
            tipo_paquete_nombre: null,
            package_weight: null,
            tipo_parada: tipoParadaEnum.Values.retiro_empresa,
            orden: parada.orden_visita, // Could be 0 if it's the main pickup for a lote
            reparto_id: reparto.id,
            repartidor_nombre: reparto.repartidores?.nombre || null,
            empresa_nombre: reparto.empresas.nombre,
            fecha_reparto: reparto.fecha_reparto,
        });
      }
    }
  });
  
  // Sort by 'orden' to ensure consistent display and polyline drawing
  enviosMapa.sort((a,b) => (a.orden ?? Infinity) - (b.orden ?? Infinity));

  return { data: enviosMapa, error: null };
}

