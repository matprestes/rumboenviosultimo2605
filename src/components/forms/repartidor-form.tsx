
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RepartidorSchema, type Repartidor, EstadoEnum } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface RepartidorFormProps {
  onSubmit: (data: Repartidor) => Promise<void | { success: boolean; error?: string; data?: Repartidor }>;
  defaultValues?: Partial<Repartidor>; 
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function RepartidorForm({
  onSubmit,
  defaultValues: initialDefaultValues,
  isSubmitting = false,
  submitButtonText = "Guardar Repartidor"
}: RepartidorFormProps) {
  const form = useForm<Repartidor>({ 
    resolver: zodResolver(RepartidorSchema.omit({ id: true, created_at: true, updated_at: true, user_id: true })),
    defaultValues: initialDefaultValues
    ? {
        ...initialDefaultValues,
        nombre: initialDefaultValues.nombre || "",
        estado: initialDefaultValues.estado || "activo",
      }
    : {
        nombre: "",
        estado: "activo",
      },
  });

  React.useEffect(() => {
    if (initialDefaultValues) {
      form.reset({
        ...initialDefaultValues,
        nombre: initialDefaultValues.nombre || "",
        estado: initialDefaultValues.estado || "activo",
      });
    } else {
        form.reset({
            nombre: "",
            estado: "activo",
        });
    }
  }, [initialDefaultValues, form]);

  const handleFormSubmit = async (data: Repartidor) => {
    const dataToSubmit: Repartidor = {
      ...data,
      id: initialDefaultValues?.id || data.id,
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
              <FormLabel>Nombre del Repartidor</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Carlos López" {...field} />
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitButtonText}
        </Button>
      </form>
    </Form>
  );
}

    