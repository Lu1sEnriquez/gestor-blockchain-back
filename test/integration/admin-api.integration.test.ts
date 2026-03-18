import express from 'express';
import request from 'supertest';

import { ListAuditsUseCase } from '@/src/modules/audits/application/use-cases/list-audits.use-case';
import { AuditAction } from '@/src/modules/audits/domain/enums/audit-action.enum';
import { AuditLogEntity } from '@/src/modules/audits/infrastructure/entities/audit-log.entity';
import { createAuditsRouter } from '@/src/modules/audits/presentation/http/audits.router';
import {
  CreateTemplateUseCase,
  ListTemplatesUseCase,
} from '@/src/modules/templates/application/use-cases/manage-templates.use-cases';
import { DocumentTemplateEntity } from '@/src/modules/templates/infrastructure/entities/document-template.entity';
import { createTemplatesRouter } from '@/src/modules/templates/presentation/http/templates.router';
import {
  CreateUserUseCase,
  ListUsersUseCase,
} from '@/src/modules/users/application/use-cases/manage-users.use-cases';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { SignatureVaultEntity } from '@/src/modules/users/infrastructure/entities/signature-vault.entity';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';
import { createUsersRouter } from '@/src/modules/users/presentation/http/users.router';

class InMemoryUserRepository {
  constructor(private users: Map<string, UserEntity>) {}

