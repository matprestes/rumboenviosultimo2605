
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapIcon, Loader2, Filter } from "lucide-react";
import { MapaEnviosComponent } from '@/components/mapa-envios-component';
import type { Envio, Reparto, Repartidor, ParadaReparto } from '@/lib/schemas';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EnvioExtendido extends Envio {
  // Potential future fields like cliente_nombre, etc.
}

export interface RepartoConNombre extends Reparto {
  repartidor_nombre?: string;
  display_name: string;
}

export default function MapaEnviosPage() {
  const { toast } = useToast();
  const [allEnvios, setAllEnvios] = React.useState<EnvioExtendido[]>([]);
  const [filteredEnvios, setFilteredEnvios] = React.useState<EnvioExtendido[]>([]);
  const [repartosList, setRepartosList] = React.useState<RepartoConNombre[]>([]);
  const [paradas, setParadas] = React.useState<ParadaReparto[]>([]);
  
  const [selectedRepartoId, setSelectedRepartoId] = React.useState<string>("todos");
  
  const [isLoadingEnvios, setIsLoadingEnvios] = React.useState(true);
  const [isLoadingRepartos, setIsLoadingRepartos] = React.useState(true);
  const [isLoadingParadas, setIsLoadingParadas] = React.useState(true);

  const isLoading = isLoadingEnvios || isLoadingRepartos || isLoadingParadas;

  React.useEffect(() => {
    const fetchEnvios = async () => {
      setIsLoadingEnvios(true);
      const { data, error } = await supabase
        .from('envios')
        .select('*')
        .not('latitud_destino', 'is', null)
        .not('longitud_destino', 'is', null);

      if (error) {
        toast({ title: "Error al cargar envíos", description: error.message, variant: "destructive" });
        setAllEnvios([]);
      } else {
        setAllEnvios(data || []);
      }
      setIsLoadingEnvios(false);
    };

    const fetchRepartosYRepartidores = async () => {
      setIsLoadingRepartos(true);
      const { data: repartosData, error: repartosError } = await supabase
        .from('repartos')
        .select(`
          *,
          repartidores (
            id,
            nombre
          )
        `)
        .order('fecha_reparto', { ascending: false });

      if (repartosError) {
        toast({ title: "Error al cargar repartos", description: repartosError.message, variant: "destructive" });
        setRepartosList([]);
      } else {
        const formattedRepartos = repartosData?.map(r => {
          const repartidor = r.repartidores as unknown as Repartidor | null; // Type assertion
          return {
            ...r,
            repartidor_nombre: repartidor?.nombre || 'N/A',
            display_name: `Reparto #${r.id.substring(0,4)} (${new Date(r.fecha_reparto).toLocaleDateString()}) - ${repartidor?.nombre || 'Sin repartidor'}`,
          };
        }) || [];
        setRepartosList(formattedRepartos);
      }
      setIsLoadingRepartos(false);
    };

    const fetchParadas = async () => {
      setIsLoadingParadas(true);
      const { data, error } = await supabase.from('paradas_reparto').select('*');
      if (error) {
        toast({ title: "Error al cargar paradas de reparto", description: error.message, variant: "destructive" });
        setParadas([]);
      } else {
        setParadas(data || []);
      }
      setIsLoadingParadas(false);
    }

    fetchEnvios();
    fetchRepartosYRepartidores();
    fetchParadas();
  }, [toast]);

  React.useEffect(() => {
    if (selectedRepartoId === "todos") {
      setFilteredEnvios(allEnvios);
    } else {
      const enviosDelRepartoIds = paradas
        .filter(p => p.reparto_id === selectedRepartoId)
        .map(p => p.envio_id);
      
      const uniqueEnvioIds = Array.from(new Set(enviosDelRepartoIds));
      
      setFilteredEnvios(allEnvios.filter(envio => envio.id && uniqueEnvioIds.includes(envio.id)));
    }
  }, [selectedRepartoId, allEnvios, paradas]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <MapIcon size={32} />
          Mapa de Envíos
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualiza los envíos asignados y no asignados en Mar del Plata.
        </p>
      </header>
      
      <Card className="flex-grow flex flex-col">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Visualización Geográfica de Envíos</CardTitle>
              <CardDescription>
                Filtra por reparto para ver envíos específicos o selecciona "Todos" para ver todos los envíos con coordenadas.
              </CardDescription>
            </div>
            <div className="w-full sm:w-auto min-w-[250px]">
              <Select 
                onValueChange={setSelectedRepartoId} 
                defaultValue="todos"
                disabled={isLoadingRepartos || isLoadingParadas}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Filter size={16} />
                    <SelectValue placeholder="Filtrar por reparto..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los Envíos</SelectItem>
                  {repartosList.map(reparto => (
                    <SelectItem key={reparto.id} value={reparto.id!}>
                      {reparto.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow relative">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col justify-center items-center bg-background/80 z-10">
              <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Cargando datos del mapa y envíos...</p>
            </div>
          ) : (
            <MapaEnviosComponent envios={filteredEnvios} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
