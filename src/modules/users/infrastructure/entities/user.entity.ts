import { Column, Entity, OneToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import type { Relation } from 'typeorm';

import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { AuditableEntity } from '@/src/shared/db/base/auditable.entity';

import { SignatureVaultEntity } from './signature-vault.entity';

@Entity({ name: 'users' })
@Unique(['institutionalEmail'])
export class UserEntity extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  fullName!: string;

  @Column({ type: 'varchar', length: 200 })
  institutionalEmail!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    array: true,
    default: [UserRole.CREATOR],
  })
  rolesAssigned!: UserRole[];

  @OneToOne(() => SignatureVaultEntity, (signatureVault) => signatureVault.user)
  signatureVault?: Relation<SignatureVaultEntity>;
}
