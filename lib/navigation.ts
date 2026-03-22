import { UserRole } from '@/lib/types';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Users,
  Shield,
  Search,
  Settings,
  PenTool,
  Lock,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[]; // Roles que pueden ver este item
  description?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Navegacion principal del dashboard
export const dashboardNavigation: NavSection[] = [
  {
    title: 'Principal',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: [UserRole.ADMIN, UserRole.CREATOR, UserRole.SIGNER, UserRole.AUDITOR],
        description: 'Vista general y KPIs',
      },
    ],
  },
  {
    title: 'Gestion Documental',
    items: [
      {
        title: 'Plantillas',
        href: '/dashboard/templates',
        icon: FileText,
        roles: [UserRole.ADMIN, UserRole.CREATOR],
        description: 'Administrar plantillas de documentos',
      },
      {
        title: 'Eventos',
        href: '/dashboard/events',
        icon: Calendar,
        roles: [UserRole.ADMIN, UserRole.CREATOR, UserRole.SIGNER],
        description: 'Crear y gestionar eventos documentales',
      },
      {
        title: 'Bandeja de Firmas',
        href: '/dashboard/approvals',
        icon: PenTool,
        roles: [UserRole.SIGNER],
        description: 'Eventos pendientes de tu aprobacion y firma',
      },
      {
        title: 'Boveda Digital',
        href: '/dashboard/vault',
        icon: Lock,
        roles: [UserRole.SIGNER],
        description: 'Gestiona tu firma autógrafa institucional',
      },
    ],
  },
  {
    title: 'Administracion',
    items: [
      {
        title: 'Usuarios',
        href: '/dashboard/users',
        icon: Users,
        roles: [UserRole.ADMIN],
        description: 'Gestionar usuarios y roles',
      },
      {
        title: 'Auditoria',
        href: '/dashboard/audits',
        icon: Shield,
        roles: [UserRole.ADMIN, UserRole.AUDITOR],
        description: 'Registros de auditoria y trazabilidad',
      },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      {
        title: 'Verificacion',
        href: '/verify',
        icon: Search,
        roles: [UserRole.ADMIN, UserRole.CREATOR, UserRole.SIGNER, UserRole.AUDITOR],
        description: 'Portal publico de verificacion',
      },
      {
        title: 'Configuracion',
        href: '/dashboard/settings',
        icon: Settings,
        roles: [UserRole.ADMIN],
        description: 'Configuracion del sistema',
      },
    ],
  },
];

// Filtrar navegacion por roles del usuario
export function getNavigationForRoles(userRoles: UserRole[]): NavSection[] {
  return dashboardNavigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.roles.some((role) => userRoles.includes(role))
      ),
    }))
    .filter((section) => section.items.length > 0);
}

// Verificar si un usuario tiene acceso a una ruta
export function hasAccessToRoute(userRoles: UserRole[], path: string): boolean {
  const allItems = dashboardNavigation.flatMap((section) => section.items);
  const matchingItem = allItems.find((item) => path.startsWith(item.href));
  
  if (!matchingItem) {
    // Rutas publicas o no definidas
    return true;
  }
  
  return matchingItem.roles.some((role) => userRoles.includes(role));
}

// Labels para roles
export const roleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.CREATOR]: 'Creador',
  [UserRole.SIGNER]: 'Firmante',
  [UserRole.AUDITOR]: 'Auditor',
};

// Colores para badges de roles
export const roleColors: Record<UserRole, 'default' | 'secondary' | 'success' | 'warning'> = {
  [UserRole.ADMIN]: 'default',
  [UserRole.CREATOR]: 'secondary',
  [UserRole.SIGNER]: 'success',
  [UserRole.AUDITOR]: 'warning',
};
