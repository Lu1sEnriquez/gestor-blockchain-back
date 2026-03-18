import { DataSource } from 'typeorm';

import { SignatureVaultEntity } from '@/src/modules/users/infrastructure/entities/signature-vault.entity';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';

type CreateUserWithVaultInput = {
  fullName: string;
  institutionalEmail: string;
  rolesAssigned: UserEntity['rolesAssigned'];
  officialPosition: string;
  signaturePngUrl: string;
};

export class UserRepository {
  constructor(private readonly dataSource: DataSource) {}

  async createUserWithVault(input: CreateUserWithVaultInput): Promise<UserEntity> {
    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(UserEntity, {
        fullName: input.fullName,
        institutionalEmail: input.institutionalEmail,
        rolesAssigned: input.rolesAssigned,
      });

      const savedUser = await manager.save(UserEntity, user);

      const vault = manager.create(SignatureVaultEntity, {
        userId: savedUser.id,
        officialPosition: input.officialPosition,
        signaturePngUrl: input.signaturePngUrl,
      });

      await manager.save(SignatureVaultEntity, vault);

      return savedUser;
    });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.dataSource.getRepository(UserEntity).findOne({
      where: { id },
      relations: ['signatureVault'],
    });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.dataSource.getRepository(UserEntity).findOne({
      where: { institutionalEmail: email },
      relations: ['signatureVault'],
    });
  }

  async findByRole(role: UserRole): Promise<UserEntity[]> {
    return this.dataSource
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .where(':role = ANY(user.rolesAssigned)', { role })
      .loadAllRelationIds()
      .getMany();
  }

  async findAll(): Promise<UserEntity[]> {
    return this.dataSource.getRepository(UserEntity).find({
      relations: ['signatureVault'],
    });
  }
}
