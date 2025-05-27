
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod'; // Import Zod
import type { TarifaDistanciaFormValues } from '@/lib/schemas'; // Keep for type
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
import { Loader2 } from 'lucide-react';

interface TarifaDistanciaFormProps {
  onSubmit: (data: TarifaDistanciaFormValues & { tipo_servicio_id?: string }) => Promise<void | { success: boolean; error?: string; data?: any }>;
  defaultValues?: Partial<TarifaDistanciaFormValues>;
  isSubmitting?: boolean;
  submitButtonText?: string;
  tipoServicioId?: string; 
}

// Define a schema specifically for this form's validation resolver
const FormSpecificTarifaSchema = z.object({
  distancia_min_km: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0, "La distancia mínima no puede ser negativa.")
  ),
  distancia_max_km: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().positive("La distancia máxima debe ser un número positivo.")
  ),
  precio_base: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : parseFloat(String(val))),
    z.number().min(0, "El precio base no puede ser negativo.").nullable().optional().default(null)
  ),
  precio_por_km: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().positive("El precio por km debe ser un número positivo.")
  ),
}).superRefine((data, ctx) => {
  if (data.distancia_min_km >= data.distancia_max_km) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La distancia mínima debe ser menor que la distancia máxima.",
      path: ["distancia_max_km"],
    });
  }
});


export function TarifaDistanciaForm({
  onSubmit,
  defaultValues,
  isSubmitting = false,
  submitButtonText = "Guardar Tarifa",
  tipoServicioId
}: TarifaDistanciaFormProps) {
  const form = useForm<TarifaDistanciaFormValues>({
    resolver: zodResolver(FormSpecificTarifaSchema), // Use the new form-specific schema
    defaultValues: {
      distancia_min_km: defaultValues?.distancia_min_km ?? 0,
      distancia_max_km: defaultValues?.distancia_max_km ?? 0,
      precio_base: defaultValues?.precio_base === undefined || defaultValues?.precio_base === null ? null : Number(defaultValues.precio_base),
      precio_por_km: defaultValues?.precio_por_km ?? 0,
    },
  });

  React.useEffect(() => {
    form.reset({
      distancia_min_km: defaultValues?.distancia_min_km ?? 0,
      distancia_max_km: defaultValues?.distancia_max_km ?? 0,
      precio_base: defaultValues?.precio_base === undefined || defaultValues?.precio_base === null ? null : Number(defaultValues.precio_base),
      precio_por_km: defaultValues?.precio_por_km ?? 0,
    });
  }, [defaultValues, form]);

  const handleFormSubmit = async (data: TarifaDistanciaFormValues) => {
    // The tipo_servicio_id is passed directly to the onSubmit handler, not part of the form's state or validation for *this* component.
    // The server action will handle associating it.
    const dataToSubmit = {
      ...data,
      tipo_servicio_id: tipoServicioId, 
      precio_base: data.precio_base === null || data.precio_base === undefined || isNaN(Number(data.precio_base)) ? null : Number(data.precio_base),
      precio_por_km: Number(data.precio_por_km)
    };
    await onSubmit(dataToSubmit);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="distancia_min_km"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Distancia Mín. (km)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} 
                    onChange={e => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))} // Ensure number or 0
                    value={field.value ?? 0}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="distancia_max_km"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Distancia Máx. (km)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" placeholder="Ej: 5.00" {...field} 
                    onChange={e => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))} // Ensure number or 0
                    value={field.value ?? 0}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    placeholder="Ej: 150.00" 
                    {...field}
                    value={field.value === null || field.value === undefined ? "" : field.value}
                    onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="precio_por_km"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Precio por KM</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" placeholder="Ej: 50.00" {...field} 
                     onChange={e => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))} // Ensure number or 0
                     value={field.value ?? 0}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitButtonText}
        </Button>
      </form>
    </Form>
  );
}
