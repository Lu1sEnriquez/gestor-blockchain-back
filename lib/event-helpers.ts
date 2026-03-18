import { EventStatus, UserRole } from '@/lib/types';

// Labels para estados
export const statusLabels: Record<EventStatus, string> = {
  [EventStatus.PENDING]: 'Pendiente',
  [EventStatus.AUTHORIZED]: 'Autorizado',
  [EventStatus.SIGNED]: 'Firmado',
  [EventStatus.COMPLETED]: 'Completado',
  [EventStatus.REJECTED]: 'Rechazado',
};

// Colores para badges de estados
export const statusColors: Record<
  EventStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  [EventStatus.PENDING]: 'warning',
  [EventStatus.AUTHORIZED]: 'secondary',
  [EventStatus.SIGNED]: 'default',
  [EventStatus.COMPLETED]: 'success',
  [EventStatus.REJECTED]: 'destructive',
};

// Determinar que acciones estan disponibles segun estado y rol
export interface AvailableActions {
  canAuthorize: boolean;
  canSign: boolean;
  canReconcile: boolean;
  canGenerate: boolean;
  canReject: boolean;
}

export function getAvailableActions(
  status: EventStatus,
  userRoles: UserRole[]
): AvailableActions {
  const isAdmin = userRoles.includes(UserRole.ADMIN);
  const isCreator = userRoles.includes(UserRole.CREATOR);
  const isSigner = userRoles.includes(UserRole.SIGNER);

  // Documento rechazado o completado - sin acciones
  if (status === EventStatus.REJECTED || status === EventStatus.COMPLETED) {
    return {
      canAuthorize: false,
      canSign: false,
      canReconcile: false,
      canGenerate: false,
      canReject: false,
    };
  }

  return {
    // Solo ADMIN puede autorizar, y solo si esta PENDIENTE
    canAuthorize: isAdmin && status === EventStatus.PENDING,

    // Solo SIGNER puede firmar, y solo si esta AUTORIZADO
    canSign: isSigner && status === EventStatus.AUTHORIZED,

    // ADMIN o CREATOR pueden hacer reconcile, si esta FIRMADO
    canReconcile: (isAdmin || isCreator) && status === EventStatus.SIGNED,

    // ADMIN o CREATOR pueden generar, si esta FIRMADO
    canGenerate: (isAdmin || isCreator) && status === EventStatus.SIGNED,

    // Solo ADMIN puede rechazar, si no esta completado/rechazado
    canReject:
      isAdmin &&
      status !== EventStatus.COMPLETED &&
      status !== EventStatus.REJECTED,
  };
}

// Orden del flujo de estados
export const statusOrder: EventStatus[] = [
  EventStatus.PENDING,
  EventStatus.AUTHORIZED,
  EventStatus.SIGNED,
  EventStatus.COMPLETED,
];

// Obtener siguiente estado esperado
export function getNextExpectedStatus(
  currentStatus: EventStatus
): EventStatus | null {
  const currentIndex = statusOrder.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex >= statusOrder.length - 1) {
    return null;
  }
  return statusOrder[currentIndex + 1];
}

// Verificar si el estado es terminal
export function isTerminalStatus(status: EventStatus): boolean {
  return status === EventStatus.COMPLETED || status === EventStatus.REJECTED;
}

// Formatear fecha
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
