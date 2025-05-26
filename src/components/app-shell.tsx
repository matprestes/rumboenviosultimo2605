
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
  SidebarMenuSub,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Home, Building2, Users, Truck, Package, ClipboardList, MapIcon, Settings, ShipWheel, Route, ClipboardPlus, Layers } from 'lucide-react'; // Added Layers for Reparto Lote
import { Separator } from './ui/separator';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/empresas', label: 'Empresas', icon: Building2 },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/repartidores', label: 'Repartidores', icon: Truck },
  { href: '/envios', label: 'Envíos', icon: Package },
  { 
    label: 'Repartos', 
    icon: ClipboardPlus,
    subItems: [
      { href: '/repartos', label: 'Ver Repartos', icon: ClipboardList },
      { href: '/repartos/nuevo', label: 'Nuevo Reparto Individual', icon: ClipboardPlus },
      { href: '/repartos/lote/nuevo', label: 'Nuevo Reparto por Lote', icon: Layers },
    ]
  },
  { href: '/mapa-envios', label: 'Mapa de Envíos', icon: Route },
  { type: 'separator' as const },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
];

function MainNavigation() {
  const pathname = usePathname();
  const { open, isMobile } = useSidebar();
  const [openSubMenus, setOpenSubMenus] = React.useState<Record<string, boolean>>({});

  const toggleSubMenu = (label: string) => {
    setOpenSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };
  
  React.useEffect(() => {
    // Collapse submenus when main sidebar collapses, unless on mobile where it's an overlay
    if (!open && !isMobile) {
      setOpenSubMenus({});
    }
  }, [open, isMobile]);


  return (
    <SidebarMenu>
      {navItems.map((item, index) => {
        if (item.type === 'separator') {
          return <Separator key={`sep-${index}`} className="my-2" />;
        }
        const Icon = item.icon;
        const isActiveParent = item.subItems?.some(sub => pathname === sub.href || (sub.href !== "/" && pathname.startsWith(sub.href)));

        if (item.subItems) {
          return (
            <SidebarMenuItem key={item.label} className="flex flex-col items-start">
              <SidebarMenuButton
                onClick={() => toggleSubMenu(item.label)}
                isActive={isActiveParent}
                className="w-full"
                tooltip={open ? undefined : item.label} 
              >
                <Icon />
                <span>{item.label}</span>
                <ChevronRight className={cn("ml-auto h-4 w-4 transform transition-transform duration-200", openSubMenus[item.label] && "rotate-90", (open && isMobile && openSubMenus[item.label]) && "rotate-90")} />
              </SidebarMenuButton>
              {(openSubMenus[item.label] || (open && !isMobile && isActiveParent)) && ( // Keep open if active and sidebar is open on desktop
                 <SidebarMenuSub className={cn("ml-0 pl-0 mt-1 w-full", !open && !isMobile && "!hidden")}>
                  {item.subItems.map(subItem => {
                     const SubIcon = subItem.icon;
                     return (
                        <SidebarMenuSubItem key={subItem.href}>
                        <SidebarMenuSubButton 
                            asChild 
                            isActive={pathname === subItem.href || (subItem.href !== "/" && pathname.startsWith(subItem.href))}
                        >
                            <Link href={subItem.href}>
                                <SubIcon />
                                <span>{subItem.label}</span>
                            </Link>
                        </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                     )
                  })}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          );
        }

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
              tooltip={open ? undefined : item.label} 
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
          <div className="md:hidden"> 
             <SidebarTrigger />
          </div>
          <div className="flex-1">
            {/* Breadcrumbs or dynamic page title can go here */}
          </div>
          <div className="ml-auto">
            {/* Theme toggle, User avatar etc. */}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 h-[calc(100vh-3.5rem)] overflow-auto"> 
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Helper icon, can be moved to a utility file if used elsewhere
const ChevronRight = (props: React.ComponentProps<"svg">) => (
  <svg viewBox="0 0 16 16" fill="currentColor" {...props}>
    <path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 8 8.22 4.03a.75.75 0 0 1 0-1.06Z" />
  </svg>
);
