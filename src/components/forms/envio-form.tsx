
"use client";

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EnvioSchema, type Envio, type Cliente, type Empresa, type TipoPaquete, type TipoServicio, EstadoEnvioEnum } from '@/lib/schemas';
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, MapPin, CheckCircle, AlertTriangle, UserPlus, Building } from 'lucide-react';
import { geocodeAddress, type GeocodeResult, getGoogleMapsApi } from '@/services/google-maps-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
// Removed import for Separator as it's not used.

interface EnvioFormProps {
  onSubmit: (data: Envio) => Promise<{ success: boolean; error?: string; data?: Envio }>;
  defaultValues?: Partial<Envio>;
  clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido'>[];
  empresas: Pick<Empresa, 'id' | 'nombre'>[];
  tiposPaquete: TipoPaquete[];
  tiposServicio: TipoServicio[];
  isSubmitting?: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  submitButtonText?: string;
  formType: 'create' | 'edit';
}

export function EnvioForm({
  onSubmit,
  defaultValues: initialDefaultValues,
  clientes,
  empresas,
  tiposPaquete,
  tiposServicio,
  isSubmitting = false,
  setIsSubmitting,
  submitButtonText = "Guardar Envío",
  formType
}: EnvioFormProps) {
  const { toast } = useToast();
  const [isMapsApiReady, setIsMapsApiReady] = React.useState(false);
  const [isGeocodingOrigin, setIsGeocodingOrigin] = React.useState(false);
  const [geocodedOrigin, setGeocodedOrigin] = React.useState<GeocodeResult | null>(null);
  const [isGeocodingDest, setIsGeocodingDest] = React.useState(false);
  const [geocodedDest, setGeocodedDest] = React.useState<GeocodeResult | null>(null);

  const [clienteSelectionMode, setClienteSelectionMode] = React.useState<'existing' | 'temporal'>(
    initialDefaultValues?.remitente_cliente_id ? 'existing' : (initialDefaultValues?.cliente_temporal_nombre ? 'temporal' : 'existing')
  );

  const form = useForm<Envio>({
    resolver: zodResolver(EnvioSchema),
    defaultValues: initialDefaultValues
    ? { // Edit mode
        ...initialDefaultValues,
        remitente_cliente_id: initialDefaultValues.remitente_cliente_id ?? null,
        cliente_temporal_nombre: initialDefaultValues.cliente_temporal_nombre ?? "",
        cliente_temporal_telefono: initialDefaultValues.cliente_temporal_telefono ?? "",
        nombre_destinatario: initialDefaultValues.nombre_destinatario ?? "",
        telefono_destinatario: initialDefaultValues.telefono_destinatario ?? "",
        direccion_origen: initialDefaultValues.direccion_origen || "",
        empresa_origen_id: initialDefaultValues.empresa_origen_id ?? null,
        notas_origen: initialDefaultValues.notas_origen ?? "",
        direccion_destino: initialDefaultValues.direccion_destino || "",
        empresa_destino_id: initialDefaultValues.empresa_destino_id ?? null,
        notas_destino: initialDefaultValues.notas_destino ?? "",
        tipo_paquete_id: initialDefaultValues.tipo_paquete_id || (tiposPaquete.length > 0 ? tiposPaquete[0].id : undefined),
        peso_kg: initialDefaultValues.peso_kg ?? null,
        tipo_servicio_id: initialDefaultValues.tipo_servicio_id || (tiposServicio.length > 0 ? tiposServicio[0].id : undefined),
        precio: initialDefaultValues.precio ?? 0,
        estado: initialDefaultValues.estado || 'pendiente_asignacion',
        fecha_estimada_entrega: initialDefaultValues.fecha_estimada_entrega ? new Date(initialDefaultValues.fecha_estimada_entrega) : undefined,
        horario_retiro_desde: initialDefaultValues.horario_retiro_desde ?? "",
        horario_entrega_hasta: initialDefaultValues.horario_entrega_hasta ?? "",
        repartidor_asignado_id: initialDefaultValues.repartidor_asignado_id ?? null,
        notas_conductor: initialDefaultValues.notas_conductor ?? "",
        detalles_adicionales: initialDefaultValues.detalles_adicionales ?? "",
        latitud_origen: initialDefaultValues.latitud_origen ?? null,
        longitud_origen: initialDefaultValues.longitud_origen ?? null,
        latitud_destino: initialDefaultValues.latitud_destino ?? null,
        longitud_destino: initialDefaultValues.longitud_destino ?? null,
      }
    : { // Create mode
        remitente_cliente_id: null,
        cliente_temporal_nombre: "",
        cliente_temporal_telefono: "",
        nombre_destinatario: "",
        telefono_destinatario: "",
        direccion_origen: "",
        latitud_origen: null,
        longitud_origen: null,
        empresa_origen_id: null,
        notas_origen: "",
        direccion_destino: "",
        latitud_destino: null,
        longitud_destino: null,
        empresa_destino_id: null,
        notas_destino: "",
        tipo_paquete_id: tiposPaquete.length > 0 ? tiposPaquete[0].id : undefined,
        peso_kg: null,
        tipo_servicio_id: tiposServicio.length > 0 ? tiposServicio[0].id : undefined,
        precio: 0,
        estado: 'pendiente_asignacion',
        fecha_estimada_entrega: undefined,
        horario_retiro_desde: "",
        horario_entrega_hasta: "",
        repartidor_asignado_id: null,
        notas_conductor: "",
        detalles_adicionales: "",
      },
  });

  React.useEffect(() => {
    getGoogleMapsApi()
      .then(() => setIsMapsApiReady(true))
      .catch((error) => {
        console.error("Failed to load Google Maps API in EnvioForm:", error);
        toast({
          title: "Error de Mapa",
          description: "No se pudo cargar la API de Google Maps. La geocodificación no estará disponible.",
          variant: "destructive",
        });
      });
  }, [toast]);

  React.useEffect(() => {
    if (initialDefaultValues) {
      const currentClienteMode = initialDefaultValues.remitente_cliente_id ? 'existing' : (initialDefaultValues.cliente_temporal_nombre ? 'temporal' : 'existing');
      setClienteSelectionMode(currentClienteMode);
      
      form.reset({
        ...initialDefaultValues,
        remitente_cliente_id: initialDefaultValues.remitente_cliente_id ?? null,
        cliente_temporal_nombre: initialDefaultValues.cliente_temporal_nombre ?? "",
        cliente_temporal_telefono: initialDefaultValues.cliente_temporal_telefono ?? "",
        nombre_destinatario: initialDefaultValues.nombre_destinatario ?? "",
        telefono_destinatario: initialDefaultValues.telefono_destinatario ?? "",
        direccion_origen: initialDefaultValues.direccion_origen || "",
        empresa_origen_id: initialDefaultValues.empresa_origen_id ?? null,
        notas_origen: initialDefaultValues.notas_origen ?? "",
        direccion_destino: initialDefaultValues.direccion_destino || "",
        empresa_destino_id: initialDefaultValues.empresa_destino_id ?? null,
        notas_destino: initialDefaultValues.notas_destino ?? "",
        tipo_paquete_id: initialDefaultValues.tipo_paquete_id || (tiposPaquete.length > 0 ? tiposPaquete[0].id : undefined),
        peso_kg: initialDefaultValues.peso_kg ?? null,
        tipo_servicio_id: initialDefaultValues.tipo_servicio_id || (tiposServicio.length > 0 ? tiposServicio[0].id : undefined),
        precio: initialDefaultValues.precio ?? 0,
        estado: initialDefaultValues.estado || 'pendiente_asignacion',
        fecha_estimada_entrega: initialDefaultValues.fecha_estimada_entrega ? new Date(initialDefaultValues.fecha_estimada_entrega) : undefined,
        horario_retiro_desde: initialDefaultValues.horario_retiro_desde ?? "",
        horario_entrega_hasta: initialDefaultValues.horario_entrega_hasta ?? "",
        repartidor_asignado_id: initialDefaultValues.repartidor_asignado_id ?? null,
        notas_conductor: initialDefaultValues.notas_conductor ?? "",
        detalles_adicionales: initialDefaultValues.detalles_adicionales ?? "",
        latitud_origen: initialDefaultValues.latitud_origen ?? null,
        longitud_origen: initialDefaultValues.longitud_origen ?? null,
        latitud_destino: initialDefaultValues.latitud_destino ?? null,
        longitud_destino: initialDefaultValues.longitud_destino ?? null,
      });

      if (initialDefaultValues.latitud_origen && initialDefaultValues.longitud_origen && initialDefaultValues.direccion_origen) {
        setGeocodedOrigin({ lat: initialDefaultValues.latitud_origen, lng: initialDefaultValues.longitud_origen, formattedAddress: initialDefaultValues.direccion_origen });
      } else {
        setGeocodedOrigin(null);
      }
      if (initialDefaultValues.latitud_destino && initialDefaultValues.longitud_destino && initialDefaultValues.direccion_destino) {
        setGeocodedDest({ lat: initialDefaultValues.latitud_destino, lng: initialDefaultValues.longitud_destino, formattedAddress: initialDefaultValues.direccion_destino });
      } else {
        setGeocodedDest(null);
      }
    } else { // For create mode, ensure form is reset to its initial clean state
        form.reset({
            remitente_cliente_id: null,
            cliente_temporal_nombre: "",
            cliente_temporal_telefono: "",
            nombre_destinatario: "",
            telefono_destinatario: "",
            direccion_origen: "",
            latitud_origen: null,
            longitud_origen: null,
            empresa_origen_id: null,
            notas_origen: "",
            direccion_destino: "",
            latitud_destino: null,
            longitud_destino: null,
            empresa_destino_id: null,
            notas_destino: "",
            tipo_paquete_id: tiposPaquete.length > 0 ? tiposPaquete[0].id : undefined,
            peso_kg: null,
            tipo_servicio_id: tiposServicio.length > 0 ? tiposServicio[0].id : undefined,
            precio: 0,
            estado: 'pendiente_asignacion',
            fecha_estimada_entrega: undefined,
            horario_retiro_desde: "",
            horario_entrega_hasta: "",
            repartidor_asignado_id: null,
            notas_conductor: "",
            detalles_adicionales: "",
        });
        setGeocodedOrigin(null);
        setGeocodedDest(null);
        setClienteSelectionMode('existing'); // Default to existing client selection mode
    }
  }, [initialDefaultValues, form, tiposPaquete, tiposServicio]);
  
  React.useEffect(() => {
    if (clienteSelectionMode === 'existing') {
      form.setValue('cliente_temporal_nombre', ""); // Use "" instead of null
      form.setValue('cliente_temporal_telefono', ""); // Use "" instead of null
    } else {
      form.setValue('remitente_cliente_id', null);
    }
    // No need to trigger validation here, zod refine will handle it on submit
  }, [clienteSelectionMode, form]);


  const handleGeocode = async (
    type: 'origin' | 'destination',
    addressField: keyof Envio,
    latField: keyof Envio,
    lngField: keyof Envio,
    setGeocodingState: React.Dispatch<React.SetStateAction<boolean>>,
    setGeocodedDataState: React.Dispatch<React.SetStateAction<GeocodeResult | null>>
  ) => {
    if (!isMapsApiReady) {
      toast({ title: "API de Mapas no lista", description: "Espere a que la API de Google Maps cargue.", variant: "default" });
      return;
    }
    const addressValue = form.getValues(addressField) as string;
    if (!addressValue || addressValue.trim().length < 5) {
      toast({ title: "Error de Dirección", description: "Por favor, ingrese una dirección más completa.", variant: "destructive" });
      return;
    }
    setGeocodingState(true);
    setGeocodedDataState(null);
    try {
      const result = await geocodeAddress(addressValue);
      if (result) {
        form.setValue(latField, result.lat, { shouldValidate: true });
        form.setValue(lngField, result.lng, { shouldValidate: true });
        form.setValue(addressField, result.formattedAddress, { shouldValidate: true });
        setGeocodedDataState(result);
        toast({ title: "Geocodificación Exitosa", description: `Dirección ${type === 'origin' ? 'de origen' : 'de destino'} verificada: ${result.formattedAddress}` });
      } else {
        form.setValue(latField, null);
        form.setValue(lngField, null);
        toast({ title: "Error de Geocodificación", description: `No se pudo encontrar la dirección ${type === 'origin' ? 'de origen' : 'de destino'} o está fuera de Mar del Plata.`, variant: "destructive" });
      }
    } catch (error) {
      console.error(`Geocoding error for ${type}:`, error);
      toast({ title: "Error de Geocodificación", description: `Ocurrió un error al procesar la dirección ${type === 'origin' ? 'de origen' : 'de destino'}.`, variant: "destructive" });
      form.setValue(latField, null);
      form.setValue(lngField, null);
    } finally {
      setGeocodingState(false);
    }
  };

  const processSubmit = async (formData: Envio) => {
    setIsSubmitting(true);
    // Ensure optional string fields that are empty in the form are sent as null if schema expects nullable
    const dataToSubmit: Envio = {
        ...formData,
        cliente_temporal_nombre: formData.cliente_temporal_nombre || null,
        cliente_temporal_telefono: formData.cliente_temporal_telefono || null,
        empresa_origen_id: formData.empresa_origen_id || null,
        notas_origen: formData.notas_origen || null,
        empresa_destino_id: formData.empresa_destino_id || null,
        notas_destino: formData.notas_destino || null,
        peso_kg: formData.peso_kg === 0 ? null : formData.peso_kg, // Assuming 0 means not set for weight
        horario_retiro_desde: formData.horario_retiro_desde || null,
        horario_entrega_hasta: formData.horario_entrega_hasta || null,
        repartidor_asignado_id: formData.repartidor_asignado_id || null,
        notas_conductor: formData.notas_conductor || null,
        detalles_adicionales: formData.detalles_adicionales || null,
    };
    await onSubmit(dataToSubmit);
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-8">
        
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
            <CardDescription>Seleccione un cliente existente o ingrese los datos de un cliente temporal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4 mb-4">
              <Button type="button" variant={clienteSelectionMode === 'existing' ? 'default' : 'outline'} onClick={() => setClienteSelectionMode('existing')}>
                <UserPlus className="mr-2 h-4 w-4" /> Cliente Existente
              </Button>
              <Button type="button" variant={clienteSelectionMode === 'temporal' ? 'default' : 'outline'} onClick={() => setClienteSelectionMode('temporal')}>
                <UserPlus className="mr-2 h-4 w-4" /> Cliente Temporal
              </Button>
            </div>

            {clienteSelectionMode === 'existing' && (
              <FormField
                control={form.control}
                name="remitente_cliente_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente Existente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Ninguno</SelectItem>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id!}>
                            {cliente.apellido}, {cliente.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {clienteSelectionMode === 'temporal' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cliente_temporal_nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Cliente Temporal</FormLabel>
                      <FormControl><Input placeholder="Nombre completo" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cliente_temporal_telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono Cliente Temporal</FormLabel>
                      <FormControl><Input placeholder="Teléfono" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="text-blue-500"/> Origen del Envío</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="direccion_origen"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección de Origen</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl className="flex-grow"><Input placeholder="Ej: Calle Falsa 123, Mar del Plata" {...field} /></FormControl>
                    <Button type="button" onClick={() => handleGeocode('origin', 'direccion_origen', 'latitud_origen', 'longitud_origen', setIsGeocodingOrigin, setGeocodedOrigin)} disabled={isGeocodingOrigin || !isMapsApiReady} variant="outline">
                      {isGeocodingOrigin ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                      <span className="ml-2 hidden sm:inline">Verificar</span>
                    </Button>
                  </div>
                  {!isMapsApiReady && <FormDescription className="text-orange-600">API de Mapas no disponible.</FormDescription>}
                  {geocodedOrigin?.formattedAddress && <FormDescription className="text-green-600 flex items-center gap-1"><CheckCircle size={16} /> Verificada: {geocodedOrigin.formattedAddress}</FormDescription>}
                  {!isGeocodingOrigin && form.formState.dirtyFields.direccion_origen && !geocodedOrigin?.formattedAddress && <FormDescription className="text-orange-600 flex items-center gap-1"><AlertTriangle size={16}/> Verifique la dirección.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <Controller control={form.control} name="latitud_origen" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ""} />} />
            <Controller control={form.control} name="longitud_origen" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ""} />} />
            
            <FormField
              control={form.control}
              name="empresa_origen_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1"><Building size={16}/>Empresa de Origen (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione si el origen es una empresa" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="">Ninguna</SelectItem>
                      {empresas.map((emp) => <SelectItem key={emp.id} value={emp.id!}>{emp.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="notas_origen"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Notas de Origen (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Ej: Dejar en recepción, preguntar por Juan" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="text-red-500"/> Destino del Envío</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="direccion_destino"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección de Destino</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl className="flex-grow"><Input placeholder="Ej: Av. Colón 2020, Mar del Plata" {...field} /></FormControl>
                    <Button type="button" onClick={() => handleGeocode('destination', 'direccion_destino', 'latitud_destino', 'longitud_destino', setIsGeocodingDest, setGeocodedDest)} disabled={isGeocodingDest || !isMapsApiReady} variant="outline">
                      {isGeocodingDest ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                      <span className="ml-2 hidden sm:inline">Verificar</span>
                    </Button>
                  </div>
                  {!isMapsApiReady && <FormDescription className="text-orange-600">API de Mapas no disponible.</FormDescription>}
                  {geocodedDest?.formattedAddress && <FormDescription className="text-green-600 flex items-center gap-1"><CheckCircle size={16} /> Verificada: {geocodedDest.formattedAddress}</FormDescription>}
                  {!isGeocodingDest && form.formState.dirtyFields.direccion_destino && !geocodedDest?.formattedAddress && <FormDescription className="text-orange-600 flex items-center gap-1"><AlertTriangle size={16}/> Verifique la dirección.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <Controller control={form.control} name="latitud_destino" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ""} />} />
            <Controller control={form.control} name="longitud_destino" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ""} />} />
            
            <FormField
              control={form.control}
              name="empresa_destino_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1"><Building size={16}/>Empresa de Destino (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione si el destino es una empresa" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="">Ninguna</SelectItem>
                      {empresas.map((emp) => <SelectItem key={emp.id} value={emp.id!}>{emp.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="notas_destino"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Notas de Destino (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Ej: Tocar timbre Depto 3B, horario de entrega preferido" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="nombre_destinatario"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nombre de quien recibe</FormLabel>
                        <FormControl><Input placeholder="Nombre completo del destinatario" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                <FormField
                    control={form.control}
                    name="telefono_destinatario"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Teléfono de quien recibe</FormLabel>
                        <FormControl><Input placeholder="Teléfono del destinatario" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>


          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Detalles del Paquete y Servicio</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo_paquete_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Paquete</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value || undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo de paquete" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {tiposPaquete.map((tipo) => <SelectItem key={tipo.id} value={tipo.id!}>{tipo.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="peso_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso (kg) (Opcional)</FormLabel>
                    <FormControl><Input type="number" step="0.1" placeholder="Ej: 1.5" 
                     {...field} 
                     onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                     value={field.value ?? ""} 
                    /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="tipo_servicio_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Servicio</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value || undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo de servicio" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {tiposServicio.map((tipo) => <SelectItem key={tipo.id} value={tipo.id!}>{tipo.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="precio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="Ej: 500.00" 
                    {...field} 
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    value={field.value ?? 0} 
                  /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Estado del Envío</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un estado" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {EstadoEnvioEnum.options.map(estado => (
                            <SelectItem key={estado} value={estado}>
                            {estado.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
             />
            <FormField
              control={form.control}
              name="fecha_estimada_entrega"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha Estimada de Entrega (Opcional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date)}
                        disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) } 
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notas_conductor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas para el Conductor (Opcional)</FormLabel>
                  <FormControl><Textarea placeholder="Instrucciones especiales para el repartidor..." {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="detalles_adicionales"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Detalles Adicionales (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Cualquier otra información relevante para el envío..." {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isSubmitting || isGeocodingOrigin || isGeocodingDest || !isMapsApiReady}>
          {(isSubmitting || isGeocodingOrigin || isGeocodingDest) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitButtonText}
        </Button>
      </form>
    </Form>
  );
}

    