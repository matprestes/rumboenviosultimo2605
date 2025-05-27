
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings, Box, Truck, DollarSignIcon } from "lucide-react"; 

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Settings size={32} />
          Configuración del Sistema
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra tarifas, tipos de servicio y tipos de paquete.
        </p>
      </header>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-2xl shadow-md">
          <CardHeader className="p-6">
            <CardTitle className="flex items-center gap-2 text-xl"><DollarSignIcon size={20} className="text-primary" /> Tarifas Generales</CardTitle>
             <CardDescription className="text-sm">Gestión de tipos de servicio y sus tarifas por distancia.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
             <Button asChild className="w-full" variant="outline">
              <Link href="/configuracion/tipos-servicio">Gestionar Servicios y Tarifas</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-md">
          <CardHeader className="p-6">
            <CardTitle className="flex items-center gap-2 text-xl"><Box size={20} className="text-primary"/> Tipos de Paquete</CardTitle>
            <CardDescription className="text-sm">Define los tamaños y categorías de paquetes.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
             <Button asChild className="w-full" variant="outline">
              <Link href="/configuracion/tipos-paquete">Gestionar Tipos de Paquete</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
