
import * as React from 'react';
import { Suspense } from 'react';
import RepartosPageContent from '@/components/page-contents/repartos-page-content';
import { Loader2 } from 'lucide-react'; // Import Loader2 for the fallback

// Fallback component for Suspense
function LoadingFallback() {
  return (
    <div className="flex justify-center items-center h-screen w-full">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="ml-3 text-muted-foreground">Cargando repartos...</p>
    </div>
  );
}

export default function RepartosPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RepartosPageContent />
    </Suspense>
  );
}

    