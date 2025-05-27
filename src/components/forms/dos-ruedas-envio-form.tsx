
"use client";

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DosRuedasEnvioFormSchema, type DosRuedasEnvioFormValues, type Cliente, type TipoServicio, type TarifaDistanciaCalculadora, type DosRuedasCalculatedShipment } from '@/lib/schemas';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, MapPin, CheckCircle, AlertTriangle, User, Truck, DollarSign } from 'lucide-react';
import { geocodeAddress, type GeocodeResult, getGoogleMapsApi } from '@/services/google-maps-service';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { getTarifasByTipoServicioAction, getTipoServicioByIdAction } from '@/actions/tipos-servicio.actions';

interface DosRuedasEnvioFormProps {
  onSubmit: (data: DosRuedasEnvioFormValues) => Promise<{ success: boolean; error?: string; data?: any }>;
  clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'telefono' | 'latitud' | 'longitud'>[];
  tiposServicio: TipoServicio[];
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  onShipmentCalculated: (data: DosRuedasCalculatedShipment | null) => void; // New prop
}

export function DosRuedasEnvioForm({
  onSubmit,
  clientes,
  tiposServicio,
  isSubmitting,
  setIsSubmitting,
  onShipmentCalculated, // New prop
}: DosRuedasEnvioFormProps) {
  const { toast } = useToast();
  const [googleMaps, setGoogleMaps] = React.useState<typeof google | null>(null);
  const [isMapsApiReady, setIsMapsApiReady] = React.useState(false);
  const [isGeocodingDest, setIsGeocodingDest] = React.useState(false);
  const [geocodedDest, setGeocodedDest] = React.useState<GeocodeResult | null>(null);
  const [selectedSender, setSelectedSender] = React.useState<Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'telefono' | 'latitud' | 'longitud'> | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = React.useState(false);
  const [calculatedDistance, setCalculatedDistance] = React.useState<number | null>(null);

  const form = useForm<DosRuedasEnvioFormValues>({
    resolver: zodResolver(DosRuedasEnvioFormSchema),
    defaultValues: {
      remitente_cliente_id: '',
      nombre_destinatario: '',
      telefono_destinatario: '',
      direccion_destino: '',
      tipo_servicio_id: tiposServicio.length > 0 ? tiposServicio[0].id : '',
      horario_retiro_desde: "",
      horario_entrega_hasta: "",
      precio: 0,
      detalles_adicionales: "",
    },
  });
  
  React.useEffect(() => {
    getGoogleMapsApi()
      .then((api) => {
        setGoogleMaps(api);
        setIsMapsApiReady(true);
      })
      .catch((error) => {
        console.error("Failed to load Google Maps API in DosRuedasEnvioForm:", error);
        toast({
          title: "Error de Mapa",
          description: "No se pudo cargar la API de Google Maps. Funcionalidades de mapa y cálculo de precio estarán limitadas.",
          variant: "destructive",
        });
      });
  }, [toast]);

  const selectedSenderId = form.watch('remitente_cliente_id');
  const selectedTipoServicioId = form.watch('tipo_servicio_id');
  const direccionDestino = form.watch('direccion_destino'); 

  React.useEffect(() => {
    const cliente = clientes.find(c => c.id === selectedSenderId);
    setSelectedSender(cliente || null);
    form.setValue('precio', 0);
    setCalculatedDistance(null);
    onShipmentCalculated(null); // Clear summary when sender changes
  }, [selectedSenderId, clientes, form, onShipmentCalculated]);


  const calculateAndSetPrice = React.useCallback(async () => {
    if (!isMapsApiReady || !googleMaps || !selectedSender || !selectedSender.latitud || !selectedSender.longitud || !geocodedDest || !geocodedDest.lat || !geocodedDest.lng || !selectedTipoServicioId) {
      form.setValue('precio', 0);
      setCalculatedDistance(null);
      onShipmentCalculated(null);
      return;
    }

    setIsCalculatingPrice(true);
    form.setValue('precio', 0); 
    setCalculatedDistance(null);
    onShipmentCalculated(null);

    let distanceKm = 0;
    let calculationMethod = "No se pudo calcular.";

    try {
      const directionsService = new googleMaps.maps.DirectionsService();
      const request: google.maps.DirectionsRequest = {
        origin: { lat: selectedSender.latitud, lng: selectedSender.longitud },
        destination: { lat: geocodedDest.lat, lng: geocodedDest.lng },
        travelMode: googleMaps.maps.TravelMode.DRIVING,
        region: 'AR', // Bias towards Argentina
      };

      const directionsResult = await new Promise<google.maps.DirectionsResult | null>((resolve, reject) => {
        directionsService.route(request, (result, status) => {
          if (status === googleMaps.maps.DirectionsStatus.OK && result) {
            resolve(result);
          } else {
            console.error(`Error de Directions API: ${status}`);
            reject(new Error(`No se pudo calcular la ruta: ${status}`));
          }
        });
      });

      if (directionsResult && directionsResult.routes && directionsResult.routes.length > 0) {
        const route = directionsResult.routes[0];
        if (route.legs && route.legs.length > 0 && route.legs[0].distance) {
          distanceKm = route.legs[0].distance.value / 1000;
          setCalculatedDistance(parseFloat(distanceKm.toFixed(2)));
        } else {
          throw new Error("No se pudo obtener la distancia de la ruta.");
        }
      } else {
        throw new Error("No se encontraron rutas.");
      }

      const { tipoServicio, error: tsError } = await getTipoServicioByIdAction(selectedTipoServicioId);
      const { tarifas, error: tarifasError } = await getTarifasByTipoServicioAction(selectedTipoServicioId);

      if (tsError || tarifasError || !tipoServicio) {
        throw new Error("No se pudieron obtener las tarifas del servicio.");
      }

      let calculatedPrice = 0;
      let specificTariffApplied = false;
      
      if (tarifas && tarifas.length > 0) {
        const sortedTarifas = [...tarifas].sort((a, b) => a.distancia_min_km - b.distancia_min_km);
        
        // Check specific ranges
        for (const tarifa of sortedTarifas) {
          if (distanceKm >= tarifa.distancia_min_km && distanceKm <= tarifa.distancia_max_km) {
            calculatedPrice = tarifa.precio_por_km; // This is the fixed total price for the range
            specificTariffApplied = true;
            calculationMethod = `Tarifa por rango (${tarifa.distancia_min_km}km - ${tarifa.distancia_max_km}km) aplicada.`;
            break;
          }
        }

        // Check if exceeding highest defined range
        if (!specificTariffApplied && sortedTarifas.length > 0) {
          const tarifaMasAlta = sortedTarifas[sortedTarifas.length - 1];
          if (distanceKm > tarifaMasAlta.distancia_max_km) {
            if (tipoServicio.precio_base && tipoServicio.precio_base > 0) {
              const distanciaExcedente = distanceKm - tarifaMasAlta.distancia_max_km;
              calculatedPrice = tarifaMasAlta.precio_por_km + (distanciaExcedente * tipoServicio.precio_base);
              specificTariffApplied = true; // Technically it's an extension of a specific tariff
              calculationMethod = `Tarifa rango alto ($${tarifaMasAlta.precio_por_km.toFixed(2)}) + excedente ($${tipoServicio.precio_base.toFixed(2)}/km).`;
            } else {
              calculatedPrice = tarifaMasAlta.precio_por_km; // No extra cost for exceeding if no service base price
              specificTariffApplied = true;
              calculationMethod = `Tarifa rango alto ($${tarifaMasAlta.precio_por_km.toFixed(2)}) aplicada (sin costo por km excedente).`;
              toast({ title: "Advertencia de Precio", description: "El servicio no tiene precio base configurado para calcular costo por km excedente. Se aplicó la tarifa del rango más alto.", variant: "default", duration: 7000 });
            }
          }
        }
      }
      
      // Fallback to general service rates
      if (!specificTariffApplied) {
        calculatedPrice = (tipoServicio.precio_base || 0) + (distanceKm * (tipoServicio.precio_extra_km_default || 0));
        if (tipoServicio.precio_extra_km_default === null || tipoServicio.precio_extra_km_default === undefined || tipoServicio.precio_extra_km_default === 0) {
            calculationMethod = `Precio base del servicio ($${(tipoServicio.precio_base || 0).toFixed(2)}) aplicado (sin tarifa por KM adicional).`;
        } else {
            calculationMethod = `Precio base ($${(tipoServicio.precio_base || 0).toFixed(2)}) + $${(tipoServicio.precio_extra_km_default || 0).toFixed(2)}/km aplicado.`;
        }
      }
      
      const finalPrice = parseFloat(calculatedPrice.toFixed(2));
      form.setValue('precio', finalPrice);
      toast({ title: "Precio Estimado Calculado", description: `${calculationMethod} Distancia: ${distanceKm.toFixed(2)} km. Total: $${finalPrice.toFixed(2)}`, duration: 8000});

      const formDataValues = form.getValues();
      onShipmentCalculated({
        remitenteNombre: `${selectedSender.nombre} ${selectedSender.apellido}`,
        remitenteDireccion: selectedSender.direccion,
        remitenteTelefono: selectedSender.telefono,
        destinatarioNombre: formDataValues.nombre_destinatario,
        destinatarioTelefono: formDataValues.telefono_destinatario,
        destinatarioDireccion: geocodedDest.formattedAddress,
        destinatarioLat: geocodedDest.lat,
        destinatarioLng: geocodedDest.lng,
        tipoServicioNombre: tipoServicio.nombre,
        horarioRetiro: formDataValues.horario_retiro_desde || null,
        horarioEntrega: formDataValues.horario_entrega_hasta || null,
        precioCalculado: finalPrice,
        distanciaKm: parseFloat(distanceKm.toFixed(2)),
        detallesAdicionales: formDataValues.detalles_adicionales || null,
        calculationMethod: calculationMethod,
      });

    } catch (error: any) {
      toast({ title: "Error Calculando Precio", description: error.message || "Ocurrió un error.", variant: "destructive" });
      form.setValue('precio', 0);
      setCalculatedDistance(null);
      onShipmentCalculated(null);
    } finally {
      setIsCalculatingPrice(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
      isMapsApiReady, 
      googleMaps, 
      selectedSender, 
      geocodedDest, 
      selectedTipoServicioId, 
      form, 
      toast, 
      onShipmentCalculated
  ]);

  React.useEffect(() => {
    calculateAndSetPrice();
  }, [calculateAndSetPrice]);


  const handleGeocodeDest = async () => {
    if (!isMapsApiReady || !googleMaps) {
      toast({ title: "API de Mapas no lista", description: "Espere a que cargue.", variant: "default" });
      return;
    }
    const addressValue = form.getValues("direccion_destino");
    if (!addressValue || addressValue.trim().length < 5) {
      toast({ title: "Error de Dirección", description: "Por favor, ingrese una dirección de entrega más completa.", variant: "destructive" });
      return;
    }
    setIsGeocodingDest(true);
    setGeocodedDest(null); 
    form.setValue('precio', 0); 
    setCalculatedDistance(null);
    onShipmentCalculated(null); // Clear summary during geocoding

    try {
      const result = await geocodeAddress(addressValue);
      if (result) {
        form.setValue("direccion_destino", result.formattedAddress, { shouldValidate: true });
        setGeocodedDest(result); 
        toast({ title: "Geocodificación Exitosa", description: `Dirección de entrega verificada: ${result.formattedAddress}` });
        // Price calculation will be triggered by useEffect watching geocodedDest
      } else {
        toast({ title: "Error de Geocodificación", description: "No se pudo encontrar la dirección de entrega o está fuera de Mar del Plata.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error de Geocodificación", description: error.message || "Ocurrió un error al procesar la dirección de entrega.", variant: "destructive" });
    } finally {
      setIsGeocodingDest(false);
    }
  };

  const processSubmit = async (formDataValues: DosRuedasEnvioFormValues) => {
    if (!selectedSender || !selectedSender.id) {
        toast({title: "Error de Remitente", description: "Por favor, seleccione un remitente.", variant: "destructive"});
        return;
    }
    if (!selectedSender.latitud || !selectedSender.longitud) {
      toast({title: "Error de Remitente", description: "El cliente remitente no tiene coordenadas. Por favor, actualice los datos del cliente.", variant: "destructive"});
      return;
    }
     if (!geocodedDest || !geocodedDest.lat || !geocodedDest.lng) {
      toast({title: "Error de Destinatario", description: "La dirección de destino no ha sido geocodificada. Por favor, verifíquela.", variant: "destructive"});
      return;
    }
    if (isCalculatingPrice) {
      toast({title: "Calculando Precio", description: "Por favor espere a que termine el cálculo de precio antes de enviar.", variant: "default"});
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit(formDataValues); 
    setIsSubmitting(false);
     if (result.success) {
      form.reset({ 
        remitente_cliente_id: '',
        nombre_destinatario: '',
        telefono_destinatario: '',
        direccion_destino: '',
        tipo_servicio_id: tiposServicio.length > 0 ? tiposServicio[0].id : '',
        horario_retiro_desde: "",
        horario_entrega_hasta: "",
        precio: 0,
        detalles_adicionales: "",
      });
      setSelectedSender(null);
      setGeocodedDest(null);
      setCalculatedDistance(null);
      onShipmentCalculated(null); // Clear summary on successful submission
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-6">
        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><User className="text-primary" /> Información de Quién Envía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="remitente_cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de quien envía*</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setGeocodedDest(null); 
                      form.setValue('direccion_destino', ''); 
                      form.setValue('precio', 0);
                      setCalculatedDistance(null);
                      onShipmentCalculated(null);
                    }} 
                    value={field.value} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un cliente remitente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id!}>
                          {cliente.nombre} {cliente.apellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedSender && (
              <>
                <FormItem>
                  <FormLabel>Teléfono (Remitente)</FormLabel>
                  <Input value={selectedSender.telefono || 'N/A'} readOnly disabled className="bg-muted/50"/>
                </FormItem>
                <FormItem>
                  <FormLabel>Dirección de retiro*</FormLabel>
                  <Input value={selectedSender.direccion || 'N/A'} readOnly disabled className="bg-muted/50"/>
                   {selectedSender.latitud && selectedSender.longitud ? (
                     <FormDescription className="text-green-600 flex items-center gap-1 mt-1"><CheckCircle size={16}/> Dirección verificada.</FormDescription>
                   ) : (
                     <FormDescription className="text-orange-600 flex items-center gap-1 mt-1"><AlertTriangle size={16}/> Cliente sin coordenadas. Contactar admin.</FormDescription>
                   )}
                </FormItem>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><User className="text-accent" /> Información de Quién Recibe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nombre_destinatario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de quien recibe*</FormLabel>
                  <FormControl><Input placeholder="Ej: Ana Gonzalez" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono_destinatario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono (Destinatario)*</FormLabel>
                  <FormControl><Input type="tel" placeholder="Ej: +542236602699" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direccion_destino"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección de entrega*</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl className="flex-grow"><Input 
                        placeholder="Ej: 11 de Septiembre 3687, Mar del Plata" 
                        {...field} 
                        value={field.value ?? ""}
                        onChange={(e) => {
                            field.onChange(e);
                            setGeocodedDest(null); 
                            form.setValue('precio', 0);
                            setCalculatedDistance(null);
                            onShipmentCalculated(null);
                        }}
                    /></FormControl>
                    <Button type="button" onClick={handleGeocodeDest} disabled={isGeocodingDest || !isMapsApiReady || !field.value} variant="outline" size="icon" title="Verificar Dirección">
                      {isGeocodingDest ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    </Button>
                  </div>
                  {!isMapsApiReady && <FormDescription className="text-orange-600">API de Mapas no disponible para verificar.</FormDescription>}
                  {geocodedDest?.formattedAddress && <FormDescription className="text-green-600 flex items-center gap-1 mt-1"><CheckCircle size={16} /> Dirección verificada: {geocodedDest.formattedAddress}</FormDescription>}
                  {!isGeocodingDest && form.formState.dirtyFields.direccion_destino && !geocodedDest?.formattedAddress && field.value && <FormDescription className="text-orange-600 flex items-center gap-1 mt-1"><AlertTriangle size={16}/> Por favor, verifique la dirección.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader><CardTitle className="flex items-center text-lg gap-2"><Truck className="text-primary"/>Detalles del Servicio y Envío</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="tipo_servicio_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Servicio*</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('precio', 0); 
                        setCalculatedDistance(null);
                        onShipmentCalculated(null);
                    }} 
                    value={field.value} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un tipo de servicio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tiposServicio.map((servicio) => (
                        <SelectItem key={servicio.id} value={servicio.id!}>
                          {servicio.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="horario_retiro_desde"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horario inicial de retiro (HH:MM)</FormLabel>
                    <FormControl><Input type="time" placeholder="Ej: 09:00" {...field} value={field.value ?? ""} /></FormControl>
                    <FormDescription>Desde que hora se puede retirar.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="horario_entrega_hasta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horario límite de entrega (HH:MM)</FormLabel>
                    <FormControl><Input type="time" placeholder="Ej: 18:00" {...field} value={field.value ?? ""} /></FormControl>
                    <FormDescription>Hasta que hora se puede entregar.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="precio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <DollarSign size={16} /> Monto a cobrar (Estimado)
                    {isCalculatingPrice && <Loader2 className="h-4 w-4 animate-spin text-primary ml-2" />}
                  </FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} 
                    readOnly 
                    className="bg-muted/80 cursor-not-allowed font-semibold"
                    value={field.value ?? 0}
                  /></FormControl>
                  <FormDescription>El precio se calcula automáticamente. Será confirmado por un operador.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="detalles_adicionales"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalles adicionales</FormLabel>
                  <FormControl><Textarea placeholder="Instrucciones especiales, tipo de paquete (ej: sobre, caja pequeña), etc." {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          className="w-full bg-teal-500 hover:bg-teal-600 text-white" 
          disabled={isSubmitting || isGeocodingDest || !isMapsApiReady || isCalculatingPrice}
        >
          {(isSubmitting || isGeocodingDest || isCalculatingPrice) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Hacer pedido
        </Button>
      </form>
    </Form>
  );
}

    
