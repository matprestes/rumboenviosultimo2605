
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapIcon, Loader2, PackageSearch, Route, Send, X, Sparkles } from "lucide-react"; // Corrected import
import { MapaEnviosComponent } from '@/components/mapa-envios-component';
import type { UnassignedEnvioListItem, ActiveRepartoListItem, Envio } from '@/lib/schemas';
import { getUnassignedEnviosForMapAction, getActiveRepartosWithDetailsAction, assignEnvioToRepartoAction } from '@/actions/reparto-actions';
import { useToast } from '@/hooks/use-toast';
import { haversineDistance } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SuggestedReparto extends ActiveRepartoListItem {
  distanceToEnvio?: number;
}

export default function MapaEnviosAsignacionPage() {
  const { toast } = useToast();
  const [unassignedEnvios, setUnassignedEnvios] = React.useState<UnassignedEnvioListItem[]>([]);
  const [activeRepartos, setActiveRepartos] = React.useState<ActiveRepartoListItem[]>([]);
  
  const [selectedEnvio, setSelectedEnvio] = React.useState<UnassignedEnvioListItem | null>(null);
  const [suggestedReparto, setSuggestedReparto] = React.useState<SuggestedReparto | null>(null);
  
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [isCalculatingSuggestion, setIsCalculatingSuggestion] = React.useState(false);
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [unassignedData, repartosData] = await Promise.all([
        getUnassignedEnviosForMapAction(),
        getActiveRepartosWithDetailsAction(),
      ]);
      setUnassignedEnvios(unassignedData);
      setActiveRepartos(repartosData);
    } catch (error) {
      toast({ title: "Error al cargar datos", description: "No se pudieron obtener envíos o repartos.", variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEnvioSelect = React.useCallback((envio: UnassignedEnvioListItem) => {
    if (!envio.latitud_destino || !envio.longitud_destino) {
        toast({ title: "Envío sin coordenadas", description: "Este envío no tiene coordenadas de destino válidas.", variant: "warning"});
        return;
    }
    setSelectedEnvio(envio);
    setIsCalculatingSuggestion(true);
    setSuggestedReparto(null);

    let closestReparto: SuggestedReparto | null = null;
    let minDistance = Infinity;

    const envioCoords = { lat: envio.latitud_destino, lng: envio.longitud_destino };

    activeRepartos.forEach(reparto => {
      if (reparto.estado === 'completado' || reparto.estado === 'cancelado') return;

      let currentRepartoMinDistance = Infinity;
      let repartoReferencePointTaken = false;

      // 1. Check distance to existing paradas' destinations
      if (reparto.paradas && reparto.paradas.length > 0) {
        for (const parada of reparto.paradas) {
          if (parada.envios?.latitud_destino && parada.envios?.longitud_destino) {
            const paradaCoords = { lat: parada.envios.latitud_destino, lng: parada.envios.longitud_destino };
            const dist = haversineDistance(envioCoords, paradaCoords);
            if (dist < currentRepartoMinDistance) {
              currentRepartoMinDistance = dist;
              repartoReferencePointTaken = true;
            }
          }
        }
      }
      
      // 2. If no paradas or to consider empresa origin for lote repartos
      if (reparto.empresas?.latitud && reparto.empresas?.longitud) {
         const empresaCoords = { lat: reparto.empresas.latitud, lng: reparto.empresas.longitud };
         const distToEmpresa = haversineDistance(envioCoords, empresaCoords);
         if (distToEmpresa < currentRepartoMinDistance) { // If closer than any parada or if no paradas
            currentRepartoMinDistance = distToEmpresa;
            repartoReferencePointTaken = true;
         }
      }
      
      if (repartoReferencePointTaken && currentRepartoMinDistance < minDistance) {
        minDistance = currentRepartoMinDistance;
        closestReparto = { ...reparto, distanceToEnvio: minDistance };
      }
    });

    setSuggestedReparto(closestReparto);
    setIsCalculatingSuggestion(false);
    if (closestReparto) {
        setIsAssignmentModalOpen(true);
    } else {
        toast({title: "Sugerencia", description: "No se encontraron repartos activos adecuados para sugerir.", variant: "default"});
    }
  }, [activeRepartos, toast]);

  const handleConfirmAssignment = async () => {
    if (!selectedEnvio || !selectedEnvio.id || !suggestedReparto || !suggestedReparto.id) return;
    
    setIsAssigning(true);
    const result = await assignEnvioToRepartoAction(selectedEnvio.id, suggestedReparto.id);
    setIsAssigning(false);

    if (result.success) {
      toast({ title: "Asignación Exitosa", description: `Envío ${selectedEnvio.id.substring(0,8)} asignado al reparto ${suggestedReparto.id.substring(0,8)}.` });
      setIsAssignmentModalOpen(false);
      setSelectedEnvio(null);
      setSuggestedReparto(null);
      fetchData(); // Refresh data on map
    } else {
      toast({ title: "Error de Asignación", description: result.error || "No se pudo asignar el envío.", variant: "destructive" });
    }
  };
  
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-var(--header-height,4rem)-2rem)] gap-4 p-1 md:p-0">
      {/* Sidebar for Unassigned Envíos */}
      <Card className="w-full md:w-1/3 lg:w-1/4 flex flex-col shadow-lg">
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <PackageSearch size={20} className="text-primary"/> Envíos No Asignados ({unassignedEnvios.length}) 
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-grow overflow-y-auto">
          {isLoadingData ? (
            <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
          ) : unassignedEnvios.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No hay envíos pendientes de asignación.</p>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
              {unassignedEnvios.map(envio => (
                <Button 
                  key={envio.id} 
                  variant={selectedEnvio?.id === envio.id ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto py-2 px-3 text-left"
                  onClick={() => handleEnvioSelect(envio)}
                >
                  <div className="flex-col items-start w-full">
                    <span className="font-semibold text-xs block">ID: {envio.id?.substring(0,8)}...</span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Dest: {envio.direccion_destino}
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Orig: {envio.direccion_origen}
                    </span>
                  </div>
                </Button>
              ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Main Map Area */}
      <div className="flex-grow h-full md:h-auto">
        <MapaEnviosComponent 
            unassignedEnvios={unassignedEnvios} 
            onUnassignedEnvioSelect={handleEnvioSelect}
            selectedEnvioId={selectedEnvio?.id}
        />
      </div>

      {/* Assignment Dialog */}
      <Dialog open={isAssignmentModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setIsAssignmentModalOpen(false);
            setSelectedEnvio(null); // Clear selection when closing
            setSuggestedReparto(null);
          } else {
             setIsAssignmentModalOpen(true);
          }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles size={20} className="text-primary" /> Asignar Envío
            </DialogTitle>
            <DialogDescription>
              Se ha encontrado un reparto sugerido para el envío seleccionado.
            </DialogDescription>
          </DialogHeader>
          {isCalculatingSuggestion && <div className="py-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary"/> <p>Calculando reparto más cercano...</p></div>}
          
          {selectedEnvio && suggestedReparto && !isCalculatingSuggestion && (
            <div className="space-y-3 py-2 text-sm">
              <p><strong>Envío ID:</strong> {selectedEnvio.id?.substring(0,8)}...</p>
              <p><strong>Destino Envío:</strong> {selectedEnvio.direccion_destino}</p>
              <hr/>
              <p className="font-semibold text-primary">Sugerencia de Reparto:</p>
              <p><strong>Reparto ID:</strong> {suggestedReparto.id?.substring(0,8)}...</p>
              <p><strong>Repartidor:</strong> {suggestedReparto.repartidores?.nombre || 'N/A'}</p>
              <p><strong>Fecha Reparto:</strong> {suggestedReparto.fecha_reparto ? format(new Date(suggestedReparto.fecha_reparto), "PPP", {locale: es}) : 'N/A'}</p>
              <p><strong>Paradas Actuales:</strong> {suggestedReparto.paradas?.length || 0}</p>
              {suggestedReparto.distanceToEnvio !== undefined && <p><strong>Distancia Estimada:</strong> {suggestedReparto.distanceToEnvio.toFixed(2)} km</p>}
            </div>
          )}
          {!suggestedReparto && !isCalculatingSuggestion && selectedEnvio && (
            <p className="py-4 text-muted-foreground">No se encontraron repartos adecuados para este envío.</p>
          )}

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isAssigning}>
                <X className="mr-2 h-4 w-4"/> Cancelar
              </Button>
            </DialogClose>
            <Button 
              type="button" 
              onClick={handleConfirmAssignment} 
              disabled={!suggestedReparto || isAssigning || isCalculatingSuggestion}
            >
              {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Asignar a este Reparto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
