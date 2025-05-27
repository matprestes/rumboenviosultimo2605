
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TipoServicioSchema, type TipoServicioFormValues } from '@/lib/schemas';
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
import { Loader2 } from 'lucide-react';

interface TipoServicioFormProps {
  onSubmit: (data: TipoServicioFormValues) => Promise<void | { success: boolean; error?: string; data?: any }>;
  defaultValues?: Partial<TipoServicioFormValues>;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function TipoServicioForm({
  onSubmit,
  defaultValues,
  isSubmitting = false,
  submitButtonText = "Guardar Tipo de Servicio"
}: TipoServicioFormProps) {
  const form = useForm<TipoServicioFormValues>({
    resolver: zodResolver(TipoServicioSchema.omit({ id: true, created_at: true, updated_at: true, user_id: true })),
    defaultValues: {
      nombre: defaultValues?.nombre || "",
      descripcion: defaultValues?.descripcion || "",
      precio_base: defaultValues?.precio_base === undefined || defaultValues?.precio_base === null ? null : Number(defaultValues.precio_base),
      precio_extra_km_default: defaultValues?.precio_extra_km_default === undefined || defaultValues?.precio_extra_km_default === null ? null : Number(defaultValues.precio_extra_km_default),
    },
  });

  React.useEffect(() => {
    // Reset form when defaultValues change (e.g., when editing a different item)
    form.reset({
      nombre: defaultValues?.nombre || "",
      descripcion: defaultValues?.descripcion || "",
      precio_base: defaultValues?.precio_base === undefined || defaultValues?.precio_base === null ? null : Number(defaultValues.precio_base),
      precio_extra_km_default: defaultValues?.precio_extra_km_default === undefined || defaultValues?.precio_extra_km_default === null ? null : Number(defaultValues.precio_extra_km_default),
    });
  }, [defaultValues, form]);

  const handleFormSubmit = async (data: TipoServicioFormValues) => {
    const dataToSubmit = {
      ...data,
      precio_base: data.precio_base === null || data.precio_base === undefined || isNaN(Number(data.precio_base)) ? null : Number(data.precio_base),
      precio_extra_km_default: data.precio_extra_km_default === null || data.precio_extra_km_default === undefined || isNaN(Number(data.precio_extra_km_default)) ? null : Number(data.precio_extra_km_default)
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
              <FormLabel>Nombre del Tipo de Servicio</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Envío Estándar, Envío Express" {...field} />
              </FormControl>
              <FormDescription>
                El nombre debe ser único y descriptivo.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detalles sobre el servicio, tiempos de entrega, etc."
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
          name="precio_base"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Precio Base (Opcional)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="Ej: 250.00" 
                  {...field}
                  value={field.value === null || field.value === undefined ? "" : field.value}
                  onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                Costo inicial del servicio, si aplica. Este es un precio fijo para el servicio, independiente de la distancia.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="precio_extra_km_default"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Precio Extra por KM (Default - Opcional)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="Ej: 30.00" 
                  {...field}
                  value={field.value === null || field.value === undefined ? "" : field.value}
                  onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                Precio por KM que se aplicará si la distancia de un envío excede todos los rangos definidos en las tarifas por distancia específicas.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitButtonText}
        </Button>
      </form>
    </Form>
  );
}
    