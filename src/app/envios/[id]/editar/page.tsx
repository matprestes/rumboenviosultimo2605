
"use client";

import * as React from 'react'; // Ensure React is fully imported
import { EnvioForm } from '@/components/forms/envio-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Edit, Loader2, ArrowLeft } from 'lucide-react';
import { 
    getEnvioByIdAction, 
    updateEnvioAction,
    getClientesForSelect,
    getEmpresasForSelect,
    getTiposPaqueteForSelect,
    getTiposServicioForSelect
} from '@/actions/envio-actions';
import type { Envio, Cliente, Empresa, TipoPaquete, TipoServicio, EnvioConDetalles } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { parseISO, isValid } from 'date-fns';

interface EditarEnvioPageProps {
  params: { id: string };
}

export default function EditarEnvioPage({ params: paramsProp }: EditarEnvioPageProps) { // Renamed prop
  const { toast } = useToast();
  const router = useRouter();

  const resolvedParams = React.use(paramsProp); // Use React.use to resolve params
  const envioId = resolvedParams.id;

  const [envio, setEnvio] = React.useState<EnvioConDetalles | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const [clientes, setClientes] = React.useState<Pick<Cliente, 'id' | 'nombre' | 'apellido'>[]>([]);
  const [empresas, setEmpresas] = React.useState<Pick<Empresa, 'id' | 'nombre'>[]>([]);
  const [tiposPaquete, setTiposPaquete] = React.useState<TipoPaquete[]>([]);
  const [tiposServicio, setTiposServicio] = React.useState<TipoServicio[]>([]);

  React.useEffect(() => {
    async function loadEnvioAndFormData() {
      setIsLoadingData(true);
      try {
        const [envioResult, clientesData, empresasData, tiposPaqueteData, tiposServicioData] = await Promise.all([
          getEnvioByIdAction(envioId),
          getClientesForSelect(),
          getEmpresasForSelect(),
          getTiposPaqueteForSelect(),
          getTiposServicioForSelect(),
        ]);

        if (envioResult.error || !envioResult.envio) {
          toast({ title: "Error al Cargar Envío", description: envioResult.error || "Envío no encontrado.", variant: "destructive" });
          router.push('/envios'); 
          return;
        }
        
        let envioData = { ...envioResult.envio };
        if (envioData.fecha_estimada_entrega && typeof envioData.fecha_estimada_entrega === 'string') {
          const parsedDate = parseISO(envioData.fecha_estimada_entrega); // Supabase DATE is YYYY-MM-DD string
          if (isValid(parsedDate)) {
            envioData.fecha_estimada_entrega = parsedDate;
          } else {
            console.warn("Invalid date for fecha_estimada_entrega:", envioResult.envio.fecha_estimada_entrega);
            envioData.fecha_estimada_entrega = undefined; // Or null, depending on schema/form handling
          }
        } else if (envioData.fecha_estimada_entrega instanceof Date && !isValid(envioData.fecha_estimada_entrega)) {
            console.warn("Invalid Date object for fecha_estimada_entrega:", envioData.fecha_estimada_entrega);
            envioData.fecha_estimada_entrega = undefined;
        }


        setEnvio(envioData as EnvioConDetalles);
        setClientes(clientesData);
        setEmpresas(empresasData);
        setTiposPaquete(tiposPaqueteData);
        setTiposServicio(tiposServicioData);

      } catch (error) {
        console.error("Error loading data for edit envio form:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    }
    if (envioId) { // Ensure envioId is available before fetching
        loadEnvioAndFormData();
    }
  }, [envioId, toast, router]);

  const handleUpdateEnvio = async (formData: Envio) => {
    setIsSubmitting(true);
    const result = await updateEnvioAction(envioId, formData);
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "Envío Actualizado", description: `El envío ID ${envioId.substring(0,8)}... ha sido actualizado.` });
      router.push('/envios');
    } else {
      toast({ title: "Error al Actualizar Envío", description: result.error || "Ocurrió un error inesperado.", variant: "destructive" });
    }
    return result;
  };

  if (isLoadingData || !envioId) { // Check for envioId here as well
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!envio) {
     // This might be shown briefly if envioId is present but fetching fails or data is null initially
    return <div className="flex justify-center items-center h-screen"><p className="text-destructive">Envío no encontrado o error al cargar.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild>
                <Link href="/envios"><ArrowLeft /></Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                <Edit size={32} />
                Editar Envío
            </h1>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>ID del Envío: {envio.id?.substring(0, 8)}...</CardTitle>
          <CardDescription>Modifique la información del envío a continuación.</CardDescription>
        </CardHeader>
        <CardContent>
          <EnvioForm
            onSubmit={handleUpdateEnvio}
            defaultValues={envio}
            clientes={clientes}
            empresas={empresas}
            tiposPaquete={tiposPaquete}
            tiposServicio={tiposServicio}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            submitButtonText="Actualizar Envío"
            formType="edit"
          />
        </CardContent>
      </Card>
    </div>
  );
}

    