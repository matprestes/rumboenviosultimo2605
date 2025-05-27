
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
import { Sheet, SheetContent, SheetHeader as UiSheetHeader, SheetTitle as UiSheetTitle } from "@/components/ui/sheet"; 
import { Button } from '@/components/ui/button';
import { Home, Building2, Users, Truck, Package, ClipboardList, MapIcon, Settings, ShipWheel, Route, ClipboardPlus, Layers, ChevronRight, Box, DollarSignIcon } from 'lucide-react';
import { Separator } from './ui/separator';
import { cn } from "@/lib/utils";

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/empresas', label: 'Empresas', icon: Building2 },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/repartidores', label: 'Repartidores', icon: Truck },
  { href: '/envios', label: 'Envíos', icon: Package },
  {
    label: 'Repartos',
    icon: ClipboardList,
    subItems: [
      { href: '/repartos', label: 'Ver Repartos', icon: ClipboardList },
      { href: '/repartos/nuevo', label: 'Nuevo Reparto Individual', icon: ClipboardPlus },
      { href: '/repartos/lote/nuevo', label: 'Nuevo Reparto por Lote', icon: Layers },
    ]
  },
  { href: '/mapa-envios', label: 'Mapa de Envíos', icon: Route },
  { type: 'separator' as const },
  { 
    label: 'Configuración', 
    icon: Settings,
    subItems: [
        { href: '/configuracion/tipos-paquete', label: 'Tipos de Paquete', icon: Box },
        { href: '/configuracion/tipos-servicio', label: 'Tipos de Servicio y Tarifas', icon: DollarSignIcon },
    ]
  },
];

function MainNavigation() {
  const pathname = usePathname();
  const { open, isMobile } = useSidebar();
  const [openSubMenus, setOpenSubMenus] = React.useState<Record<string, boolean>>(() => {
    const initialOpen: Record<string, boolean> = {};
    navItems.forEach(item => {
      if (item.subItems && item.subItems.some(sub => pathname === sub.href || (sub.href !== "/" && pathname.startsWith(sub.href!)))) {
        initialOpen[item.label!] = true;
      }
    });
    return initialOpen;
  });

  const toggleSubMenu = (label: string) => {
    setOpenSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  React.useEffect(() => {
    if (!open && !isMobile) {
      const activeSubMenus: Record<string, boolean> = {};
      navItems.forEach(item => {
        if (item.subItems && item.subItems.some(sub => pathname === sub.href || (sub.href !== "/" && pathname.startsWith(sub.href!)))) {
          activeSubMenus[item.label!] = true;
        }
      });
      setOpenSubMenus(prev => ({...prev, ...activeSubMenus}));
    }
  }, [open, isMobile, pathname]);

  return (
    <SidebarMenu>
      {navItems.map((item, index) => {
        if (item.type === 'separator') {
          return <Separator key={`sep-${index}`} className="my-2" />;
        }
        const Icon = item.icon!;
        const isActiveParent = item.subItems?.some(sub => pathname === sub.href || (sub.href !== "/" && pathname.startsWith(sub.href!)));

        if (item.subItems) {
          return (
            <SidebarMenuItem key={item.label} className="flex flex-col items-start">
              <SidebarMenuButton
                onClick={() => toggleSubMenu(item.label!)}
                isActive={!!isActiveParent}
                className="w-full"
                tooltip={open ? undefined : item.label}
              >
                <Icon />
                <span>{item.label}</span>
                <ChevronRight className={cn("ml-auto h-4 w-4 transform transition-transform duration-200", openSubMenus[item.label!] && "rotate-90")} />
              </SidebarMenuButton>
              {(openSubMenus[item.label!] || (open && !isMobile && isActiveParent)) && (
                 <SidebarMenu className={cn("ml-0 pl-0 mt-1 w-full", (!open && !isMobile) && "!hidden")}>
                  {item.subItems.map(subItem => {
                     const SubIcon = subItem.icon!;
                     const isSubItemActive = pathname === subItem.href || (subItem.href !== "/" && pathname.startsWith(subItem.href!));
                     return (
                        <SidebarMenuItem key={subItem.href}>
                        <SidebarMenuButton
                            asChild
                            isActive={isSubItemActive}
                            className="pl-7" 
                            tooltip={open ? undefined : subItem.label}
                        >
                            <Link href={subItem.href!}>
                                <SubIcon />
                                <span>{subItem.label}</span>
                            </Link>
                        </SidebarMenuButton>
                        </SidebarMenuItem>
                     )
                  })}
                </SidebarMenu>
              )}
            </SidebarMenuItem>
          );
        }

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href!))}
              tooltip={open ? undefined : item.label}
            >
              <Link href={item.href!}>
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
          {/* <SheetTitle className="sr-only">Menú Principal Rumbos Envíos</SheetTitle> */}
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
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
          <div className="md:hidden">
             <SidebarTrigger />
          </div>
          <div className="flex-1">
          </div>
          <div className="ml-auto">
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 h-[calc(100vh-3.5rem)] overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

    