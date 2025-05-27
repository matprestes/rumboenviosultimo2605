
"use client";

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DosRuedasEnvioFormSchema, type DosRuedasEnvioFormValues, type Cliente, type TipoServicio } from '@/lib/schemas';
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
import { Loader2, MapPin, CheckCircle, AlertTriangle, User, Truck } from 'lucide-react';
import { geocodeAddress, type GeocodeResult, getGoogleMapsApi } from '@/services/google-maps-service';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface DosRuedasEnvioFormProps {
  onSubmit: (data: DosRuedasEnvioFormValues) => Promise<{ success: boolean; error?: string; data?: any }>;
  clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'telefono' | 'latitud' | 'longitud'>[];
  tiposServicio: TipoServicio[];
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
}

export function DosRuedasEnvioForm({
  onSubmit,
  clientes,
  tiposServicio,
  isSubmitting,
  setIsSubmitting,
}: DosRuedasEnvioFormProps) {
  const { toast } = useToast();
  const [isMapsApiReady, setIsMapsApiReady] = React.useState(false);
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
      tipo_servicio_id: tiposServicio.length > 0 ? tiposServicio[0].id : '',
      horario_retiro_desde: "",
      horario_entrega_hasta: "",
      precio: 0, // Will be calculated, made read-only
      detalles_adicionales: "",
    },
  });
  
  React.useEffect(() => {
    getGoogleMapsApi()
      .then(() => setIsMapsApiReady(true))
      .catch((error) => {
        console.error("Failed to load Google Maps API in DosRuedasEnvioForm:", error);
        toast({
          title: "Error de Mapa",
          description: "No se pudo cargar la API de Google Maps. La geocodificación no estará disponible.",
          variant: "destructive",
        });
      });
  }, [toast]);

  const selectedSenderId = form.watch('remitente_cliente_id');
  const selectedTipoServicioId = form.watch('tipo_servicio_id');

  React.useEffect(() => {
    const cliente = clientes.find(c => c.id === selectedSenderId);
    setSelectedSender(cliente || null);
  }, [selectedSenderId, clientes]);

  // Placeholder for price calculation logic
  React.useEffect(() => {
    if (selectedSender && selectedSender.latitud && selectedSender.longitud && 
        geocodedDest && geocodedDest.lat && geocodedDest.lng && 
        selectedTipoServicioId) {
      // TODO: Implement actual price calculation here
      // 1. Calculate distance (Haversine or Google Distance Matrix)
      // 2. Fetch tariffs for selectedTipoServicioId
      // 3. Apply logic to find matching tariff and calculate price
      console.log("Trigger price calculation for:", {
        sender: selectedSender.direccion,
        recipient: geocodedDest.formattedAddress,
        service: selectedTipoServicioId,
      });
      // For now, just set a placeholder or keep it 0
      form.setValue('precio', 0); // Or some calculated placeholder
      toast({
        title: "Precio Estimado",
        description: "El cálculo automático de precio se implementará aquí.",
        variant: "default"
      })
    }
  }, [selectedSender, geocodedDest, selectedTipoServicioId, form, toast]);


  const handleGeocodeDest = async () => {
    if (!isMapsApiReady) {
      toast({ title: "API de Mapas no lista", description: "Espere a que cargue.", variant: "default" });
      return;
    }
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
        form.setValue("direccion_destino", result.formattedAddress, { shouldValidate: true });
        setGeocodedDest(result); 
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
    if (!selectedSender.latitud || !selectedSender.longitud) {
      toast({title: "Error de Remitente", description: "El cliente remitente no tiene coordenadas. Por favor, actualice los datos del cliente.", variant: "destructive"});
      return;
    }
     if (!geocodedDest || !geocodedDest.lat || !geocodedDest.lng) {
      toast({title: "Error de Destinatario", description: "La dirección de destino no ha sido geocodificada. Por favor, verifíquela.", variant: "destructive"});
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit(formData); 
    setIsSubmitting(false);
     if (result.success) {
      form.reset({ 
        remitente_cliente_id: '',
        nombre_destinatario: '',
        telefono_destinatario: '',
        direccion_destino: '',
        tipo_servicio_id: tiposServicio.length > 0 ? tiposServicio[0].id : '',
        horario_retiro_desde: "",
        horario_entrega_hasta: "",
        precio: 0,
        detalles_adicionales: "",
      });
      setSelectedSender(null);
      setGeocodedDest(null);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-6">
        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><User className="text-primary" /> Información de Quién Envía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="remitente_cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de quien envía*</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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

        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><User className="text-accent" /> Información de Quién Recibe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nombre_destinatario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de quien recibe*</FormLabel>
                  <FormControl><Input placeholder="Ej: Ana Gonzalez" {...field} value={field.value ?? ""} /></FormControl>
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
                  <FormControl><Input type="tel" placeholder="Ej: +542236602699" {...field} value={field.value ?? ""} /></FormControl>
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
                    <FormControl className="flex-grow"><Input placeholder="Ej: 11 de Septiembre 3687, Mar del Plata" {...field} value={field.value ?? ""} /></FormControl>
                    <Button type="button" onClick={handleGeocodeDest} disabled={isGeocodingDest || !isMapsApiReady} variant="outline" size="icon" title="Verificar Dirección">
                      {isGeocodingDest ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    </Button>
                  </div>
                  {!isMapsApiReady && <FormDescription className="text-orange-600">API de Mapas no disponible.</FormDescription>}
                  {geocodedDest?.formattedAddress && <FormDescription className="text-green-600 flex items-center gap-1 mt-1"><CheckCircle size={16} /> Dirección verificada: {geocodedDest.formattedAddress}</FormDescription>}
                  {!isGeocodingDest && form.formState.dirtyFields.direccion_destino && !geocodedDest?.formattedAddress && <FormDescription className="text-orange-600 flex items-center gap-1 mt-1"><AlertTriangle size={16}/> Verifique la dirección.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader><CardTitle className="flex items-center text-lg gap-2"><Truck className="text-primary"/>Detalles del Servicio y Envío</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="tipo_servicio_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Servicio*</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un tipo de servicio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tiposServicio.map((servicio) => (
                        <SelectItem key={servicio.id} value={servicio.id!}>
                          {servicio.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="horario_retiro_desde"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horario inicial de retiro (HH:MM)</FormLabel>
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
                    <FormLabel>Horario límite de entrega (HH:MM)</FormLabel>
                    <FormControl><Input placeholder="Ej: 18:00" {...field} value={field.value ?? ""} /></FormControl>
                    <FormDescription>Hasta que hora se puede entregar.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="precio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a cobrar (Estimado)</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} 
                    readOnly 
                    className="bg-muted/80 cursor-not-allowed"
                    value={field.value ?? 0}
                  /></FormControl>
                  <FormDescription>El precio se calculará y confirmará.</FormDescription>
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

        <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white" disabled={isSubmitting || isGeocodingDest || !isMapsApiReady}>
          {(isSubmitting || isGeocodingDest) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Hacer pedido
        </Button>
      </form>
    </Form>
  );
}
