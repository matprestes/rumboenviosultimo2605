
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PackagePlus, Users, Truck, ListChecks, FilePlus, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge"; // Added Badge import

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
          <Card className="shadow-md hover:shadow-lg transition-shadow flex flex-col bg-muted rounded-2xl">
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

          <Card className="shadow-sm hover:shadow-lg transition-shadow flex flex-col rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Users className="h-10 w-10 text-accent mt-1" strokeWidth={2.5} />
                <div>
                  <CardTitle className="text-xl text-accent">Gestionar Clientes y Empresas</CardTitle>
                  <CardDescription className="text-sm">
                    Administra tu base de datos de clientes (individuales o vinculados) y las empresas asociadas.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
              <div className="mb-4 space-y-1.5">
                <Badge variant="secondary">Clientes activos</Badge>
                <Badge variant="secondary" className="ml-2">Empresas registradas</Badge>
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

          <Card className="shadow-md hover:shadow-lg transition-shadow flex flex-col rounded-2xl">
            <CardHeader className="pb-3">
               <div className="flex items-start gap-3">
                <Truck className="h-10 w-10 text-primary mt-1" strokeWidth={2.5} />
                 <div>
                  <CardTitle className="text-xl text-primary">Asignar Repartos</CardTitle>
                  <CardDescription className="text-sm">
                    Organiza y asigna envíos a tus repartidores para optimizar rutas.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-end">
               <div className="space-y-2">
                <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link href="/repartos/nuevo">Nuevo Reparto Individual</Link>
                </Button>
                 <Button asChild variant="outline" className="w-full">
                  <Link href="/repartos/lote/nuevo">Nuevo Reparto por Lote</Link>
                </Button>
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/repartos">Ver Repartos</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">Otras Gestiones</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-md hover:shadow-lg transition-shadow rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Building className="text-accent" /> Empresas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Administra las empresas con las que trabajas.</p>
              <Button asChild className="w-full" variant="outline"><Link href="/empresas">Gestionar Empresas</Link></Button>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-shadow rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><ListChecks className="text-accent" /> Repartidores</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Visualiza y gestiona tu equipo de repartidores.</p>
              <Button asChild className="w-full" variant="outline"><Link href="/repartidores">Gestionar Repartidores</Link></Button>
            </CardContent>
          </Card>
           <Card className="shadow-md hover:shadow-lg transition-shadow rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><FilePlus className="text-accent" /> Dos Ruedas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Pedidos rápidos para clientes registrados.</p>
              <Button asChild className="w-full" variant="outline"><Link href="/dos-ruedas">Nuevo Pedido Dos Ruedas</Link></Button>
            </CardContent>
          </Card>
        </div>
      </section>


      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">Próximas Funcionalidades</h2>
        <div className="grid md:grid-cols-2 gap-6">
            <ul className="list-disc list-inside space-y-1 text-muted-foreground bg-card p-4 rounded-lg shadow-sm">
                <li>Visualización de envíos en mapa interactivo.</li>
                <li>Optimización de rutas con IA.</li>
                <li>Configuración avanzada de tarifas y servicios.</li>
                <li>Geocodificación automática y validación de direcciones.</li>
                <li>Notificaciones y seguimiento en tiempo real.</li>
            </ul>
            <div className="p-6 border border-dashed border-border rounded-lg bg-card text-center flex flex-col items-center justify-center shadow-sm">
                <img src="https://placehold.co/600x300.png" alt="Mapa ilustrativo de Mar del Plata" data-ai-hint="map MarDelPlata" className="mx-auto mb-4 rounded opacity-70 shadow-sm max-w-xs sm:max-w-sm md:max-w-md" />
                <p className="text-muted-foreground text-sm">
                Imagina tus envíos visualizados y optimizados sobre el mapa de Mar del Plata.
                </p>
            </div>
        </div>
      </section>
    </div>
  );
}
