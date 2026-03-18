import { DocumentTemplateEntity } from '@/src/modules/templates/infrastructure/entities/document-template.entity';
import { DocumentTemplateRepository } from '@/src/modules/templates/infrastructure/repositories/document-template.repository';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';

export interface CreateTemplateDTO {
  requesterUserId: string;
  templateName: string;
  folioPrefix: string;
  craftSchemaJson: Record<string, unknown>;
}

export class CreateTemplateUseCase {
  constructor(
    private readonly templateRepository: DocumentTemplateRepository,
    private readonly userRepository: UserRepository,
    private readonly rbacService: RBACService,
  ) {}

  async execute(dto: CreateTemplateDTO): Promise<DocumentTemplateEntity> {
    const requester = await this.userRepository.findById(dto.requesterUserId);
    if (!requester) {
      throw new Error(`Requester user with ID ${dto.requesterUserId} not found`);
    }

    const canCreateTemplate = requester.rolesAssigned.some((role) =>
      this.rbacService.canCreateTemplate(role),
    );

    if (!canCreateTemplate) {
      throw new Error(
        `User ${dto.requesterUserId} (${requester.rolesAssigned.join(',')}) lacks create_template permission`,
      );
    }

    const existing = await this.templateRepository.findByFolioPrefix(dto.folioPrefix);
    if (existing) {
      throw new Error(`Template with folioPrefix ${dto.folioPrefix} already exists`);
    }

    const created = this.templateRepository.create({
      templateName: dto.templateName,
      folioPrefix: dto.folioPrefix,
      craftSchemaJson: dto.craftSchemaJson,
      creatorId: dto.requesterUserId,
    });

    return this.templateRepository.save(created);
  }
}

export interface ListTemplatesDTO {
  requesterUserId: string;
}

export class ListTemplatesUseCase {
  constructor(
    private readonly templateRepository: DocumentTemplateRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(dto: ListTemplatesDTO): Promise<DocumentTemplateEntity[]> {
    const requester = await this.userRepository.findById(dto.requesterUserId);
    if (!requester) {
      throw new Error(`Requester user with ID ${dto.requesterUserId} not found`);
    }

    return this.templateRepository.findAll();
  }
}
