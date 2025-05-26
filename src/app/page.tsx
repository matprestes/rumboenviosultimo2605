"use client";

import * as React from 'react';
import { useState } from 'react';
import { AddressInputForm } from '@/components/address-input-form';
import { EstimatedCostDisplay } from '@/components/estimated-cost-display';
import { ShipmentRequestForm } from '@/components/shipment-request-form';
import { OptimizationSuggestionsDisplay } from '@/components/optimization-suggestions-display';
import type { AddressInputFormValues, AddressDetails } from '@/lib/schemas';
import type { OptimizeDeliveryOutput } from '@/ai/flows/delivery-optimization';
import type { SummarizeRequestOutput } from '@/ai/flows/request-summarization';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

export default function HomePage() {
  const [addressDetails, setAddressDetails] = useState<AddressDetails | null>(null);
  const [serviceType, setServiceType] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizeDeliveryOutput | null>(null);
  // const [requestSummary, setRequestSummary] = useState<SummarizeRequestOutput | null>(null); // Optional to display
  
  const [isCalculatingCost, setIsCalculatingCost] = useState(false);
  const [isProcessingShipment, setIsProcessingShipment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const handleAddressSubmit = (data: AddressInputFormValues) => {
    setIsCalculatingCost(true);
    setError(null);
    setOptimizationSuggestions(null); // Clear previous suggestions

    // Simulate a slight delay for effect if needed, or proceed directly
    setTimeout(() => {
      setAddressDetails(data.address);
      setServiceType(data.serviceType);

      let cost = 0;
      const baseCosts: { [key: string]: number } = {
        standard: 10,
        express: 20,
        sameday: 30,
      };
      cost += baseCosts[data.serviceType] || 0;

      // Symbolic mileage cost
      let mileageCost = 0;
      if (data.address.city) mileageCost += data.address.city.length * 0.3; // Example: $0.3 per char in city name
      if (data.address.street) mileageCost += data.address.street.length * 0.1; // Example: $0.1 per char in street name
      cost += Math.max(5, mileageCost); // Min mileage cost $5
      
      setEstimatedCost(cost);
      setIsCalculatingCost(false);
      toast({
        title: "Costo Estimado Calculado",
        description: `El costo estimado para el servicio ${data.serviceType} es $${cost.toFixed(2)}.`,
      });
    }, 500); // Simulate network delay or processing
  };

  const handleShipmentSubmitSuccess = (
    suggestions: OptimizeDeliveryOutput, 
    summary: SummarizeRequestOutput
  ) => {
    setOptimizationSuggestions(suggestions);
    // setRequestSummary(summary); // Store if needed
    setError(null);
    toast({
      title: "¡Solicitud Exitosa!",
      description: "Sugerencias de optimización generadas.",
      variant: "default", // 'default' is fine, or create a 'success' variant in toast.tsx if needed
    });
  };

  const handleShipmentSubmitError = (submitError: Error) => {
    console.error("Shipment submission error:", submitError);
    setError(`Error al procesar la solicitud: ${submitError.message}. Por favor, inténtalo de nuevo.`);
    setOptimizationSuggestions(null);
    toast({
      title: "Error en la Solicitud",
      description: submitError.message || "No se pudieron generar las sugerencias.",
      variant: "destructive",
    });
  };

  const formatAddressToString = (addr: AddressDetails | null): string => {
    if (!addr) return "";
    return `${addr.street}, ${addr.city}, ${addr.postalCode}, ${addr.country}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans"> {/* Using --font-geist-sans from layout */}
      <header className="py-8 bg-primary shadow-md">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground">Rumbos Envíos</h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mt-2">
            Optimiza tus entregas con inteligencia artificial.
          </p>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Columna Izquierda: Formularios */}
          <div className="space-y-8">
            <AddressInputForm onSubmit={handleAddressSubmit} isProcessing={isCalculatingCost} />
            
            {estimatedCost > 0 && !isCalculatingCost && (
              <EstimatedCostDisplay cost={estimatedCost} />
            )}

            {addressDetails && serviceType && estimatedCost > 0 && !isCalculatingCost && (
              <ShipmentRequestForm
                addressString={formatAddressToString(addressDetails)}
                serviceType={serviceType}
                onSubmitSuccess={handleShipmentSubmitSuccess}
                onSubmitError={handleShipmentSubmitError}
                isProcessing={isProcessingShipment}
                setIsProcessing={setIsProcessingShipment}
              />
            )}
          </div>

          {/* Columna Derecha: Sugerencias */}
          <div className="space-y-8">
            {isProcessingShipment && (
              <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-primary/50 rounded-lg bg-card min-h-[200px]">
                 <svg className="animate-spin h-12 w-12 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                <p className="text-lg text-primary font-semibold">Buscando optimizaciones...</p>
                <p className="text-sm text-muted-foreground">Esto puede tardar unos segundos.</p>
              </div>
            )}
            {!isProcessingShipment && optimizationSuggestions && (
              <OptimizationSuggestionsDisplay suggestions={optimizationSuggestions} />
            )}
             {!isProcessingShipment && !optimizationSuggestions && addressDetails && (
              <div className="p-6 border border-dashed border-muted-foreground/50 rounded-lg bg-card text-center min-h-[200px] flex flex-col justify-center items-center">
                <img src="https://placehold.co/150x100.png" alt="Mapa de optimización" data-ai-hint="map optimization" className="mb-4 rounded opacity-70" />
                <p className="text-muted-foreground">
                  Completa el formulario de detalles adicionales y solicita el envío para ver las sugerencias de optimización aquí.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="py-6 mt-12 border-t border-border/50 text-center">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Rumbos Envíos. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
