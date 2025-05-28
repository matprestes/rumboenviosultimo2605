
// src/components/ui/page-header.tsx
import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionButton?: React.ReactNode;
}

export function PageHeader({ title, description, icon: Icon, actionButton }: PageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          {Icon && <Icon size={32} strokeWidth={2.5} />}
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actionButton && <div className="w-full sm:w-auto">{actionButton}</div>}
    </header>
  );
}
