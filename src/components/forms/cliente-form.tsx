
"use client";

import type * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClienteSchema, type Cliente, type ClienteFormValues, EstadoEnum } from '@/lib/schemas';
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

interface EmpresaOption {
  id: string;
  nombre: string;
}

interface ClienteFormProps {
  onSubmit: (data: Cliente) => Promise<void>; // Changed to accept full Cliente
  defaultValues?: Partial<Cliente>; // Use full Cliente
  empresas?: EmpresaOption[];
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function ClienteForm({
  onSubmit,
  defaultValues,
  empresas = [],
  isSubmitting = false,
  submitButtonText = "Guardar Cliente"
}: ClienteFormProps) {
  const { toast } = useToast();
  const [isGeocoding, setIsGeocoding] = React.useState(false);
  const [geocodedData, setGeocodedData] = React.useState<GeocodeResult | null>(
    defaultValues?.latitud && defaultValues?.longitud && defaultValues?.direccion ? { lat: defaultValues.latitud, lng: defaultValues.longitud, formattedAddress: defaultValues.direccion } : null
  );

  const form = useForm<Cliente>({ // Use full Cliente for form type
    resolver: zodResolver(ClienteSchema.omit({ created_at: true, updated_at: true })),
    defaultValues: {
      estado: "activo",
      ...defaultValues,
    },
  });

  React.useEffect(() => {
    if (defaultValues) {
      form.reset({
        estado: "activo",
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

  const handleFormSubmit = async (data: Cliente) => {
    const dataToSubmit: Cliente = {
      ...data,
      id: defaultValues?.id || data.id,
      latitud: form.getValues("latitud"),
      longitud: form.getValues("longitud"),
      empresa_id: data.empresa_id === 'no_empresa' ? null : data.empresa_id,
    };
    await onSubmit(dataToSubmit);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Juan" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="apellido"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellido</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Pérez" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="direccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl className="flex-grow">
                  <Input placeholder="Ej: Calle Falsa 123, Mar del Plata" {...field} />
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
                  <AlertTriangle size={16}/> Verifique la dirección para obtener coordenadas.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <Controller control={form.control} name="latitud" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ""} />} />
        <Controller control={form.control} name="longitud" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ""} />} />


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono (Opcional)</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="Ej: 2236987654" {...field} value={field.value ?? ""} />
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
                  <Input type="email" placeholder="Ej: juan.perez@example.com" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="empresa_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Empresa Asociada (Opcional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value === null ? 'no_empresa' : field.value || 'no_empresa'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una empresa" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="no_empresa">Ninguna</SelectItem>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id!}>
                      {empresa.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Si el cliente pertenece a una empresa, selecciónela aquí.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Información adicional sobre el cliente..."
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
