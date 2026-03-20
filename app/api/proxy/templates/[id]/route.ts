import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { AppDataSource } from '@/src/shared/db/data-source';
import {
  UpdateTemplateUseCase,
} from '@/src/modules/templates/application/use-cases/manage-templates.use-cases';
import { DocumentTemplateRepository } from '@/src/modules/templates/infrastructure/repositories/document-template.repository';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { templateName, folioPrefix, fabricSchemaJson, craftSchemaJson } = body;
    const schema = fabricSchemaJson ?? craftSchemaJson;

    if (!schema) {
      return NextResponse.json(
        { error: 'fabricSchemaJson or craftSchemaJson is required' },
        { status: 400 }
      );
    }

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const templateRepo = new DocumentTemplateRepository(AppDataSource);
    const userRepo = new UserRepository(AppDataSource);
    const rbacService = new RBACService();

    const updateUseCase = new UpdateTemplateUseCase(templateRepo, userRepo, rbacService);
    const updated = await updateUseCase.execute({
      requesterUserId: session.user.id,
      templateId: id,
      templateName,
      folioPrefix,
      craftSchemaJson: schema,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('[proxy/templates/:id PUT]', error);
    return handleError(error);
  }
}

function handleError(error: unknown): NextResponse {
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

  return NextResponse.json({ error: message }, { status: 500 });
}
