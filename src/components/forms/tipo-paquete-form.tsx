
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TipoPaqueteSchema, type TipoPaqueteFormValues } from '@/lib/schemas';
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

interface TipoPaqueteFormProps {
  onSubmit: (data: TipoPaqueteFormValues) => Promise<void | { success: boolean; error?: string; data?: any }>;
  defaultValues?: Partial<TipoPaqueteFormValues>;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function TipoPaqueteForm({
  onSubmit,
  defaultValues,
  isSubmitting = false,
  submitButtonText = "Guardar Tipo de Paquete"
}: TipoPaqueteFormProps) {
  const form = useForm<TipoPaqueteFormValues>({
    resolver: zodResolver(TipoPaqueteSchema.omit({ id: true, created_at: true, updated_at: true, user_id: true })),
    defaultValues: {
      nombre: defaultValues?.nombre || "",
      descripcion: defaultValues?.descripcion || "",
    },
  });

  React.useEffect(() => {
    if (defaultValues) {
      form.reset({
        nombre: defaultValues.nombre || "",
        descripcion: defaultValues.descripcion || "",
      });
    }
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Tipo de Paquete</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Sobre, Caja Pequeña, Caja Mediana" {...field} />
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
                  placeholder="Detalles adicionales sobre el tipo de paquete, como dimensiones máximas o peso."
                  className="resize-none"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
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

    