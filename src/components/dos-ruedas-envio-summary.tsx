
"use client";

import * as React from 'react';
import type { DosRuedasCalculatedShipment } from '@/lib/schemas';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, MapPin, Phone, Truck, CalendarDays, DollarSign, Milestone, Info, MessageSquare } from 'lucide-react';

interface DosRuedasEnvioSummaryProps {
  data: DosRuedasCalculatedShipment | null;
}

export function DosRuedasEnvioSummary({ data }: DosRuedasEnvioSummaryProps) {
  if (!data) {
    return null;
  }

  return (
    <Card className="mt-8 shadow-lg border-primary rounded-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
          <Truck size={28} /> Resumen del Pedido
        </CardTitle>
        <CardDescription>Verifica los detalles de tu envío antes de confirmar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {/* Origen */}
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold text-md text-foreground flex items-center gap-2"><MapPin className="text-blue-500" size={20}/> Origen (Retiro)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            <p className="flex items-center gap-1.5"><User size={16} className="text-muted-foreground"/> <strong>Remitente:</strong> {data.remitenteNombre}</p>
            <p className="flex items-center gap-1.5"><Phone size={16} className="text-muted-foreground"/> <strong>Teléfono:</strong> {data.remitenteTelefono || 'N/A'}</p>
          </div>
          <p><strong className="text-muted-foreground">Dirección:</strong> {data.remitenteDireccion}</p>
        </div>

        <Separator />

        {/* Destino */}
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold text-md text-foreground flex items-center gap-2"><MapPin className="text-red-500" size={20}/> Destino (Entrega)</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            <p className="flex items-center gap-1.5"><User size={16} className="text-muted-foreground"/> <strong>Destinatario:</strong> {data.destinatarioNombre}</p>
            <p className="flex items-center gap-1.5"><Phone size={16} className="text-muted-foreground"/> <strong>Teléfono:</strong> {data.destinatarioTelefono}</p>
          </div>
          <p><strong className="text-muted-foreground">Dirección:</strong> {data.destinatarioDireccion}</p>
        </div>

        <Separator />

        {/* Detalles del Servicio */}
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold text-md text-foreground flex items-center gap-2"><Truck size={20} className="text-muted-foreground"/> Detalles del Servicio</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            <p><strong>Servicio:</strong> {data.tipoServicioNombre}</p>
            <p className="flex items-center gap-1.5"><Milestone size={16} className="text-muted-foreground"/> <strong>Distancia:</strong> {data.distanciaKm !== null ? `${data.distanciaKm.toFixed(2)} km` : 'Calculando...'}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            <p className="flex items-center gap-1.5"><CalendarDays size={16} className="text-muted-foreground"/> <strong>Retiro Desde:</strong> {data.horarioRetiro || 'N/A'}</p>
            <p className="flex items-center gap-1.5"><CalendarDays size={16} className="text-muted-foreground"/> <strong>Entrega Hasta:</strong> {data.horarioEntrega || 'N/A'}</p>
          </div>
          {data.detallesAdicionales && (
            <p className="flex items-start gap-1.5 pt-1">
                <MessageSquare size={16} className="text-muted-foreground mt-0.5 shrink-0"/> 
                <div>
                    <strong className="text-muted-foreground">Notas Adicionales:</strong>
                    <span className="block text-foreground whitespace-pre-wrap">{data.detallesAdicionales}</span>
                </div>
            </p>
          )}
        </div>
        
        <Separator />

        {/* Costo */}
        <div className="text-center p-4 rounded-lg bg-primary/10">
          <p className="text-sm text-primary font-medium mb-1">{data.calculationMethod || "Costo estimado del envío"}</p>
          <p className="text-3xl font-bold text-primary">
            ${data.precioCalculado.toFixed(2)}
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          Un operador se comunicará vía WhatsApp para confirmar el pedido, el valor final y compartir el seguimiento.
        </p>
      </CardFooter>
    </Card>
  );
}
