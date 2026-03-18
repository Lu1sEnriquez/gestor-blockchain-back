'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getNavigationForRoles, type NavSection } from '@/lib/navigation';
import type { UserRole } from '@/lib/types';
import { FileCheck } from 'lucide-react';

interface SidebarProps {
  userRoles: UserRole[];
}

export function Sidebar({ userRoles }: SidebarProps) {
  const pathname = usePathname();
  const navigation = getNavigationForRoles(userRoles);

  return (
    <aside className="hidden w-64 flex-col border-r bg-sidebar lg:flex">
      {/* Logo / Branding */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <FileCheck className="h-6 w-6 text-primary" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-foreground">
            Gestor Documental
          </span>
          <span className="text-xs text-muted-foreground">ITSON</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-6">
          {navigation.map((section) => (
            <SidebarSection
              key={section.title}
              section={section}
              currentPath={pathname}
            />
          ))}
        </div>
      </nav>
    </aside>
  );
}

interface SidebarSectionProps {
  section: NavSection;
  currentPath: string;
}

function SidebarSection({ section, currentPath }: SidebarSectionProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {section.title}
      </span>
      <ul className="flex flex-col gap-1">
        {section.items.map((item) => {
          const isActive =
            currentPath === item.href ||
            (item.href !== '/dashboard' && currentPath.startsWith(item.href));

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Mobile sidebar (sheet-based)
export function MobileSidebar({ userRoles }: SidebarProps) {
  const pathname = usePathname();
  const navigation = getNavigationForRoles(userRoles);

  return (
    <nav className="flex flex-col gap-6 p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3">
        <FileCheck className="h-6 w-6 text-primary" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Gestor Documental</span>
          <span className="text-xs text-muted-foreground">ITSON</span>
        </div>
      </div>

      {/* Navigation */}
      {navigation.map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <span className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {section.title}
          </span>
          <ul className="flex flex-col gap-1">
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
