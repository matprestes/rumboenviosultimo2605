
"use client";

import * as React from 'react'; // Changed from type-only import
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RepartidorSchema, type Repartidor, type RepartidorFormValues, EstadoEnum } from '@/lib/schemas';
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
  onSubmit: (data: Repartidor) => Promise<void>; // Changed to accept full Repartidor
  defaultValues?: Partial<Repartidor>; // Use full Repartidor
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function RepartidorForm({
  onSubmit,
  defaultValues,
  isSubmitting = false,
  submitButtonText = "Guardar Repartidor"
}: RepartidorFormProps) {
  const form = useForm<Repartidor>({ // Use full Repartidor
    resolver: zodResolver(RepartidorSchema.omit({ created_at: true, updated_at: true })),
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
    }
  }, [defaultValues, form]);

  const handleFormSubmit = async (data: Repartidor) => {
    const dataToSubmit: Repartidor = {
      ...data,
      id: defaultValues?.id || data.id,
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitButtonText}
        </Button>
      </form>
    </Form>
  );
}
