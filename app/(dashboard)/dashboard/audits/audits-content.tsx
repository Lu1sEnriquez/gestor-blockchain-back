'use client';

import { useState } from 'react';
import {
  Search,
  Shield,
  Filter,
  Loader2,
  User,
  FileText,
  Calendar,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAudits } from '@/hooks/use-audits';
import { formatDate } from '@/lib/event-helpers';
import type { AuditLog } from '@/lib/types';

interface AuditsContentProps {
  userId: string;
}

// Acciones conocidas del sistema
const knownActions = [
  'USER_CREATED',
  'TEMPLATE_CREATED',
  'EVENT_CREATED',
  'EVENT_AUTHORIZED',
  'EVENT_SIGNED',
  'DOCUMENT_GENERATED',
  'DOCUMENT_REVOKED',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
];

// Entidades conocidas
const knownEntities = ['User', 'Template', 'Event', 'Document', 'Auth'];

// Colores por tipo de accion
function getActionColor(action: string): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  if (action.includes('CREATED')) return 'success';
  if (action.includes('AUTHORIZED') || action.includes('SIGNED')) return 'default';
  if (action.includes('REVOKED') || action.includes('FAILED')) return 'destructive';
  if (action.includes('LOGIN')) return 'secondary';
  return 'default';
}

export function AuditsContent({ userId }: AuditsContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [limit, setLimit] = useState(50);

  const { audits, isLoading, error, mutate } = useAudits({
    requesterUserId: userId,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    affectedEntity: entityFilter !== 'all' ? entityFilter : undefined,
    limit,
  });

  // Filtrar por busqueda
  const filteredAudits = audits.filter(
    (audit) =>
      audit?.userFullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit?.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit?.affectedEntityId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuario, accion o ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Accion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              {knownActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Entidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las entidades</SelectItem>
              {knownEntities.map((entity) => (
                <SelectItem key={entity} value={entity}>
                  {entity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Audits table */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>Cargando registros...</span>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="mb-4 h-12 w-12 text-destructive" />
            <h3 className="text-lg font-medium">Error al cargar auditoria</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {error.error || 'No se pudieron cargar los registros'}
            </p>
            <Button className="mt-4" onClick={() => mutate()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : filteredAudits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Sin registros</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No hay registros de auditoria que coincidan con los filtros.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Registros de Auditoria
            </CardTitle>
            <CardDescription>
              {filteredAudits.length} registro(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Accion</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>ID Afectado</TableHead>
                  <TableHead className="text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudits.map((audit) => (
                  <AuditRow key={audit.id} audit={audit} />
                ))}
              </TableBody>
            </Table>

            {/* Load more */}
            {audits.length >= limit && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setLimit((prev) => prev + 50)}
                >
                  Cargar mas
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AuditRow({ audit }: { audit: AuditLog }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {formatDate(audit.createdAt)}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{audit.userFullName}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={getActionColor(audit.action)}>{audit.action}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {audit.affectedEntity}
        </div>
      </TableCell>
      <TableCell>
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          {audit.affectedEntityId.slice(0, 12)}...
        </code>
      </TableCell>
      <TableCell className="text-right">
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalle de Auditoria</DialogTitle>
              <DialogDescription>
                Registro completo del evento de auditoria
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ID Registro</span>
                  <p className="font-mono text-xs">{audit.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha</span>
                  <p>{formatDate(audit.createdAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Usuario</span>
                  <p className="font-medium">{audit.userFullName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">ID Usuario</span>
                  <p className="font-mono text-xs">{audit.userId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Accion</span>
                  <p>
                    <Badge variant={getActionColor(audit.action)}>
                      {audit.action}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Entidad</span>
                  <p>{audit.affectedEntity}</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  ID Entidad Afectada
                </span>
                <p className="font-mono text-xs">{audit.affectedEntityId}</p>
              </div>
              {audit.snapshot && (
                <div>
                  <span className="text-sm text-muted-foreground">
                    Snapshot
                  </span>
                  <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-3 text-xs">
                    {JSON.stringify(audit.snapshot, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}
