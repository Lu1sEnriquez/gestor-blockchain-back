import { NextRequest, NextResponse } from 'next/server';

import {
  CreateUserUseCase,
  ListUsersUseCase,
} from '@/src/modules/users/application/use-cases/manage-users.use-cases';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { AppDataSource } from '@/src/shared/db/data-source';

async function getUserUseCases() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const userRepository = new UserRepository(AppDataSource);
  const rbacService = new RBACService();

  return {
    createUserUseCase: new CreateUserUseCase(userRepository, rbacService),
    listUsersUseCase: new ListUsersUseCase(userRepository, rbacService),
  };
}

export async function GET(request: NextRequest) {
  try {
    const requesterUserId = request.nextUrl.searchParams.get('requesterUserId');
    const role = request.nextUrl.searchParams.get('role') as UserRole | null;

    if (!requesterUserId) {
      return NextResponse.json({ error: 'requesterUserId is required' }, { status: 400 });
    }

    const { listUsersUseCase } = await getUserUseCases();
    const users = await listUsersUseCase.execute({
      requesterUserId,
      role: role ?? undefined,
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    return mapErrorToResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      requesterUserId,
      fullName,
      institutionalEmail,
      rolesAssigned,
      officialPosition,
      signaturePngUrl,
    } = body;

    if (
      !requesterUserId ||
      !fullName ||
      !institutionalEmail ||
      !Array.isArray(rolesAssigned) ||
      !officialPosition ||
      !signaturePngUrl
    ) {
      return NextResponse.json(
        {
          error:
            'requesterUserId, fullName, institutionalEmail, rolesAssigned[], officialPosition and signaturePngUrl are required',
        },
        { status: 400 },
      );
    }

    const { createUserUseCase } = await getUserUseCases();
    const created = await createUserUseCase.execute({
      requesterUserId,
      fullName,
      institutionalEmail,
      rolesAssigned,
      officialPosition,
      signaturePngUrl,
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
