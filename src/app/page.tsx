
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PackagePlus, Users, Truck } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
          Bienvenido a Rumbos Envíos
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Tu panel de control para la gestión logística en Mar del Plata.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PackagePlus className="text-accent" />
              <span>Nuevo Envío</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Registra un nuevo envío individual o por lote de forma rápida.
            </p>
            <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/envios/nuevo">Crear Envío</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="text-primary" />
              <span>Gestionar Clientes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Administra tu base de datos de clientes y empresas asociadas.
            </p>
            <Button asChild className="w-full">
              <Link href="/clientes">Ver Clientes</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Truck className="text-secondary-foreground" />
              <span>Asignar Repartos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Organiza y asigna envíos a tus repartidores para optimizar rutas.
            </p>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/repartos">Gestionar Repartos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Próximas Funcionalidades</h2>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Visualización de envíos en mapa interactivo.</li>
          <li>Optimización de rutas con IA.</li>
          <li>Configuración avanzada de tarifas y servicios.</li>
          <li>Geocodificación automática y validación de direcciones.</li>
        </ul>
         <div className="mt-6 p-6 border border-dashed border-muted-foreground/50 rounded-lg bg-card text-center">
            <img src="https://placehold.co/600x300.png" alt="Mapa ilustrativo de Mar del Plata" data-ai-hint="map MarDelPlata" className="mx-auto mb-4 rounded opacity-70 shadow-sm" />
            <p className="text-muted-foreground">
              Imagina tus envíos visualizados y optimizados sobre el mapa de Mar del Plata.
            </p>
          </div>
      </section>
    </div>
  );
}
