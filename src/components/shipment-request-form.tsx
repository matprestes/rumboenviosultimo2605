
"use client";

import * as React from 'react'; // Changed from type-only import
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShipmentRequestFormSchema, type ShipmentRequestFormValues } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import type { OptimizeDeliveryInput, OptimizeDeliveryOutput } from '@/ai/flows/delivery-optimization';
import type { SummarizeRequestInput, SummarizeRequestOutput } from '@/ai/flows/request-summarization';

// These would typically be imported from a server actions file
// For now, we mock them or assume they are available in scope if using Genkit Next.js plugin.
// In a real Genkit setup with Next.js, you'd import these from your AI flows.
async function summarizeRequest(input: SummarizeRequestInput): Promise<SummarizeRequestOutput> {
  const response = await fetch('/api/summarizeRequest', { // Assuming Genkit Next.js sets up API routes
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to summarize request');
  return response.json();
}

async function optimizeDelivery(input: OptimizeDeliveryInput): Promise<OptimizeDeliveryOutput> {
 const response = await fetch('/api/optimizeDelivery', { // Assuming Genkit Next.js sets up API routes
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to optimize delivery');
  return response.json();
}


interface ShipmentRequestFormProps {
  addressString: string; // Combined address from parent
  serviceType: string; // From parent
  onSubmitSuccess: (suggestions: OptimizeDeliveryOutput, summary: SummarizeRequestOutput) => void;
  onSubmitError: (error: Error) => void;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
}

export function ShipmentRequestForm({
  addressString,
  serviceType,
  onSubmitSuccess,
  onSubmitError,
  isProcessing,
  setIsProcessing,
}: ShipmentRequestFormProps) {
  const form = useForm<ShipmentRequestFormValues>({
    resolver: zodResolver(ShipmentRequestFormSchema),
    defaultValues: {
      comments: '',
    },
  });

  const handleFormSubmit = async (data: ShipmentRequestFormValues) => {
    setIsProcessing(true);
    try {
      // 1. Summarize request (optional to display, but good practice)
      const summaryInput: SummarizeRequestInput = { deliveryRequest: data.comments || 'Sin comentarios adicionales.' };
      const summaryOutput = await summarizeRequest(summaryInput);

      // 2. Optimize Delivery
      // Mock availability and package details for now
      const availability = "Lunes a Viernes, 9 AM - 5 PM";
      const packageDetails = `Tipo de servicio: ${serviceType}, paquete estándar, aprox. 2kg.`;
      
      const optimizationInput: OptimizeDeliveryInput = {
        deliveryLocation: addressString,
        availability,
        packageDetails,
      };
      const optimizationOutput = await optimizeDelivery(optimizationInput);

      onSubmitSuccess(optimizationOutput, summaryOutput);
    } catch (error) {
      console.error("Error processing shipment request:", error);
      onSubmitError(error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-primary">
          <MessageSquare size={28} />
          <span>Detalles Adicionales y Solicitud</span>
        </CardTitle>
        <CardDescription>
          Agrega comentarios o instrucciones especiales para tu envío.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios o Solicitudes Personalizadas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Dejar el paquete en la recepción, llamar antes de llegar, etc."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Solicitar Envío y Optimizar Ruta
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
