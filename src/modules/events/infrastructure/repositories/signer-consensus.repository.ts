import { DataSource } from 'typeorm';

import { SignerConsensusEntity } from '@/src/modules/events/infrastructure/entities/signer-consensus.entity';

export class SignerConsensusRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<SignerConsensusEntity | null> {
    return this.dataSource.getRepository(SignerConsensusEntity).findOne({
      where: { id },
      relations: ['event', 'signatureVault'],
    });
  }

  async findByEventId(eventId: string): Promise<SignerConsensusEntity[]> {
    return this.dataSource.getRepository(SignerConsensusEntity).find({
      where: { eventId },
      relations: ['event', 'signatureVault'],
    });
  }

  async findByEventIdAndVaultId(
    eventId: string,
    signatureVaultId: string,
  ): Promise<SignerConsensusEntity | null> {
    return this.dataSource.getRepository(SignerConsensusEntity).findOne({
      where: { eventId, signatureVaultId },
      relations: ['event', 'signatureVault'],
    });
  }

  create(input: Partial<SignerConsensusEntity>): SignerConsensusEntity {
    return this.dataSource.getRepository(SignerConsensusEntity).create(input);
  }

  async save(entity: SignerConsensusEntity): Promise<SignerConsensusEntity> {
    return this.dataSource.getRepository(SignerConsensusEntity).save(entity);
  }

  async delete(id: string): Promise<void> {
    await this.dataSource.getRepository(SignerConsensusEntity).delete(id);
  }

  async findApprovedByEventId(eventId: string): Promise<SignerConsensusEntity[]> {
    return this.dataSource.getRepository(SignerConsensusEntity).find({
      where: {
        eventId,
        approved: true,
      },
      relations: ['signatureVault'],
    });
  }

  async countByEventId(eventId: string): Promise<number> {
    return this.dataSource.getRepository(SignerConsensusEntity).count({
      where: { eventId },
    });
  }

  async countApprovedByEventId(eventId: string): Promise<number> {
    return this.dataSource.getRepository(SignerConsensusEntity).count({
      where: {
        eventId,
        approved: true,
      },
    });
  }
}
