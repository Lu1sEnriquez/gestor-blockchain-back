import type { ReactNode } from 'react';
import { AppSidebar } from './sidebar';
import { Header } from './header';
import type { SessionUser } from '@/lib/auth/config';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

interface DashboardShellProps {
  user: SessionUser;
  children: ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar userRoles={user.roles} />
        <SidebarInset>
          <Header user={user} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

// Page header component for consistency
interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      {icon && (
        <div className="mb-4 rounded-full bg-muted p-3 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Loading state component
export function LoadingState({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// Error state component
interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
}

export function ErrorState({
  title = 'Error',
  message,
  retry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
      <h3 className="text-lg font-semibold text-destructive">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="mt-4 text-sm font-medium text-primary hover:underline"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}
