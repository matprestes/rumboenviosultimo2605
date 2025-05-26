
"use client";

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DosRuedasEnvioFormSchema, type DosRuedasEnvioFormValues, type Cliente } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, MapPin, CheckCircle, AlertTriangle, User } from 'lucide-react';
import { geocodeAddress, type GeocodeResult } from '@/services/google-maps-service';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

interface DosRuedasEnvioFormProps {
  onSubmit: (data: DosRuedasEnvioFormValues) => Promise<{ success: boolean; error?: string; data?: any }>;
  clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'telefono' | 'latitud' | 'longitud'>[];
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
}

export function DosRuedasEnvioForm({
  onSubmit,
  clientes,
  isSubmitting,
  setIsSubmitting,
}: DosRuedasEnvioFormProps) {
  const { toast } = useToast();
  const [isGeocodingDest, setIsGeocodingDest] = React.useState(false);
  const [geocodedDest, setGeocodedDest] = React.useState<GeocodeResult | null>(null);
  
  const [selectedSender, setSelectedSender] = React.useState<Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'telefono' | 'latitud' | 'longitud'> | null>(null);

  const form = useForm<DosRuedasEnvioFormValues>({
    resolver: zodResolver(DosRuedasEnvioFormSchema),
    defaultValues: {
      remitente_cliente_id: '',
      nombre_destinatario: '',
      telefono_destinatario: '',
      direccion_destino: '',
      horario_retiro_desde: '',
      horario_entrega_hasta: '',
      precio: 0,
      detalles_adicionales: '',
    },
  });

  const handleSenderChange = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    setSelectedSender(cliente || null);
    if (cliente) {
      form.setValue('remitente_cliente_id', cliente.id!, { shouldValidate: true });
      // The form will display sender info based on `selectedSender` state
      // `direccion_origen` and its coordinates will be passed to the action from `selectedSender`
    } else {
      form.setValue('remitente_cliente_id', '', { shouldValidate: true });
    }
  };

  const handleGeocodeDest = async () => {
    const addressValue = form.getValues("direccion_destino");
    if (!addressValue || addressValue.trim().length < 5) {
      toast({ title: "Error de Dirección", description: "Por favor, ingrese una dirección de entrega más completa.", variant: "destructive" });
      return;
    }
    setIsGeocodingDest(true);
    setGeocodedDest(null);
    try {
      const result = await geocodeAddress(addressValue);
      if (result) {
        // Lat/lng for destination will be passed to the action, not directly set in this form's state
        // but we can update the address field to the formatted one
        form.setValue("direccion_destino", result.formattedAddress, { shouldValidate: true });
        setGeocodedDest(result); // Store for feedback
        toast({ title: "Geocodificación Exitosa", description: `Dirección de entrega verificada: ${result.formattedAddress}` });
      } else {
        toast({ title: "Error de Geocodificación", description: "No se pudo encontrar la dirección de entrega o está fuera de Mar del Plata.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error de Geocodificación", description: "Ocurrió un error al procesar la dirección de entrega.", variant: "destructive" });
    } finally {
      setIsGeocodingDest(false);
    }
  };

  const processSubmit = async (formData: DosRuedasEnvioFormValues) => {
    if (!selectedSender || !selectedSender.id) {
        toast({title: "Error de Remitente", description: "Por favor, seleccione un remitente.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);
    // The action will handle fetching full sender details and merging
    await onSubmit(formData); 
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="text-primary" /> Información de Quién Envía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="remitente_cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de quien envía*</FormLabel>
                  <Select onValueChange={(value) => { field.onChange(value); handleSenderChange(value); }} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un cliente remitente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id!}>
                          {cliente.nombre} {cliente.apellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedSender && (
              <>
                <FormItem>
                  <FormLabel>Teléfono (Remitente)</FormLabel>
                  <Input value={selectedSender.telefono || 'N/A'} readOnly disabled className="bg-muted/50"/>
                </FormItem>
                <FormItem>
                  <FormLabel>Dirección de retiro*</FormLabel>
                  <Input value={selectedSender.direccion || 'N/A'} readOnly disabled className="bg-muted/50"/>
                   {selectedSender.latitud && selectedSender.longitud ? (
                     <FormDescription className="text-green-600 flex items-center gap-1 mt-1"><CheckCircle size={16}/> Dirección verificada.</FormDescription>
                   ) : (
                     <FormDescription className="text-orange-600 flex items-center gap-1 mt-1"><AlertTriangle size={16}/> Cliente sin coordenadas. Contactar admin.</FormDescription>
                   )}
                </FormItem>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="text-accent" /> Información de Quién Recibe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nombre_destinatario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de quien recibe*</FormLabel>
                  <FormControl><Input placeholder="Ej: Ana Gonzalez" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono_destinatario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono (Destinatario)*</FormLabel>
                  <FormControl><Input type="tel" placeholder="Ej: +542236602699" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direccion_destino"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección de entrega*</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl className="flex-grow"><Input placeholder="Ej: 11 de Septiembre 3687, Mar del Plata" {...field} /></FormControl>
                    <Button type="button" onClick={handleGeocodeDest} disabled={isGeocodingDest} variant="outline" size="icon" title="Verificar Dirección">
                      {isGeocodingDest ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    </Button>
                  </div>
                  {geocodedDest?.formattedAddress && <FormDescription className="text-green-600 flex items-center gap-1 mt-1"><CheckCircle size={16} /> Dirección verificada: {geocodedDest.formattedAddress}</FormDescription>}
                  {!isGeocodingDest && form.formState.dirtyFields.direccion_destino && !geocodedDest?.formattedAddress && <FormDescription className="text-orange-600 flex items-center gap-1 mt-1"><AlertTriangle size={16}/> Verifique la dirección.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader><CardTitle>Detalles del Envío</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="horario_retiro_desde"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horario inicial de retiro* (HH:MM)</FormLabel>
                    <FormControl><Input placeholder="Ej: 09:00" {...field} value={field.value ?? ""} /></FormControl>
                    <FormDescription>Desde que hora se puede retirar.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="horario_entrega_hasta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horario límite de entrega* (HH:MM)</FormLabel>
                    <FormControl><Input placeholder="Ej: 18:00" {...field} value={field.value ?? ""} /></FormControl>
                    <FormDescription>Hasta que hora se puede entregar.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="precio" // "Monto a cobrar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a cobrar*</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="detalles_adicionales"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalles adicionales</FormLabel>
                  <FormControl><Textarea placeholder="Instrucciones especiales..." {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white" disabled={isSubmitting || isGeocodingDest}>
          {isSubmitting || isGeocodingDest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Hacer pedido
        </Button>
      </form>
    </Form>
  );
}

