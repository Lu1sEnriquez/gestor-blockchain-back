'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, MoreHorizontal, Eye, Pencil } from 'lucide-react';
import { PageHeader, EmptyState, LoadingState, ErrorState } from '@/components/dashboard/shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTemplates } from '@/hooks/use-templates';

interface TemplatesContentProps {
  userId: string;
}

export function TemplatesContent({ userId }: TemplatesContentProps) {
  const { templates, isLoading, error, mutate } = useTemplates({
    requesterUserId: userId,
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Plantillas"
          description="Administra las plantillas de documentos"
        />
        <LoadingState message="Cargando plantillas..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Plantillas"
          description="Administra las plantillas de documentos"
        />
        <ErrorState
          message={error.error || 'Error al cargar plantillas'}
          retry={() => mutate()}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Plantillas"
        description="Administra las plantillas de documentos"
      >
        <Button asChild>
          <Link href="/dashboard/templates/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Plantilla
          </Link>
        </Button>
      </PageHeader>

      {templates.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="No hay plantillas"
          description="Crea tu primera plantilla para comenzar a generar documentos"
          action={
            <Button asChild>
              <Link href="/dashboard/templates/new">
                <Plus className="mr-2 h-4 w-4" />
                Crear Plantilla
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Prefijo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    {template.templateName}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-2 py-1 text-sm">
                      {template.folioPrefix}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.isActive ? 'success' : 'secondary'}>
                      {template.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(template.createdAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/templates/${template.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/templates/${template.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
