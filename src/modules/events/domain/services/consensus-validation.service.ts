import { SignerConsensusRepository } from '@/src/modules/events/infrastructure/repositories/signer-consensus.repository';

/**
 * Servicio para validar el consenso multi-firmante
 * - Verifica que todos los signatarios registrados hayan aprobado
 * - Proporciona métodos para obtener estado del consenso
 */
export class ConsensusValidationService {
  constructor(private readonly signerConsensusRepository: SignerConsensusRepository) {}

  /**
   * Valida si el evento tiene consenso completo
   * (todos los signatarios registrados han aprobado = true)
   *
   * @param eventId ID del evento
   * @returns true si ALL signatarios han aprobado, false en caso contrario
   */
  async hasCompleteConsensus(eventId: string): Promise<boolean> {
    const total = await this.signerConsensusRepository.countByEventId(eventId);

    // Si no hay signatarios requeridos, consenso automático
    if (total === 0) {
      return true;
    }

    const approved = await this.signerConsensusRepository.countApprovedByEventId(eventId);

    return approved === total;
  }

  /**
   * Obtiene el estado del consenso (aprobados / total)
   *
   * @param eventId ID del evento
   * @returns objeto con counts { approved, total }
   */
  async getConsensusStatus(eventId: string): Promise<{ approved: number; total: number }> {
    const total = await this.signerConsensusRepository.countByEventId(eventId);
    const approved = await this.signerConsensusRepository.countApprovedByEventId(eventId);

    return { approved, total };
  }

  /**
   * Obtiene los signatarios pendientes (approved = false o null)
   *
   * @param eventId ID del evento
   * @returns lista de vaults pendientes de aprobación
   */
  async getPendingSigners(eventId: string): Promise<string[]> {
    const all = await this.signerConsensusRepository.findByEventId(eventId);
    return all
      .filter((consensus) => !consensus.approved)
      .map((consensus) => consensus.signatureVaultId);
  }
}