  async createUserWithVault(input: {
    fullName: string;
    institutionalEmail: string;
    rolesAssigned: UserRole[];
    officialPosition: string;
    signaturePngUrl: string;
  }): Promise<UserEntity> {
    const id = `user-${this.users.size + 1}`;
    const user: UserEntity = {
      id,
      fullName: input.fullName,
      institutionalEmail: input.institutionalEmail,
      rolesAssigned: input.rolesAssigned,
      signatureVault: {
        id: `vault-${id}`,
        userId: id,
        officialPosition: input.officialPosition,
        signaturePngUrl: input.signaturePngUrl,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as SignatureVaultEntity,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as UserEntity;

    this.users.set(id, user);
    return user;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const found = Array.from(this.users.values()).find((u) => u.institutionalEmail === email);
    return found ?? null;
  }

  async findByRole(role: UserRole): Promise<UserEntity[]> {
    return Array.from(this.users.values()).filter((u) => u.rolesAssigned.includes(role));
  }

  async findAll(): Promise<UserEntity[]> {
    return Array.from(this.users.values());
  }
}

class InMemoryTemplateRepository {
  private templates = new Map<string, DocumentTemplateEntity>();

  async findAll(): Promise<DocumentTemplateEntity[]> {
    return Array.from(this.templates.values());
  }

  async findById(id: string): Promise<DocumentTemplateEntity | null> {
    return this.templates.get(id) ?? null;
  }

  async findByFolioPrefix(folioPrefix: string): Promise<DocumentTemplateEntity | null> {
    const found = Array.from(this.templates.values()).find((t) => t.folioPrefix === folioPrefix);
    return found ?? null;
  }

  create(input: Partial<DocumentTemplateEntity>): DocumentTemplateEntity {
    return {
      id: `template-${this.templates.size + 1}`,
      templateName: input.templateName ?? 'untitled',
      folioPrefix: input.folioPrefix ?? 'XX',
      craftSchemaJson: input.craftSchemaJson ?? {},
      creatorId: input.creatorId ?? 'user-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as DocumentTemplateEntity;
  }

  async save(entity: DocumentTemplateEntity): Promise<DocumentTemplateEntity> {
    this.templates.set(entity.id, entity);
    return entity;
  }
}

class InMemoryAuditQueryRepository {
  constructor(private logs: AuditLogEntity[]) {}

  async list(filters: {
    userId?: string;
    action?: AuditAction;
    affectedEntity?: string;
    limit?: number;
  }): Promise<AuditLogEntity[]> {
    let result = [...this.logs];

    if (filters.userId) {
      result = result.filter((log) => log.userId === filters.userId);
    }

    if (filters.action) {
      result = result.filter((log) => log.action === filters.action);
    }

    if (filters.affectedEntity) {
      result = result.filter((log) => log.affectedEntity === filters.affectedEntity);
    }

    return result.slice(0, filters.limit ?? 100);
  }
}

function buildUser(id: string, role: UserRole): UserEntity {
  return {
    id,
    fullName: `${id}-name`,
    institutionalEmail: `${id}@itson.mx`,
    rolesAssigned: [role],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as UserEntity;
}

describe('Admin APIs integration', () => {
  it('supports users/templates/audits endpoints with RBAC validations', async () => {
    const users = new Map<string, UserEntity>([
      ['admin-1', buildUser('admin-1', UserRole.ADMIN)],
      ['auditor-1', buildUser('auditor-1', UserRole.AUDITOR)],
      ['creator-1', buildUser('creator-1', UserRole.CREATOR)],
    ]);

    const userRepository = new InMemoryUserRepository(users);
    const templateRepository = new InMemoryTemplateRepository();
    const auditLogs: AuditLogEntity[] = [
      {
        id: 'audit-1',
        userId: 'admin-1',
        action: AuditAction.CREATE,
        affectedEntity: 'Evento_Academico',
        affectedEntityId: 'event-1',
        detailSnapshot: { status: 'PENDIENTE' },
        sourceIp: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as AuditLogEntity,
    ];

    const rbac = new RBACService();

    const app = express();
    app.use(express.json());

    app.use(
      createUsersRouter({
        createUserUseCase: new CreateUserUseCase(userRepository as never, rbac),
        listUsersUseCase: new ListUsersUseCase(userRepository as never, rbac),
      }),
    );

    app.use(
      createTemplatesRouter({
        createTemplateUseCase: new CreateTemplateUseCase(
          templateRepository as never,
          userRepository as never,
          rbac,
        ),
        listTemplatesUseCase: new ListTemplatesUseCase(
          templateRepository as never,
          userRepository as never,
        ),
      }),
    );

    app.use(
      createAuditsRouter({
        listAuditsUseCase: new ListAuditsUseCase(
          new InMemoryAuditQueryRepository(auditLogs) as never,
          userRepository as never,
        ),
      }),
    );

    const createUserRes = await request(app).post('/users').send({
      requesterUserId: 'admin-1',
      fullName: 'Nuevo Usuario',
      institutionalEmail: 'nuevo@itson.mx',
      rolesAssigned: [UserRole.SIGNER],
      officialPosition: 'Director',
      signaturePngUrl: 'https://s3.local/signature.png',
    });

    expect(createUserRes.status).toBe(201);
    expect(createUserRes.body.institutionalEmail).toBe('nuevo@itson.mx');

    const listUsersRes = await request(app).get('/users').query({ requesterUserId: 'admin-1' });
    expect(listUsersRes.status).toBe(200);
    expect(Array.isArray(listUsersRes.body)).toBe(true);
    expect(listUsersRes.body.length).toBeGreaterThanOrEqual(4);

    const forbiddenListUsersRes = await request(app)
      .get('/users')
      .query({ requesterUserId: 'creator-1' });
    expect(forbiddenListUsersRes.status).toBe(403);

    const createTemplateRes = await request(app).post('/templates').send({
      requesterUserId: 'creator-1',
      templateName: 'Constancia Base',
      folioPrefix: 'NA',
      craftSchemaJson: { blocks: [] },
    });

    expect(createTemplateRes.status).toBe(201);
    expect(createTemplateRes.body.folioPrefix).toBe('NA');

    const listTemplatesRes = await request(app)
      .get('/templates')
      .query({ requesterUserId: 'creator-1' });
    expect(listTemplatesRes.status).toBe(200);
    expect(listTemplatesRes.body.length).toBe(1);

    const duplicateTemplateRes = await request(app).post('/templates').send({
      requesterUserId: 'admin-1',
      templateName: 'Constancia Duplicada',
      folioPrefix: 'NA',
      craftSchemaJson: { blocks: ['text'] },
    });
    expect(duplicateTemplateRes.status).toBe(409);

    const listAuditsAsAuditor = await request(app)
      .get('/audits')
      .query({ requesterUserId: 'auditor-1' });
    expect(listAuditsAsAuditor.status).toBe(200);
    expect(listAuditsAsAuditor.body.length).toBe(1);

    const listAuditsAsCreator = await request(app)
      .get('/audits')
      .query({ requesterUserId: 'creator-1' });
    expect(listAuditsAsCreator.status).toBe(403);
  });
});
