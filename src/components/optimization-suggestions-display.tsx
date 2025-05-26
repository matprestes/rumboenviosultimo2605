
"use client";

import * as React from 'react'; // Changed from type-only import
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Lightbulb, Clock, Info } from 'lucide-react';
import type { OptimizeDeliveryOutput } from '@/ai/flows/delivery-optimization';

interface OptimizationSuggestionsDisplayProps {
  suggestions: OptimizeDeliveryOutput | null;
}

export function OptimizationSuggestionsDisplay({ suggestions }: OptimizationSuggestionsDisplayProps) {
  if (!suggestions) return null;

  return (
    <Card className="shadow-lg border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-primary">
          <Lightbulb size={28} />
          <span>Sugerencias de Optimización de Entrega</span>
        </CardTitle>
        <CardDescription>
          Basado en IA, aquí tienes algunas recomendaciones para tu envío:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-route"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>
            Estrategia Optimizada:
          </h3>
          <p className="text-muted-foreground">{suggestions.optimizedStrategy}</p>
        </div>
        <Separator />
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Clock size={20} />
            Tiempo Estimado de Entrega:
          </h3>
          <p className="text-muted-foreground">{suggestions.estimatedTime}</p>
        </div>
        {suggestions.additionalNotes && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Info size={20} />
                Notas Adicionales:
              </h3>
              <p className="text-muted-foreground">{suggestions.additionalNotes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
