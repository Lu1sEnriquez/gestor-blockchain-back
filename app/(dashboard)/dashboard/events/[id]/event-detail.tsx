'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  PenTool,
  Play,
  RefreshCw,
  Shield,
  Users,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState, ErrorState } from '@/components/dashboard/shell';
import { useEvent, useEventActions } from '@/hooks/use-events';
import {
  statusLabels,
  statusColors,
  formatDate,
  getAvailableActions,
  statusOrder,
  isTerminalStatus,
} from '@/lib/event-helpers';
import { UserRole, EventStatus } from '@/lib/types';

interface EventDetailProps {
  eventId: string;
  userId: string;
  userRoles: UserRole[];
}

export function EventDetail({ eventId, userId, userRoles }: EventDetailProps) {
  const router = useRouter();
  const { event, isLoading, error, mutate } = useEvent(eventId, userId);
  const {
    authorize,
    sign,
    reconcileStaging,
    generate,
    isLoading: actionLoading,
    actionError,
    clearError,
  } = useEventActions(eventId, userId);

  // Dialog states
  const [showAuthorizeDialog, setShowAuthorizeDialog] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showReconcileDialog, setShowReconcileDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  // Form states
  const [documentHashes, setDocumentHashes] = useState('');
  const [declaredZones, setDeclaredZones] = useState('');
  const [reconcileRows, setReconcileRows] = useState('');
  const [generateRows, setGenerateRows] = useState('');

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton />
        <LoadingState message="Cargando evento..." />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton />
        <ErrorState
          message={error?.error || 'Evento no encontrado'}
          retry={() => mutate()}
        />
      </div>
    );
  }

  const actions = getAvailableActions(event.consensusStatus, userRoles);
  const isTerminal = isTerminalStatus(event.consensusStatus);

  // Action handlers
  const handleAuthorize = async () => {
    const result = await authorize();
    if (result) {
      setShowAuthorizeDialog(false);
      mutate();
    }
  };

  const handleSign = async () => {
    const hashes = documentHashes
      .split('\n')
      .map((h) => h.trim())
      .filter(Boolean);
    if (hashes.length === 0) return;

    const result = await sign(hashes);
    if (result) {
      setShowSignDialog(false);
      setDocumentHashes('');
      mutate();
    }
  };

  const handleReconcile = async () => {
    try {
      const zones = declaredZones
        .split(',')
        .map((z) => z.trim())
        .filter(Boolean);
      const rows = JSON.parse(reconcileRows || '[]');

      const result = await reconcileStaging(zones, rows);
      if (result) {
        setShowReconcileDialog(false);
        setDeclaredZones('');
        setReconcileRows('');
        mutate();
      }
    } catch {
      // JSON parse error handled by the hook
    }
  };

  const handleGenerate = async () => {
    try {
      const rows = JSON.parse(generateRows || '[]');

      const result = await generate(rows);
      if (result) {
        setShowGenerateDialog(false);
        setGenerateRows('');
        mutate();
      }
    } catch {
      // JSON parse error
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BackButton />

      {/* Action error alert */}
      {actionError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error en la accion</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            {actionError}
            <Button variant="ghost" size="sm" onClick={clearError}>
              Cerrar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {event.eventName}
          </h1>
          <p className="text-muted-foreground">ID: {event.id}</p>
        </div>
        <Badge
          variant={statusColors[event.consensusStatus]}
          className="h-fit text-sm"
        >
          {statusLabels[event.consensusStatus]}
        </Badge>
      </div>

      {/* Status timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Flujo de Estados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {statusOrder.map((status, index) => {
              const isCurrent = event.consensusStatus === status;
              const isPast =
                statusOrder.indexOf(event.consensusStatus) > index;
              const isRejected = event.consensusStatus === EventStatus.REJECTED;

              return (
                <div key={status} className="flex items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                        isPast
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : isCurrent
                            ? isRejected
                              ? 'border-destructive bg-destructive text-white'
                              : 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/30 text-muted-foreground/30'
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : isCurrent && isRejected ? (
                        <XCircle className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-xs ${
                        isCurrent ? 'font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      {statusLabels[status]}
                    </span>
                  </div>
                  {index < statusOrder.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 w-8 sm:w-16 ${
                        isPast ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informacion del Evento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Plantilla</Label>
              <p className="font-medium">
                {event.template?.templateName || event.templateId}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Creado</Label>
              <p className="font-medium">{formatDate(event.createdAt)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Actualizado</Label>
              <p className="font-medium">{formatDate(event.updatedAt)}</p>
            </div>
            {event.globalContextInjected && (
              <div>
                <Label className="text-muted-foreground">Contexto Global</Label>
                <pre className="mt-1 rounded bg-muted p-2 text-xs">
                  {JSON.stringify(event.globalContextInjected, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consensus info */}
        {event.signerConsensus && event.signerConsensus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Consenso de Firmantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {event.signerConsensus.map((signer) => (
                  <div
                    key={signer.userId}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="font-medium">{signer.userFullName}</span>
                    {signer.signedAt ? (
                      <Badge variant="success">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Firmado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-3 w-3" />
                        Pendiente
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions section */}
      {!isTerminal && (
        <Card>
          <CardHeader>
            <CardTitle>Acciones Disponibles</CardTitle>
            <CardDescription>
              Realiza acciones segun el estado actual del evento y tus permisos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {/* Authorize */}
              {actions.canAuthorize && (
                <Dialog
                  open={showAuthorizeDialog}
                  onOpenChange={setShowAuthorizeDialog}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Shield className="mr-2 h-4 w-4" />
                      Autorizar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Autorizar Evento</DialogTitle>
                      <DialogDescription>
                        Al autorizar, el evento pasara a estado AUTORIZADO y
                        estara listo para ser firmado.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowAuthorizeDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleAuthorize}
                        disabled={actionLoading === 'authorize'}
                      >
                        {actionLoading === 'authorize' ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Autorizando...
                          </>
                        ) : (
                          'Confirmar Autorizacion'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Sign */}
              {actions.canSign && (
                <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <PenTool className="mr-2 h-4 w-4" />
                      Firmar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Firmar Evento</DialogTitle>
                      <DialogDescription>
                        Ingresa los hashes de los documentos a firmar (uno por
                        linea).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Hashes de Documentos</Label>
                        <Textarea
                          placeholder="0x123abc...&#10;0x456def..."
                          value={documentHashes}
                          onChange={(e) => setDocumentHashes(e.target.value)}
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowSignDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSign}
                        disabled={
                          actionLoading === 'sign' || !documentHashes.trim()
                        }
                      >
                        {actionLoading === 'sign' ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Firmando...
                          </>
                        ) : (
                          'Firmar Documentos'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Reconcile Staging */}
              {actions.canReconcile && (
                <Dialog
                  open={showReconcileDialog}
                  onOpenChange={setShowReconcileDialog}
                >
                  <DialogTrigger asChild>
                    <Button variant="secondary">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Mapeo Multizona
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Reconciliar Staging (Multizona)</DialogTitle>
                      <DialogDescription>
                        Mapea los datos del staging con las zonas declaradas.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Zonas Declaradas (separadas por coma)</Label>
                        <Input
                          placeholder="zona1, zona2, zona3"
                          value={declaredZones}
                          onChange={(e) => setDeclaredZones(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Filas (JSON Array)</Label>
                        <Textarea
                          placeholder='[{"nombre": "Juan", "zona": "zona1"}]'
                          value={reconcileRows}
                          onChange={(e) => setReconcileRows(e.target.value)}
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowReconcileDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleReconcile}
                        disabled={
                          actionLoading === 'reconcile' ||
                          !declaredZones.trim() ||
                          !reconcileRows.trim()
                        }
                      >
                        {actionLoading === 'reconcile' ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Reconciliando...
                          </>
                        ) : (
                          'Reconciliar'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Generate */}
              {actions.canGenerate && (
                <Dialog
                  open={showGenerateDialog}
                  onOpenChange={setShowGenerateDialog}
                >
                  <DialogTrigger asChild>
                    <Button variant="default">
                      <Play className="mr-2 h-4 w-4" />
                      Generar Documentos
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Generar Documentos</DialogTitle>
                      <DialogDescription>
                        Genera los documentos finales a partir de los datos
                        reconciliados.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Datos de Generacion (JSON Array)</Label>
                        <Textarea
                          placeholder='[{"nombre": "Juan Perez", "carrera": "ISC"}]'
                          value={generateRows}
                          onChange={(e) => setGenerateRows(e.target.value)}
                          rows={6}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowGenerateDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleGenerate}
                        disabled={
                          actionLoading === 'generate' || !generateRows.trim()
                        }
                      >
                        {actionLoading === 'generate' ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generando...
                          </>
                        ) : (
                          'Generar'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* No actions available message */}
              {!actions.canAuthorize &&
                !actions.canSign &&
                !actions.canReconcile &&
                !actions.canGenerate && (
                  <p className="text-sm text-muted-foreground">
                    No tienes acciones disponibles en este momento. El evento
                    esta en estado{' '}
                    <strong>{statusLabels[event.consensusStatus]}</strong> y tu
                    rol no permite acciones en este punto.
                  </p>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terminal state message */}
      {isTerminal && (
        <Alert
          variant={
            event.consensusStatus === EventStatus.COMPLETED
              ? 'success'
              : 'destructive'
          }
        >
          {event.consensusStatus === EventStatus.COMPLETED ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {event.consensusStatus === EventStatus.COMPLETED
              ? 'Evento Completado'
              : 'Evento Rechazado'}
          </AlertTitle>
          <AlertDescription>
            {event.consensusStatus === EventStatus.COMPLETED
              ? 'Este evento ha sido completado exitosamente. Los documentos han sido generados y anclados.'
              : 'Este evento ha sido rechazado y no puede continuar.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function BackButton() {
  return (
    <Button variant="outline" asChild className="w-fit">
      <Link href="/dashboard/events">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a Eventos
      </Link>
    </Button>
  );
}
