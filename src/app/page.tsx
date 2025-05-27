
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PackagePlus, Users, Truck, Building, Route, FilePlus, ClipboardList, Layers, Sparkles, Settings } from "lucide-react"; // Added Settings
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="py-8 text-center bg-card border border-border rounded-2xl shadow-lg">
        <Sparkles className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
        <h1 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
          Bienvenido a Rumbos Envíos
        </h1>
        <p className="mt-3 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
          Tu centro de operaciones para la logística eficiente en Mar del Plata.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6 text-center sm:text-left">Accesos Rápidos</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Tarjeta Nuevo Envío */}
          <Card className="shadow-md hover:shadow-xl transition-shadow flex flex-col bg-muted rounded-2xl border-primary/40">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                <PackagePlus className="h-10 w-10 text-primary flex-shrink-0 mt-1" strokeWidth={2.25} />
                <div>
                  <CardTitle className="text-xl font-semibold text-primary">Nuevo Envío</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Registra envíos individuales o pedidos rápidos.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between space-y-3">
              <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside pl-1">
                <li>Origen y destino con geolocalización.</li>
                <li>Selección de tipo de servicio y paquete.</li>
                <li>Previsualizar precio sugerido.</li>
              </ul>
              <div className="space-y-2 pt-2">
                <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link href="/envios/nuevo">Crear Envío Detallado</Link>
                </Button>
                 <Button asChild variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/10 hover:text-primary">
                  <Link href="/dos-ruedas">Pedido Rápido (DosRuedas)</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta Gestionar Clientes y Empresas */}
          <Card className="shadow-md hover:shadow-xl transition-shadow flex flex-col bg-card rounded-2xl border-border">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                <Users className="h-10 w-10 text-accent flex-shrink-0 mt-1" strokeWidth={2.25} />
                <div>
                  <CardTitle className="text-xl font-semibold text-accent">Clientes y Empresas</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Administra tu base de datos completa.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between space-y-3">
              <div className="space-y-1.5 text-xs">
                <Badge variant="secondary">Clientes activos: N/A</Badge>
                <Badge variant="secondary" className="ml-1">Empresas: N/A</Badge>
                <p className="text-muted-foreground italic mt-1 text-xs">(Contadores dinámicos próximamente)</p>
              </div>
              <div className="space-y-2 pt-2">
                <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Link href="/clientes">Gestionar Clientes</Link>
                </Button>
                <Button asChild variant="outline" className="w-full border-accent/50 text-accent hover:bg-accent/10 hover:text-accent">
                  <Link href="/empresas">Gestionar Empresas</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta Asignar Repartos */}
          <Card className="shadow-md hover:shadow-xl transition-shadow flex flex-col bg-card rounded-2xl border-border">
            <CardHeader className="pb-4">
               <div className="flex items-start gap-4">
                <Truck className="h-10 w-10 text-green-600 flex-shrink-0 mt-1" strokeWidth={2.25} />
                 <div>
                  <CardTitle className="text-xl font-semibold text-green-700 dark:text-green-500">Repartos y Rutas</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Organiza, asigna y optimiza entregas.
                  </CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-xs">Activos hoy: N/A</Badge>
                  <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside pl-1">
                    <li>Crear repartos individuales o por lote.</li>
                    <li>Visualizar y optimizar rutas en mapa.</li>
                    <li>Seguimiento de estado de paradas.</li>
                  </ul>
                </div>
               <div className="space-y-2 pt-2">
                <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <Link href="/repartos">Gestionar Repartos</Link>
                </Button>
                 <Button asChild variant="outline" className="w-full border-green-600/50 text-green-700 dark:text-green-500 hover:bg-green-600/10 hover:text-green-700">
                  <Link href="/repartos/nuevo">Nuevo Reparto</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6 text-center sm:text-left">Otras Gestiones y Configuración</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm hover:shadow-lg transition-shadow rounded-2xl bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg"><Route className="text-primary" /> Mapa General</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col justify-between h-full">
              <p className="text-sm text-muted-foreground mb-4">Visualiza y asigna envíos no asignados.</p>
              <Button asChild className="w-full mt-auto" variant="outline"><Link href="/mapa-envios">Ir al Mapa de Envíos</Link></Button>
            </CardContent>
          </Card>
           <Card className="shadow-sm hover:shadow-lg transition-shadow rounded-2xl bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg"><ClipboardList className="text-primary" /> Todos los Envíos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col justify-between h-full">
              <p className="text-sm text-muted-foreground mb-4">Listado completo de todos los envíos.</p>
              <Button asChild className="w-full mt-auto" variant="outline"><Link href="/envios">Ver Todos los Envíos</Link></Button>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover:shadow-lg transition-shadow rounded-2xl bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg"><Truck className="text-primary" /> Repartidores</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col justify-between h-full">
              <p className="text-sm text-muted-foreground mb-4">Gestiona tu equipo de repartidores.</p>
              <Button asChild className="w-full mt-auto" variant="outline"><Link href="/repartidores">Ir a Repartidores</Link></Button>
            </CardContent>
          </Card>
           <Card className="shadow-sm hover:shadow-lg transition-shadow rounded-2xl bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg"><Settings className="text-primary" /> Configuración</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col justify-between h-full">
              <p className="text-sm text-muted-foreground mb-4">Tipos de paquete, servicios y tarifas.</p>
              <Button asChild className="w-full mt-auto" variant="outline"><Link href="/configuracion">Ir a Configuración</Link></Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
