
"use client";

import * as React from 'react'; // Changed from type-only import
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

interface EstimatedCostDisplayProps {
  cost: number;
}

export function EstimatedCostDisplay({ cost }: EstimatedCostDisplayProps) {
  if (cost <= 0) return null;

  return (
    <Card className="shadow-lg border-accent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl text-accent-foreground">
          <DollarSign size={24} className="text-accent" />
          <span>Costo Estimado del Envío</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-accent-foreground">
          ${cost.toFixed(2)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Este costo incluye una tarifa base y una estimación por kilometraje. El precio final puede variar.
        </p>
      </CardContent>
    </Card>
  );
}
