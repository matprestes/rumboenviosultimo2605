
"use client";

import * as React from 'react';
import type { DosRuedasCalculatedShipment } from '@/lib/schemas';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User, MapPin, Phone, Truck, CalendarDays, DollarSign, Milestone, Info, MessageSquare, Send, Loader2 } from 'lucide-react';

interface DosRuedasEnvioSummaryProps {
  data: DosRuedasCalculatedShipment | null;
  onConfirmAndSubmit: () => void;
  isSubmitting: boolean;
}

export function DosRuedasEnvioSummary({ data, onConfirmAndSubmit, isSubmitting }: DosRuedasEnvioSummaryProps) {
  if (!data) {
    return null;
  }

  return (
    <Card className="mt-8 shadow-xl rounded-2xl border-2 border-primary animate-in fade-in-50 duration-500">
      <CardHeader className="pb-4 bg-primary/5">
        <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
          <Truck size={28} /> Resumen del Pedido
        </CardTitle>
        <CardDescription>Verifica los detalles de tu envío antes de confirmar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 text-sm pt-5">
        {/* Origen */}
        <div className="space-y-1 p-3 bg-muted/40 rounded-lg border border-input">
          <h3 className="font-semibold text-md text-foreground flex items-center gap-2"><MapPin className="text-blue-600" size={18}/> Origen (Retiro)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <p className="flex items-center gap-1.5"><User size={14} className="text-muted-foreground"/> <strong>Remitente:</strong> {data.remitenteNombre}</p>
            <p className="flex items-center gap-1.5"><Phone size={14} className="text-muted-foreground"/> <strong>Teléfono:</strong> {data.remitenteTelefono || 'N/A'}</p>
          </div>
          <p className="text-xs"><strong className="text-muted-foreground">Dirección:</strong> {data.remitenteDireccion}</p>
        </div>

        <Separator />

        {/* Destino */}
        <div className="space-y-1 p-3 bg-muted/40 rounded-lg border border-input">
          <h3 className="font-semibold text-md text-foreground flex items-center gap-2"><MapPin className="text-red-600" size={18}/> Destino (Entrega)</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <p className="flex items-center gap-1.5"><User size={14} className="text-muted-foreground"/> <strong>Destinatario:</strong> {data.destinatarioNombre}</p>
            <p className="flex items-center gap-1.5"><Phone size={14} className="text-muted-foreground"/> <strong>Teléfono:</strong> {data.destinatarioTelefono}</p>
          </div>
          <p className="text-xs"><strong className="text-muted-foreground">Dirección:</strong> {data.destinatarioDireccion}</p>
        </div>

        <Separator />

        {/* Detalles del Servicio */}
        <div className="space-y-2 p-3 bg-muted/40 rounded-lg border border-input">
          <h3 className="font-semibold text-md text-foreground flex items-center gap-2"><Truck size={18} className="text-muted-foreground"/> Detalles del Servicio</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <p><strong>Servicio:</strong> {data.tipoServicioNombre}</p>
            <p className="flex items-center gap-1.5"><Milestone size={14} className="text-muted-foreground"/> <strong>Distancia:</strong> {data.distanciaKm !== null ? `${data.distanciaKm.toFixed(2)} km` : 'Calculando...'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <p className="flex items-center gap-1.5"><CalendarDays size={14} className="text-muted-foreground"/> <strong>Retiro Desde:</strong> {data.horarioRetiro || 'N/A'}</p>
            <p className="flex items-center gap-1.5"><CalendarDays size={14} className="text-muted-foreground"/> <strong>Entrega Hasta:</strong> {data.horarioEntrega || 'N/A'}</p>
          </div>
          {data.detallesAdicionales && (
            <p className="flex items-start gap-1.5 pt-1 text-xs">
                <MessageSquare size={14} className="text-muted-foreground mt-0.5 shrink-0"/> 
                <div>
                    <strong className="text-muted-foreground">Notas Adicionales:</strong>
                    <span className="block text-foreground whitespace-pre-wrap">{data.detallesAdicionales}</span>
                </div>
            </p>
          )}
        </div>
        
        <Separator />

        {/* Costo */}
        <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-primary font-medium mb-0.5">{data.calculationMethod || "Costo estimado del envío"}</p>
          <p className="text-3xl font-bold text-primary">
            ${data.precioCalculado.toFixed(2)}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-center gap-3 pt-4">
        <Button 
          onClick={onConfirmAndSubmit} 
          disabled={isSubmitting || !data} 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          size="lg"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Confirmar y Hacer Pedido
        </Button>
        <p className="text-xs text-muted-foreground text-center w-full mt-2">
          Un operador se comunicará vía WhatsApp para confirmar el pedido, el valor final y compartir el seguimiento.
        </p>
      </CardFooter>
    </Card>
  );
}
