import { NextRequest, NextResponse } from 'next/server';

import {
  CreateTemplateUseCase,
  ListTemplatesUseCase,
} from '@/src/modules/templates/application/use-cases/manage-templates.use-cases';
import { DocumentTemplateRepository } from '@/src/modules/templates/infrastructure/repositories/document-template.repository';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { AppDataSource } from '@/src/shared/db/data-source';

async function getTemplateUseCases() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const templateRepository = new DocumentTemplateRepository(AppDataSource);
  const userRepository = new UserRepository(AppDataSource);
  const rbacService = new RBACService();

  return {
    createTemplateUseCase: new CreateTemplateUseCase(templateRepository, userRepository, rbacService),
    listTemplatesUseCase: new ListTemplatesUseCase(templateRepository, userRepository),
  };
}

export async function GET(request: NextRequest) {
  try {
    const requesterUserId = request.nextUrl.searchParams.get('requesterUserId');

    if (!requesterUserId) {
      return NextResponse.json({ error: 'requesterUserId is required' }, { status: 400 });
    }

    const { listTemplatesUseCase } = await getTemplateUseCases();
    const templates = await listTemplatesUseCase.execute({ requesterUserId });

    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    return mapErrorToResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requesterUserId, templateName, folioPrefix, craftSchemaJson } = body;

    if (!requesterUserId || !templateName || !folioPrefix || !craftSchemaJson) {
      return NextResponse.json(
        { error: 'requesterUserId, templateName, folioPrefix and craftSchemaJson are required' },
        { status: 400 },
      );
    }

    const { createTemplateUseCase } = await getTemplateUseCases();
    const created = await createTemplateUseCase.execute({
      requesterUserId,
      templateName,
      folioPrefix,
      craftSchemaJson,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return mapErrorToResponse(error);
  }
}

function mapErrorToResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : 'Unexpected error';

  if (message.includes('not found')) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (message.includes('lacks')) {
    return NextResponse.json({ error: message }, { status: 403 });
  }

  if (message.includes('already exists')) {
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}
