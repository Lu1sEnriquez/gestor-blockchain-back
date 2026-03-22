import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { AppDataSource } from '@/src/shared/db/data-source';
import { DocumentTemplateRepository } from '@/src/modules/templates/infrastructure/repositories/document-template.repository';
import { ListTemplatesUseCase, CreateTemplateUseCase } from '@/src/modules/templates/application/use-cases/manage-templates.use-cases';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';

export async function GET() {
  try {
    // 1. Obtener sesión autenticada
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Inicializar BD
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // 3. Crear repositorios
    const templateRepo = new DocumentTemplateRepository(AppDataSource);
    const userRepo = new UserRepository(AppDataSource);
    const rbacService = new RBACService();

    // 4. Crear use case
    const listUseCase = new ListTemplatesUseCase(templateRepo, userRepo);

    // 5. Ejecutar
    const templates = await listUseCase.execute({ requesterUserId: session.user.id });

    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    console.error('[proxy/templates GET]', error);
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Obtener sesión autenticada
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parsear body
    const body = await request.json();
    const { templateName, folioPrefix, fabricSchemaJson, craftSchemaJson } = body;
    const schema = fabricSchemaJson ?? craftSchemaJson;

    if (!templateName || !folioPrefix || !schema) {
      return NextResponse.json(
        { error: 'templateName, folioPrefix and (fabricSchemaJson or craftSchemaJson) are required' },
        { status: 400 }
      );
    }

    // 3. Inicializar BD
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // 4. Crear repositorios
    const templateRepo = new DocumentTemplateRepository(AppDataSource);
    const userRepo = new UserRepository(AppDataSource);
    const rbacService = new RBACService();

    // 5. Crear use case
    const createUseCase = new CreateTemplateUseCase(templateRepo, userRepo, rbacService);

    // 6. Ejecutar
    const created = await createUseCase.execute({
      requesterUserId: session.user.id,
      templateName,
      folioPrefix,
      craftSchemaJson: schema,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[proxy/templates POST]', error);
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
