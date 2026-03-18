import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';

/**
 * Reglas de transición de estados permitidas en el flujo de acreditación.
 * PENDIENTE → AUTORIZADO → FIRMADO → COMPLETADO / RECHAZADO
 */
const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  [EventStatus.PENDING]: [EventStatus.AUTHORIZED],
  [EventStatus.AUTHORIZED]: [EventStatus.SIGNED, EventStatus.REJECTED],
  [EventStatus.SIGNED]: [EventStatus.COMPLETED, EventStatus.REJECTED],
  [EventStatus.COMPLETED]: [],
  [EventStatus.REJECTED]: [],
};

/**
 * Servicio de dominio para validar transiciones de estado en eventos y aplicar reglas de negocio.
 */
export class EventStateService {
  /**
   * Valida si la transición de estado es permitida.
   * @param currentStatus Estado actual del evento
   * @param nextStatus Estado deseado
   * @returns true si la transición es válida
   */
  canTransition(currentStatus: EventStatus, nextStatus: EventStatus): boolean {
    return VALID_TRANSITIONS[currentStatus].includes(nextStatus);
  }

  /**
   * Obtiene las transiciones válidas desde un estado dado.
   */
  getValidNextStates(currentStatus: EventStatus): EventStatus[] {
    return VALID_TRANSITIONS[currentStatus];
  }

  /**
   * Valida si el evento puede cargar documentos masivos (CU-05).
   * Solo permitido en estado FIRMADO.
   */
  canLoadDocuments(status: EventStatus): boolean {
    return status === EventStatus.SIGNED;
  }

  /**
   * Valida si el evento puede ser revocado.
   * Permitido desde AUTORIZADO, FIRMADO o COMPLETADO.
   */
  canBeRevoked(status: EventStatus): boolean {
    return [EventStatus.AUTHORIZED, EventStatus.SIGNED, EventStatus.COMPLETED].includes(
      status,
    );
  }

  /**
   * Valida si el evento puede emitir lote complementario (CU-12).
   * Permitido en FIRMADO o COMPLETADO, condicionado a hash revocado previo.
   */
  canGenerateComplementary(status: EventStatus): boolean {
    return [EventStatus.SIGNED, EventStatus.COMPLETED].includes(status);
  }
}
