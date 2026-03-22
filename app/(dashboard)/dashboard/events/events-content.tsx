'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Calendar, Search, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEvent, useCreateEvent } from '@/hooks/use-events';
import { useTemplates } from '@/hooks/use-templates';
import { statusLabels, statusColors, formatDate } from '@/lib/event-helpers';
import { UserRole, EventStatus, type Event } from '@/lib/types';

interface EventsContentProps {
  userId: string;
  userRoles: UserRole[];
}

// Storage key for tracked events
const EVENTS_STORAGE_KEY = 'tracked_event_ids';

function getTrackedEventIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function EventsContent({ userId, userRoles }: EventsContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [trackedIds, setTrackedIds] = useState<string[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const { templates, isLoading: isLoadingTemplates } = useTemplates(userId);
  const { createEvent, isCreating, error: createError } = useCreateEvent();

  // Form state
  const [eventName, setEventName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [globalContext, setGlobalContext] = useState('');

  const canCreate =
    userRoles.includes(UserRole.ADMIN) || userRoles.includes(UserRole.CREATOR);

  // Load tracked event IDs and fetch their details
  useEffect(() => {
    const ids = getTrackedEventIds();
    setTrackedIds(ids);
    setIsLoadingEvents(false);
  }, []);

  // Filter events
  const filteredEvents = events.filter((event) =>
    event.eventName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!eventName.trim() || !templateId) return;

    let parsedContext: Record<string, unknown> | undefined;
    if (globalContext.trim()) {
      try {
        parsedContext = JSON.parse(globalContext);
      } catch {
        return; // Invalid JSON
      }
    }

    const result = await createEvent({
      templateId,
      eventName: eventName.trim(),
      creatorUserId: userId,
      globalContextInjected: parsedContext,
    });

    if (result) {
      // Add to local state
      setEvents((prev) => [
        ...prev,
        {
          id: result.id,
          eventName: result.eventName,
          templateId: result.templateId,
          creatorId: result.creatorId,
          consensusStatus: result.consensusStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      setIsCreateOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setEventName('');
    setTemplateId('');
    setGlobalContext('');
  };

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {canCreate && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Evento</DialogTitle>
                <DialogDescription>
                  Crea un evento documental asociado a una plantilla.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="eventName">Nombre del Evento *</Label>
                  <Input
                    id="eventName"
                    placeholder="ej. Graduacion Primavera 2025"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="template">Plantilla *</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una plantilla" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingTemplates ? (
                        <SelectItem value="_loading" disabled>
                          Cargando...
                        </SelectItem>
                      ) : templates && templates.length > 0 ? (
                        templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.templateName}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="_empty" disabled>
                          No hay plantillas
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="context">
                    Contexto Global (JSON opcional)
                  </Label>
                  <Textarea
                    id="context"
                    placeholder='{"institucion": "ITSON", "periodo": "2025-1"}'
                    value={globalContext}
                    onChange={(e) => setGlobalContext(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Datos globales que se inyectaran en todos los documentos.
                  </p>
                </div>
                {createError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{createError}</AlertDescription>
                  </Alert>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isCreating || !eventName.trim() || !templateId}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Evento'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Events table or empty state */}
      {isLoadingEvents ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>Cargando eventos...</span>
          </CardContent>
        </Card>
      ) : events.length === 0 && trackedIds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No hay eventos</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {canCreate
                ? 'Crea tu primer evento para comenzar.'
                : 'No tienes eventos asignados aun.'}
            </p>
            {canCreate && (
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Evento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Eventos</CardTitle>
            <CardDescription>
              {filteredEvents.length} evento(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Creacion</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {event.eventName}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[event.consensusStatus]}>
                        {statusLabels[event.consensusStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(event.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/events/${event.id}`}>
                          Ver Detalle
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Tracked IDs that haven't been loaded yet */}
                {trackedIds
                  .filter((id) => !events.find((e) => e.id === id))
                  .map((id) => (
                    <TableRow key={id}>
                      <TableCell className="font-medium text-muted-foreground">
                        Evento #{id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Cargando...</Badge>
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/events/${id}`}>
                            Ver Detalle
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
