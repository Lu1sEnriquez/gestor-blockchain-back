'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getNavigationForRoles, type NavSection } from '@/lib/navigation';
import type { UserRole } from '@/lib/types';
import { FileCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';

interface AppSidebarProps {
  userRoles: UserRole[];
}

export function AppSidebar({ userRoles }: AppSidebarProps) {
  const pathname = usePathname();
  const navigation = getNavigationForRoles(userRoles);
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      {/* Logo / Branding */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2">
              <SidebarMenuButton size="lg" asChild className="flex-1">
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <FileCheck className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">Gestor Documental</span>
                    <span className="text-xs text-muted-foreground">ITSON</span>
                  </div>
                </Link>
              </SidebarMenuButton>

              {isMobile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setOpenMobile(false)}
                  aria-label="Cerrar sidebar"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        {navigation.map((section) => (
          <SidebarNavSection
            key={section.title}
            section={section}
            currentPath={pathname}
          />
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}

interface SidebarNavSectionProps {
  section: NavSection;
  currentPath: string;
}

function SidebarNavSection({ section, currentPath }: SidebarNavSectionProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {section.items.map((item) => {
            const isActive =
              currentPath === item.href ||
              (item.href !== '/dashboard' && currentPath.startsWith(item.href));

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
