
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings, Box, Truck, DollarSignIcon } from "lucide-react"; // Usamos DollarSignIcon para tarifas

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
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSignIcon size={20} /> Tarifas por Kilómetro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Gestión de tarifas para servicios express y lowcost.</p>
            {/* <Button asChild className="w-full" variant="outline"><Link href="/configuracion/tarifas">Ir a Tarifas</Link></Button> */}
             <div className="mt-4 flex items-center justify-center h-20 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <p className="text-xs text-muted-foreground">Próximamente...</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Truck size={20} /> Tipos de Servicio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">CRUD de tipos de servicio y precios base.</p>
            {/* <Button asChild className="w-full" variant="outline"><Link href="/configuracion/tipos-servicio">Ir a Tipos de Servicio</Link></Button> */}
             <div className="mt-4 flex items-center justify-center h-20 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <p className="text-xs text-muted-foreground">Próximamente...</p>
            </div>
          </CardContent>
        </Card>
         <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Box size={20} /> Tipos de Paquete</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">CRUD de tipos de paquete.</p>
             <Button asChild className="w-full" variant="outline">
              <Link href="/configuracion/tipos-paquete">Gestionar Tipos de Paquete</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    