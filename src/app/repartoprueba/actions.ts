
// src/app/repartoprueba/actions.ts
"use server";

import { supabase } from "@/lib/supabase/client";
import type { RepartoParaFiltro, EnvioMapa, TipoParada } from "@/types/supabase";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export async function getRepartosForMapFilterAction(): Promise<{ data: RepartoParaFiltro[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("repartos")
    .select(`
      id,
      fecha_reparto,
      repartidores ( nombre ),
      empresas ( nombre )
    `)
    .order("fecha_reparto", { ascending: false })
    .limit(50); // Limit to avoid fetching too many

  if (error) {
    console.error("Error fetching repartos for map filter:", error);
    return { data: null, error: error.message };
  }

  const formattedData: RepartoParaFiltro[] = data.map((r) => {
    const fecha = r.fecha_reparto ? format(parseISO(r.fecha_reparto), "dd/MM", { locale: es }) : "Sin Fecha";
    const repartidor = r.repartidores?.nombre || "N/A";
    const empresa = r.empresas?.nombre;
    let label = `${fecha} - ${repartidor}`;
    let tipo_reparto: RepartoParaFiltro['tipo_reparto'] = 'individual';

    if (empresa) {
      label += ` (${empresa})`;
      tipo_reparto = 'viaje_empresa_lote'; // Or 'viaje_empresa' depending on more specific logic
    }
    return {
      id: r.id,
      label: label,
      tipo_reparto: tipo_reparto,
      empresa_nombre: empresa,
      repartidor_nombre: repartidor,
      fecha_reparto: r.fecha_reparto
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
    .eq("estado", "pendiente_asignacion")
    .not("latitud_destino", "is", null)
    .not("longitud_destino", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching unassigned geolocated envios:", error);
    return { data: null, count: 0, error: error.message };
  }

  const enviosMapa: EnvioMapa[] = data.map(e => ({
    id: e.id,
    latitud: e.latitud_destino,
    longitud: e.longitud_destino,
    nombre_cliente: e.clientes ? `${e.clientes.nombre} ${e.clientes.apellido}` : e.cliente_temporal_nombre,
    client_location: e.direccion_destino,
    status: e.estado,
    tipo_paquete_nombre: e.tipos_paquete?.nombre || null,
    package_weight: e.peso_kg,
    tipo_parada: 'entrega_cliente', // Assuming these are all deliveries
    orden: null, // No order for unassigned items in this context
    envio_id_original: e.id,
  }));

  return { data: enviosMapa, count: count ?? 0, error: null };
}


export async function getEnviosGeolocalizadosAction(
  repartoId: string | null
): Promise<{ data: EnvioMapa[] | null; error: string | null }> {
  if (!repartoId || repartoId === "all") {
    // Fetch all geolocated envios (assigned or not, might need refinement based on exact 'all' definition)
    // For now, let's interpret "all" as all assigned to *any* reparto + unassigned
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
        paradas_reparto ( orden_visita, reparto_id, repartos ( repartidores ( nombre ), empresas ( nombre ), fecha_reparto ) )
      `)
      .not("latitud_destino", "is", null) // Ensure destination is geolocated
      .order("created_at", { ascending: false })
      .limit(100); // Limit for safety

    if (error) {
      console.error("Error fetching all geolocated envios:", error);
      return { data: null, error: error.message };
    }
    const enviosMapa: EnvioMapa[] = data.map(e => ({
      id: e.id, // Use envio id
      latitud: e.latitud_destino,
      longitud: e.longitud_destino,
      nombre_cliente: e.clientes ? `${e.clientes.nombre} ${e.clientes.apellido}` : e.cliente_temporal_nombre,
      client_location: e.direccion_destino,
      status: e.estado,
      tipo_paquete_nombre: e.tipos_paquete?.nombre || null,
      package_weight: e.peso_kg,
      tipo_parada: 'entrega_cliente',
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

  // Fetch envios for a specific reparto
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

  const enviosMapa: EnvioMapa[] = [];

  // Add empresa origin if it's a lote reparto with coordinates
  if (repartoData.empresas && repartoData.empresas.latitud && repartoData.empresas.longitud) {
    enviosMapa.push({
      id: `empresa_pickup_${repartoData.id}`,
      latitud: repartoData.empresas.latitud,
      longitud: repartoData.empresas.longitud,
      nombre_cliente: repartoData.empresas.nombre,
      client_location: repartoData.empresas.direccion,
      status: null, // Or a specific status for pickup points
      tipo_paquete_nombre: null,
      package_weight: null,
      tipo_parada: 'retiro_empresa',
      orden: 0, // Typically pickup is order 0 or 1
      reparto_id: repartoData.id,
      repartidor_nombre: repartoData.repartidores?.nombre || null,
      empresa_nombre: repartoData.empresas.nombre,
      fecha_reparto: repartoData.fecha_reparto,
    });
  }

  repartoData.paradas_reparto.forEach(parada => {
    if (parada.envios && parada.envios.latitud_destino && parada.envios.longitud_destino) {
      enviosMapa.push({
        id: parada.id, // Use parada_id as unique key for map markers of this reparto
        latitud: parada.envios.latitud_destino,
        longitud: parada.envios.longitud_destino,
        nombre_cliente: parada.envios.clientes ? `${parada.envios.clientes.nombre} ${parada.envios.clientes.apellido}` : parada.envios.cliente_temporal_nombre,
        client_location: parada.envios.direccion_destino,
        status: parada.estado_parada,
        tipo_paquete_nombre: parada.envios.tipos_paquete?.nombre || null,
        package_weight: parada.envios.peso_kg,
        tipo_parada: 'entrega_cliente',
        orden: parada.orden_visita,
        envio_id_original: parada.envios.id,
        reparto_id: repartoData.id,
        repartidor_nombre: repartoData.repartidores?.nombre || null,
        empresa_nombre: repartoData.empresas?.nombre || null,
        fecha_reparto: repartoData.fecha_reparto,
      });
    } else if (!parada.envios && parada.descripcion_parada && repartoData.empresas?.latitud && repartoData.empresas?.longitud && parada.descripcion_parada.toLowerCase().includes('retiro')) {
      // This handles the case where a parada is explicitly for "Retiro en empresa"
      // and the empresa origin wasn't already added (e.g. if empresa_asociada_id wasn't set on reparto but this stop exists)
      // To avoid duplication, we check if a pickup for this empresa was already added.
      if (!enviosMapa.some(e => e.id === `empresa_pickup_${repartoData.id}` && e.tipo_parada === 'retiro_empresa')) {
        enviosMapa.push({
            id: parada.id,
            latitud: repartoData.empresas.latitud,
            longitud: repartoData.empresas.longitud,
            nombre_cliente: repartoData.empresas.nombre,
            client_location: repartoData.empresas.direccion || parada.descripcion_parada,
            status: parada.estado_parada,
            tipo_paquete_nombre: null,
            package_weight: null,
            tipo_parada: 'retiro_empresa',
            orden: parada.orden_visita,
            reparto_id: repartoData.id,
            repartidor_nombre: repartoData.repartidores?.nombre || null,
            empresa_nombre: repartoData.empresas.nombre,
            fecha_reparto: repartoData.fecha_reparto,
        });
      }
    }
  });
  
  // Sort by order for display
  enviosMapa.sort((a,b) => (a.orden ?? Infinity) - (b.orden ?? Infinity));

  return { data: enviosMapa, error: null };
}
