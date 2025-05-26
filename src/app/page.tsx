
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PackagePlus, Users, Truck, ListChecks, FilePlus, Building, Route, ClipboardList, Layers, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
          Bienvenido a Rumbos Envíos
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Tu centro de operaciones para la logística eficiente en Mar del Plata.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">Accesos Rápidos</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-md hover:shadow-lg transition-shadow flex flex-col bg-card rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <PackagePlus className="h-10 w-10 text-primary mt-1" strokeWidth={2.5} />
                <div>
                  <CardTitle className="text-xl text-primary">Nuevo Envío</CardTitle>
                  <CardDescription className="text-sm">
                    Registra un nuevo envío individual o creá múltiples desde una empresa.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
              <ul className="space-y-1.5 text-xs text-muted-foreground mb-4 list-disc list-inside pl-2">
                <li>Cargar origen y destino con geolocalización.</li>
                <li>Seleccionar tipo de servicio y paquete.</li>
                <li>Previsualizar precio sugerido.</li>
              </ul>
              <div className="space-y-2">
                <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link href="/envios/nuevo">Crear Envío Individual</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/envios">Ver Todos los Envíos</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-lg transition-shadow flex flex-col rounded-2xl bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Users className="h-10 w-10 text-accent mt-1" strokeWidth={2.5} />
                <div>
                  <CardTitle className="text-xl text-accent">Gestionar Clientes y Empresas</CardTitle>
                  <CardDescription className="text-sm">
                    Administra tu base de datos de clientes individuales o vinculados a empresas.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
              <div className="mb-4 space-y-1.5">
                <Badge variant="secondary">Clientes activos: N/A</Badge>
                <Badge variant="secondary" className="ml-1">Empresas: N/A</Badge>
                <p className="text-xs text-muted-foreground italic mt-1"> (Contadores dinámicos próximamente)</p>
              </div>
              <div className="space-y-2">
                <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Link href="/clientes">Gestionar Clientes</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/empresas">Gestionar Empresas</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow flex flex-col bg-card rounded-2xl">
            <CardHeader className="pb-3">
               <div className="flex items-start gap-3">
                <Truck className="h-10 w-10 text-accent mt-1" strokeWidth={2.5} />
                 <div>
                  <CardTitle className="text-xl text-accent">Asignar Repartos</CardTitle>
                  <CardDescription className="text-sm">
                    Organiza los envíos del día y asignalos a tus repartidores.
                  </CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
                <div className="mb-4">
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600 mb-2">Activos hoy: N/A</Badge>
                  <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside pl-2">
                    <li>Crear repartos individuales o por lote.</li>
                    <li>Ver paradas y clientes asignados.</li>
                    <li>Optimizar rutas con IA (próximamente).</li>
                  </ul>
                </div>
               <div className="space-y-2">
                <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Link href="/repartos">Gestionar Repartos</Link>
                </Button>
                 <Button asChild variant="outline" className="w-full">
                  <Link href="/repartos/nuevo">Nuevo Reparto</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">Otras Gestiones</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-md hover:shadow-lg transition-shadow rounded-2xl bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg"><Building className="text-primary" /> Empresas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Administra las empresas con las que trabajas.</p>
              <Button asChild className="w-full" variant="outline"><Link href="/empresas">Ir a Empresas</Link></Button>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-shadow rounded-2xl bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg"><Truck className="text-primary" /> Repartidores</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Visualiza y gestiona tu equipo de repartidores.</p>
              <Button asChild className="w-full" variant="outline"><Link href="/repartidores">Ir a Repartidores</Link></Button>
            </CardContent>
          </Card>
           <Card className="shadow-md hover:shadow-lg transition-shadow rounded-2xl bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg"><Route className="text-primary" /> Mapa de Envíos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Visualiza y asigna envíos desde el mapa.</p>
              <Button asChild className="w-full" variant="outline"><Link href="/mapa-envios">Ir al Mapa</Link></Button>
            </CardContent>
          </Card>
           <Card className="shadow-md hover:shadow-lg transition-shadow rounded-2xl bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg"><FilePlus className="text-primary" /> Dos Ruedas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Pedidos rápidos para clientes registrados.</p>
              <Button asChild className="w-full" variant="outline"><Link href="/dos-ruedas">Nuevo Pedido Rápido</Link></Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

    