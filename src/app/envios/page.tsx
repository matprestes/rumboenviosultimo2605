
import * as React from 'react';
import { Suspense } from 'react';
import EnviosPageContent from '@/components/page-contents/envios-page-content';
import { Loader2 } from 'lucide-react'; // Import Loader2 for the fallback

// Fallback component for Suspense
function LoadingFallback() {
  return (
    <div className="flex justify-center items-center h-screen w-full">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="ml-3 text-muted-foreground">Cargando envíos...</p>
    </div>
  );
}

export default function EnviosPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <EnviosPageContent />
    </Suspense>
  );
}

    