import 'reflect-metadata';

import { getMetadataArgsStorage } from 'typeorm';

import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { SignatureVaultEntity } from '@/src/modules/users/infrastructure/entities/signature-vault.entity';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';

const metadataStorage = getMetadataArgsStorage();

describe('User domain entities metadata', () => {
  it('should define unique email in UserEntity', () => {
    const uniqueDefinition = metadataStorage.uniques.find(
      (unique) => {
        if (unique.target !== UserEntity || !Array.isArray(unique.columns)) {
          return false;
        }

        return unique.columns.includes('institutionalEmail');
      },
    );

    expect(uniqueDefinition).toBeDefined();
  });

  it('should define one-to-one relation between UserEntity and SignatureVaultEntity', () => {
    const userRelation = metadataStorage.relations.find(
      (relation) => relation.target === UserEntity && relation.propertyName === 'signatureVault',
    );

    const vaultRelation = metadataStorage.relations.find(
      (relation) => relation.target === SignatureVaultEntity && relation.propertyName === 'user',
    );

    expect(userRelation?.relationType).toBe('one-to-one');
    expect(vaultRelation?.relationType).toBe('one-to-one');
  });

  it('should define rolesAssigned as enum-array in UserEntity', () => {
    const rolesColumn = metadataStorage.columns.find(
      (column) => column.target === UserEntity && column.propertyName === 'rolesAssigned',
    );

    expect(rolesColumn).toBeDefined();
    expect(rolesColumn?.options.array).toBe(true);
    const enumValues = Object.values(rolesColumn?.options.enum ?? {});

    expect(enumValues).toEqual(Object.values(UserRole));
  });
});
