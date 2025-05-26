
"use client";

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmpresaSchema, type Empresa, EstadoEnum } from '@/lib/schemas';
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
import { Loader2, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { geocodeAddress, type GeocodeResult, getGoogleMapsApi } from '@/services/google-maps-service';
import { useToast } from '@/hooks/use-toast';

interface EmpresaFormProps {
  onSubmit: (data: Empresa) => Promise<void | { success: boolean; error?: string; data?: Empresa }>;
  defaultValues?: Partial<Empresa>;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function EmpresaForm({
  onSubmit,
  defaultValues: initialDefaultValues,
  isSubmitting = false,
  submitButtonText = "Guardar Empresa"
}: EmpresaFormProps) {
  const { toast } = useToast();
  const [isMapsApiReady, setIsMapsApiReady] = React.useState(false);
  const [isGeocoding, setIsGeocoding] = React.useState(false);
  const [geocodedData, setGeocodedData] = React.useState<GeocodeResult | null>(
    initialDefaultValues?.latitud && initialDefaultValues?.longitud && initialDefaultValues?.direccion ? { lat: initialDefaultValues.latitud, lng: initialDefaultValues.longitud, formattedAddress: initialDefaultValues.direccion } : null
  );

  const form = useForm<Empresa>({
    resolver: zodResolver(EmpresaSchema.omit({ 
      id: true, 
      created_at: true, 
      updated_at: true, 
      user_id: true 
    })),
    defaultValues: initialDefaultValues
      ? {
          ...initialDefaultValues,
          nombre: initialDefaultValues.nombre || "",
          direccion: initialDefaultValues.direccion || "",
          telefono: initialDefaultValues.telefono ?? "",
          email: initialDefaultValues.email ?? "",
          notas: initialDefaultValues.notas ?? "",
          estado: initialDefaultValues.estado || "activo",
          latitud: initialDefaultValues.latitud ?? null,
          longitud: initialDefaultValues.longitud ?? null,
        }
      : {
          nombre: "",
          direccion: "",
          latitud: null,
          longitud: null,
          telefono: "",
          email: "",
          notas: "",
          estado: "activo",
        },
  });

  React.useEffect(() => {
    getGoogleMapsApi()
      .then(() => setIsMapsApiReady(true))
      .catch((error) => {
        console.error("Failed to load Google Maps API in EmpresaForm:", error);
        toast({
          title: "Error de Mapa",
          description: "No se pudo cargar la API de Google Maps. La geocodificación no estará disponible.",
          variant: "destructive",
        });
      });
  }, [toast]);

  React.useEffect(() => {
    if (initialDefaultValues) {
      form.reset({
        ...initialDefaultValues,
        nombre: initialDefaultValues.nombre || "",
        direccion: initialDefaultValues.direccion || "",
        telefono: initialDefaultValues.telefono ?? "",
        email: initialDefaultValues.email ?? "",
        notas: initialDefaultValues.notas ?? "",
        estado: initialDefaultValues.estado || "activo",
        latitud: initialDefaultValues.latitud ?? null,
        longitud: initialDefaultValues.longitud ?? null,
      });
      if (initialDefaultValues.latitud && initialDefaultValues.longitud && initialDefaultValues.direccion) {
        setGeocodedData({ lat: initialDefaultValues.latitud, lng: initialDefaultValues.longitud, formattedAddress: initialDefaultValues.direccion });
      } else {
        setGeocodedData(null);
      }
    } else {
        form.reset({
            nombre: "",
            direccion: "",
            latitud: null,
            longitud: null,
            telefono: "",
            email: "",
            notas: "",
            estado: "activo",
        });
        setGeocodedData(null);
    }
  }, [initialDefaultValues, form]);


  const handleGeocode = async () => {
    if (!isMapsApiReady) {
      toast({ title: "API de Mapas no lista", description: "Espere a que la API de Google Maps cargue.", variant: "default" });
      return;
    }
    const addressValue = form.getValues("direccion");
    if (!addressValue || addressValue.trim().length < 5) {
      toast({
        title: "Error de Dirección",
        description: "Por favor, ingrese una dirección más completa para geocodificar.",
        variant: "destructive",
      });
      return;
    }
    setIsGeocoding(true);
    setGeocodedData(null);
    try {
      const result = await geocodeAddress(addressValue);
      if (result) {
        form.setValue("latitud", result.lat, { shouldValidate: true });
        form.setValue("longitud", result.lng, { shouldValidate: true });
        form.setValue("direccion", result.formattedAddress, { shouldValidate: true });
        setGeocodedData(result);
        toast({
          title: "Geocodificación Exitosa",
          description: `Dirección verificada y actualizada: ${result.formattedAddress}`,
          variant: "default",
        });
      } else {
        form.setValue("latitud", null);
        form.setValue("longitud", null);
        toast({
          title: "Error de Geocodificación",
          description: "No se pudo encontrar la dirección o está fuera de Mar del Plata.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Geocoding error in form:", error);
      toast({
        title: "Error de Geocodificación",
        description: "Ocurrió un error al procesar la dirección.",
        variant: "destructive",
      });
       form.setValue("latitud", null);
       form.setValue("longitud", null);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleFormSubmit = async (data: Empresa) => {
    const dataToSubmit: Empresa = {
      ...data,
      id: initialDefaultValues?.id || data.id,
      latitud: form.getValues("latitud"),
      longitud: form.getValues("longitud"),
    };
    await onSubmit(dataToSubmit);
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Empresa</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Acme Corp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="direccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl className="flex-grow">
                  <Input placeholder="Ej: Av. San Martín 1234, Mar del Plata" {...field} />
                </FormControl>
                <Button type="button" onClick={handleGeocode} disabled={isGeocoding || !isMapsApiReady} variant="outline">
                  {isGeocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  <span className="ml-2 hidden sm:inline">Verificar</span>
                </Button>
              </div>
              {!isMapsApiReady && <FormDescription className="text-orange-600">API de Mapas no disponible.</FormDescription>}
              {geocodedData?.formattedAddress && (
                <FormDescription className="mt-1 text-green-600 flex items-center gap-1">
                  <CheckCircle size={16} /> Dirección verificada: {geocodedData.formattedAddress}
                </FormDescription>
              )}
              {!isGeocoding && form.formState.dirtyFields.direccion && !geocodedData?.formattedAddress && (
                 <FormDescription className="mt-1 text-orange-600 flex items-center gap-1">
                  <AlertTriangle size={16}/>  Verifique la dirección para obtener coordenadas.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <Controller control={form.control} name="latitud" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ""} />} />
        <Controller control={form.control} name="longitud" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ""}/>} />


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono (Opcional)</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="Ej: 2235123456" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (Opcional)</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Ej: contacto@empresa.com" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Información adicional sobre la empresa..."
                  className="resize-none"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="estado"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un estado" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EstadoEnum.options.map((estadoValue) => (
                    <SelectItem key={estadoValue} value={estadoValue}>
                      {estadoValue.charAt(0).toUpperCase() + estadoValue.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting || isGeocoding || !isMapsApiReady}>
          {(isSubmitting || isGeocoding) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitButtonText}
        </Button>
      </form>
    </Form>
  );
}

    