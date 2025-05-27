
"use client";

import * as React from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RepartoSchema, type RepartoFormValues, type Repartidor, type Empresa, type EnvioConDetalles } from '@/lib/schemas';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Truck, Building, Package, CheckSquare, Square, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';

interface RepartoFormProps {
  onSubmit: (data: RepartoFormValues) => Promise<{ success: boolean; error?: string; data?: any }>;
  repartidores: Pick<Repartidor, 'id' | 'nombre'>[];
  empresas: Pick<Empresa, 'id' | 'nombre'>[];
  initialEnviosPendientes: EnvioConDetalles[];
  fetchEnviosPendientes: (empresaId?: string | null) => Promise<EnvioConDetalles[]>;
  isSubmitting?: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
}

export function RepartoForm({
  onSubmit,
  repartidores,
  empresas,
  initialEnviosPendientes,
  fetchEnviosPendientes,
  isSubmitting = false,
  setIsSubmitting,
}: RepartoFormProps) {
  const { toast } = useToast();
  const [enviosDisponibles, setEnviosDisponibles] = React.useState<EnvioConDetalles[]>(initialEnviosPendientes);
  const [isLoadingEnvios, setIsLoadingEnvios] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const form = useForm<RepartoFormValues>({
    resolver: zodResolver(RepartoSchema.omit({ id: true, created_at: true, updated_at: true, user_id: true })),
    defaultValues: {
      fecha_reparto: new Date(),
      repartidor_id: undefined,
      empresa_asociada_id: null,
      notas: "",
      envio_ids: [],
      estado: 'planificado',
    },
  });

  const { fields, append, remove } = useFieldArray<RepartoFormValues, "envio_ids", "id">({
    control: form.control,
    name: "envio_ids"
  });

  const selectedEmpresaId = form.watch('empresa_asociada_id');

  React.useEffect(() => {
    const loadEnvios = async () => {
      setIsLoadingEnvios(true);
      try {
        const data = await fetchEnviosPendientes(selectedEmpresaId);
        setEnviosDisponibles(data);
        const currentSelected = form.getValues('envio_ids');
        const newAvailableIds = new Set(data.map(e => e.id));
        const newSelected = currentSelected.filter(id => newAvailableIds.has(id!));
        form.setValue('envio_ids', newSelected);

      } catch (error) {
        toast({ title: "Error", description: "No se pudieron cargar los envíos pendientes.", variant: "destructive" });
      } finally {
        setIsLoadingEnvios(false);
      }
    };
    loadEnvios();
  }, [selectedEmpresaId, fetchEnviosPendientes, form, toast]);


  const handleEnvioSelection = (envioId: string, isSelected: boolean) => {
    const currentSelectedEnvios = form.getValues('envio_ids') || [];
    if (isSelected) {
      if (!currentSelectedEnvios.includes(envioId)) {
        form.setValue('envio_ids', [...currentSelectedEnvios, envioId]);
      }
    } else {
      form.setValue('envio_ids', currentSelectedEnvios.filter(id => id !== envioId));
    }
  };

  const filteredEnviosDisponibles = enviosDisponibles.filter(envio => {
    const remitente = envio.clientes ? `${envio.clientes.nombre} ${envio.clientes.apellido}`.toLowerCase() : '';
    const empresaOrigen = envio.empresas_origen ? envio.empresas_origen.nombre.toLowerCase() : '';
    const search = searchTerm.toLowerCase();
    return (
      envio.direccion_origen?.toLowerCase().includes(search) ||
      envio.direccion_destino?.toLowerCase().includes(search) ||
      remitente.includes(search) ||
      empresaOrigen.includes(search) ||
      envio.id?.toLowerCase().includes(search)
    );
  });


  const processSubmit = async (formData: RepartoFormValues) => {
    setIsSubmitting(true);
    const result = await onSubmit(formData);
    setIsSubmitting(false);
    if (result.success) {
      form.reset({ 
        fecha_reparto: new Date(),
        repartidor_id: undefined,
        empresa_asociada_id: null,
        notas: "",
        envio_ids: [],
        estado: 'planificado',
      }); 
      setSearchTerm(""); 
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="fecha_reparto"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha del Reparto</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1))}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="repartidor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1"><Truck size={16}/>Repartidor Asignado</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un repartidor" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {repartidores.map((r) => <SelectItem key={r.id} value={r.id!}>{r.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="empresa_asociada_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1"><Building size={16}/>Empresa Asociada (Opcional)</FormLabel>
              <Select onValueChange={(value) => field.onChange(value === "ninguna" ? null : value)} value={field.value ?? "ninguna"}>
                <FormControl><SelectTrigger><SelectValue placeholder="Reparto para una empresa específica?" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="ninguna">Ninguna (Reparto Individual)</SelectItem>
                  {empresas.map((e) => <SelectItem key={e.id} value={e.id!}>{e.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormDescription>Si este reparto es para una empresa, selecciónela para filtrar envíos.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormLabel className="flex items-center gap-1"><Package size={16}/>Envíos Pendientes a Incluir</FormLabel>
          <Input 
            placeholder="Buscar envíos por ID, dirección, cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-2"
          />
          {isLoadingEnvios ? (
            <div className="flex items-center justify-center h-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /> <span className="ml-2">Cargando envíos...</span></div>
          ) : filteredEnviosDisponibles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay envíos pendientes que coincidan con los filtros.</p>
          ) : (
            <ScrollArea className="h-64 w-full rounded-md border p-4">
              {filteredEnviosDisponibles.map((envio) => (
                <div key={envio.id} className="flex items-center space-x-3 mb-2 p-2 hover:bg-muted/50 rounded-md">
                  <Checkbox
                    id={`envio-${envio.id}`}
                    checked={form.getValues('envio_ids')?.includes(envio.id!)}
                    onCheckedChange={(checked) => handleEnvioSelection(envio.id!, !!checked)}
                  />
                  <label htmlFor={`envio-${envio.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">
                    <div className="font-semibold">ID: {envio.id?.substring(0,8)}...</div>
                    <div className="text-xs text-muted-foreground">
                       De: {envio.clientes ? `${envio.clientes.nombre} ${envio.clientes.apellido}` : (envio.empresas_origen ? envio.empresas_origen.nombre : 'N/A')} ({envio.direccion_origen})
                    </div>
                    <div className="text-xs text-muted-foreground">A: {envio.direccion_destino}</div>
                  </label>
                </div>
              ))}
            </ScrollArea>
          )}
          <FormField name="envio_ids" control={form.control} render={() => <FormMessage />} />
        </div>


        <FormField
          control={form.control}
          name="notas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas del Reparto (Opcional)</FormLabel>
              <FormControl><Textarea placeholder="Instrucciones generales para el repartidor..." {...field} value={field.value ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingEnvios}>
          {(isSubmitting || isLoadingEnvios) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Crear Reparto
        </Button>
      </form>
    </Form>
  );
}

    
