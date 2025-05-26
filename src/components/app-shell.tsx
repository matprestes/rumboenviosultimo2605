
"use client"

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Home, Building2, Users, Truck, Package, ClipboardList, MapIcon, Settings, ShipWheel } from 'lucide-react'; // ShipWheel as logo
import { Separator } from './ui/separator';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/empresas', label: 'Empresas', icon: Building2 },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/repartidores', label: 'Repartidores', icon: Truck },
  { href: '/envios', label: 'Envíos', icon: Package },
  { href: '/repartos', label: 'Repartos', icon: ClipboardList },
  { href: '/mapa', label: 'Mapa de Envíos', icon: MapIcon },
  { type: 'separator' },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
];

function MainNavigation() {
  const pathname = usePathname();
  const { open } = useSidebar();

  return (
    <SidebarMenu>
      {navItems.map((item, index) => {
        if (item.type === 'separator') {
          return <Separator key={`sep-${index}`} className="my-2" />;
        }
        const Icon = item.icon;
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
              tooltip={open ? undefined : item.label} // Show tooltip only when collapsed
            >
              <Link href={item.href}>
                <Icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <ShipWheel className="h-8 w-8 text-primary" />
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-primary group-data-[collapsible=icon]:hidden">Rumbos Envíos</h2>
              <p className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Mar del Plata</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainNavigation />
        </SidebarContent>
        <SidebarFooter className="p-2">
          {/* Footer content if any, e.g. user profile, logout */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
          <div className="md:hidden"> {/* Only show trigger on mobile/tablet, Sidebar component handles its own trigger visibility */}
             <SidebarTrigger />
          </div>
          <div className="flex-1">
            {/* Breadcrumbs or dynamic page title can go here */}
          </div>
          <div className="ml-auto">
            {/* Theme toggle, User avatar etc. */}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
