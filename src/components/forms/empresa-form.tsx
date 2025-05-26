
"use client";

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmpresaSchema, type Empresa, type EmpresaFormValues, EstadoEnum } from '@/lib/schemas';
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
import { geocodeAddress, type GeocodeResult } from '@/services/google-maps-service';
import { useToast } from '@/hooks/use-toast';

interface EmpresaFormProps {
  onSubmit: (data: Empresa) => Promise<void>; // Changed to accept full Empresa for updates
  defaultValues?: Partial<Empresa>; // Use full Empresa for defaultValues
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function EmpresaForm({
  onSubmit,
  defaultValues,
  isSubmitting = false,
  submitButtonText = "Guardar Empresa"
}: EmpresaFormProps) {
  const { toast } = useToast();
  const [isGeocoding, setIsGeocoding] = React.useState(false);
  const [geocodedData, setGeocodedData] = React.useState<GeocodeResult | null>(
    defaultValues?.latitud && defaultValues?.longitud && defaultValues?.direccion ? { lat: defaultValues.latitud, lng: defaultValues.longitud, formattedAddress: defaultValues.direccion } : null
  );

  const form = useForm<Empresa>({ // Use full Empresa for form type
    resolver: zodResolver(EmpresaSchema.omit({ created_at: true, updated_at: true })), // ID is optional for create, present for update
    defaultValues: {
      estado: "activo",
      ...defaultValues,
    },
  });

  React.useEffect(() => {
    if (defaultValues) {
      form.reset({
        estado: "activo", // Ensure default state
        ...defaultValues,
      });
      if (defaultValues.latitud && defaultValues.longitud && defaultValues.direccion) {
        setGeocodedData({ lat: defaultValues.latitud, lng: defaultValues.longitud, formattedAddress: defaultValues.direccion });
      } else {
        setGeocodedData(null);
      }
    }
  }, [defaultValues, form]);


  const handleGeocode = async () => {
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
        setGeocodedData(result);
        toast({
          title: "Geocodificación Exitosa",
          description: `Dirección verificada: ${result.formattedAddress}`,
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
      id: defaultValues?.id || data.id, // Ensure ID is passed for updates
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
                <Button type="button" onClick={handleGeocode} disabled={isGeocoding} variant="outline">
                  {isGeocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  <span className="ml-2 hidden sm:inline">Verificar</span>
                </Button>
              </div>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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

        <Button type="submit" className="w-full" disabled={isSubmitting || isGeocoding}>
          {(isSubmitting || isGeocoding) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitButtonText}
        </Button>
      </form>
    </Form>
  );
}
