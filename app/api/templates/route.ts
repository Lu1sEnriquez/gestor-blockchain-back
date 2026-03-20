import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AppDataSource } from '@/src/shared/db/data-source';
import { DocumentTemplateRepository } from '@/src/modules/templates/infrastructure/repositories/document-template.repository';
import { ListTemplatesUseCase, CreateTemplateUseCase } from '@/src/modules/templates/application/use-cases/manage-templates.use-cases';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';

export async function GET(request: NextRequest) {
  try {
    // Obtener requesterUserId del query string
    const requesterUserId = request.nextUrl.searchParams.get('requesterUserId');

    if (!requesterUserId) {
      return NextResponse.json({ error: 'requesterUserId is required' }, { status: 400 });
    }

    // Inicializar BD
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Crear repositorios
    const templateRepo = new DocumentTemplateRepository(AppDataSource);
    const userRepo = new UserRepository(AppDataSource);

    // Ejecutar use case
    const listUseCase = new ListTemplatesUseCase(templateRepo, userRepo);
    const templates = await listUseCase.execute({ requesterUserId });

    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    console.error('[api/templates GET]', error);
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requesterUserId, templateName, folioPrefix, fabricSchemaJson, craftSchemaJson } = body;
    const schema = fabricSchemaJson ?? craftSchemaJson;

    if (!requesterUserId || !templateName || !folioPrefix || !schema) {
      return NextResponse.json(
        {
          error:
            'requesterUserId, templateName, folioPrefix and (fabricSchemaJson or craftSchemaJson) are required',
        },
        { status: 400 }
      );
    }

    // Inicializar BD
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Crear repositorios
    const templateRepo = new DocumentTemplateRepository(AppDataSource);
    const userRepo = new UserRepository(AppDataSource);
    const rbacService = new RBACService();

    // Ejecutar use case
    const createUseCase = new CreateTemplateUseCase(templateRepo, userRepo, rbacService);
    const created = await createUseCase.execute({
      requesterUserId,
      templateName,
      folioPrefix,
      craftSchemaJson: schema,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[api/templates POST]', error);
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
