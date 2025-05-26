
"use client";

import * as React from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
    RepartoLoteFormSchema, 
    type RepartoLoteFormValues, 
    type Empresa, 
    type Repartidor, 
    type Cliente, 
    type TipoServicio 
} from '@/lib/schemas';
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
import { CalendarIcon, Loader2, Truck, Building, User, Package, ClipboardList, Banknote, Info, Square, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '@/hooks/use-toast';
import { getClientesByEmpresaIdAction } from '@/actions/reparto-actions';

interface RepartoLoteFormProps {
  onSubmit: (data: RepartoLoteFormValues) => Promise<{ success: boolean; error?: string; errors?: any; data?: any }>;
  empresas: Pick<Empresa, 'id' | 'nombre'>[];
  repartidores: Pick<Repartidor, 'id' | 'nombre'>[];
  tiposServicio: TipoServicio[];
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
}

export function RepartoLoteForm({
  onSubmit,
  empresas,
  repartidores,
  tiposServicio,
  isSubmitting,
  setIsSubmitting,
}: RepartoLoteFormProps) {
  const { toast } = useToast();
  const [clientesEmpresa, setClientesEmpresa] = React.useState<Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'telefono'>[]>([]);
  const [isLoadingClientes, setIsLoadingClientes] = React.useState(false);

  const form = useForm<RepartoLoteFormValues>({
    resolver: zodResolver(RepartoLoteFormSchema),
    defaultValues: {
      empresa_id: undefined,
      fecha_reparto: new Date(),
      repartidor_id: undefined,
      notas_reparto: '',
      asignaciones_clientes: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "asignaciones_clientes",
  });

  const selectedEmpresaId = form.watch('empresa_id');

  React.useEffect(() => {
    if (selectedEmpresaId) {
      const fetchClientes = async () => {
        setIsLoadingClientes(true);
        form.setValue('asignaciones_clientes', []); // Clear previous assignments
        try {
          const data = await getClientesByEmpresaIdAction(selectedEmpresaId);
          setClientesEmpresa(data);
        } catch (error) {
          toast({ title: "Error", description: "No se pudieron cargar los clientes de la empresa.", variant: "destructive" });
          setClientesEmpresa([]);
        } finally {
          setIsLoadingClientes(false);
        }
      };
      fetchClientes();
    } else {
      setClientesEmpresa([]);
      form.setValue('asignaciones_clientes', []);
    }
  }, [selectedEmpresaId, form, toast]);

  const handleClientSelectionChange = (clienteId: string, isSelected: boolean) => {
    const existingIndex = fields.findIndex(field => field.cliente_id === clienteId);
    if (isSelected) {
      if (existingIndex === -1) {
        append({ cliente_id: clienteId, tipo_servicio_id: '', precio: 0, notas_envio: '' });
      }
    } else {
      if (existingIndex !== -1) {
        remove(existingIndex);
      }
    }
  };

  const processSubmit = async (formData: RepartoLoteFormValues) => {
    setIsSubmitting(true);
    const result = await onSubmit(formData);
    setIsSubmitting(false);
    if (result.success) {
      form.reset();
      setClientesEmpresa([]); // Clear clients list too
    } else if (result.errors) {
        // Handle specific field errors if needed, or just show general error
        console.error("Form validation errors (Lote):", result.errors);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList size={20}/>Detalles del Reparto por Lote</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                control={form.control}
                name="empresa_id"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center gap-1"><Building size={16}/>Empresa</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione una empresa" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {empresas.map((e) => <SelectItem key={e.id} value={e.id!}>{e.nombre}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="fecha_reparto"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Fecha del Reparto</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1))} initialFocus locale={es} />
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
                    <FormLabel className="flex items-center gap-1"><Truck size={16}/>Repartidor</FormLabel>
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
                name="notas_reparto"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center gap-1"><Info size={16}/>Notas Generales del Reparto (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Instrucciones para el repartidor sobre el viaje completo..." {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User size={20}/>Clientes y Envíos de la Empresa</CardTitle></CardHeader>
          <CardContent>
            {!selectedEmpresaId ? (
              <p className="text-muted-foreground text-center py-4">Seleccione una empresa para ver sus clientes.</p>
            ) : isLoadingClientes ? (
              <div className="flex items-center justify-center h-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /> <span className="ml-2">Cargando clientes...</span></div>
            ) : clientesEmpresa.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Esta empresa no tiene clientes activos registrados.</p>
            ) : (
              <ScrollArea className="h-96 w-full rounded-md border p-4">
                <FormField name="asignaciones_clientes" control={form.control} render={() => (<FormMessage className="mb-2"/>)} />
                {clientesEmpresa.map((cliente) => {
                  const asignacionIndex = fields.findIndex(f => f.cliente_id === cliente.id);
                  const isSelected = asignacionIndex !== -1;
                  return (
                    <div key={cliente.id} className="mb-4 p-3 border rounded-md hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`cliente-${cliente.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => handleClientSelectionChange(cliente.id!, !!checked)}
                          />
                          <label htmlFor={`cliente-${cliente.id}`} className="font-medium text-sm cursor-pointer">
                            {cliente.nombre} {cliente.apellido}
                          </label>
                        </div>
                        <span className="text-xs text-muted-foreground">{cliente.direccion}</span>
                      </div>
                      {isSelected && (
                        <div className="space-y-3 pl-7 pt-2 border-l ml-2 border-dashed">
                          <FormField
                            control={form.control}
                            name={`asignaciones_clientes.${asignacionIndex}.tipo_servicio_id`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs flex items-center gap-1"><Package size={14}/>Tipo de Servicio</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                  <FormControl><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Servicio..." /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {tiposServicio.map((ts) => <SelectItem key={ts.id} value={ts.id!}>{ts.nombre}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-xs"/>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`asignaciones_clientes.${asignacionIndex}.precio`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs flex items-center gap-1"><Banknote size={14}/>Precio</FormLabel>
                                <FormControl><Input type="number" step="0.01" className="h-9 text-xs" placeholder="0.00" {...field} 
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                /></FormControl>
                                <FormMessage className="text-xs"/>
                              </FormItem>
                            )}
                          />
                           <FormField
                            control={form.control}
                            name={`asignaciones_clientes.${asignacionIndex}.notas_envio`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs flex items-center gap-1"><Info size={14}/>Notas (Envío Individual)</FormLabel>
                                <FormControl><Textarea className="text-xs" placeholder="Notas específicas para este envío..." {...field} value={field.value ?? ""} /></FormControl>
                                <FormMessage className="text-xs"/>
                                </FormItem>
                            )}
                            />
                        </div>
                      )}
                    </div>
                  );
                })}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingClientes}>
          {(isSubmitting || isLoadingClientes) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Crear Reparto por Lote
        </Button>
      </form>
    </Form>
  );
}
