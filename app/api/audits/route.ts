import { NextRequest, NextResponse } from 'next/server';

import { ListAuditsUseCase } from '@/src/modules/audits/application/use-cases/list-audits.use-case';
import { AuditAction } from '@/src/modules/audits/domain/enums/audit-action.enum';
import { AuditQueryRepository } from '@/src/modules/audits/infrastructure/repositories/audit-query.repository';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { AppDataSource } from '@/src/shared/db/data-source';

async function getAuditsUseCase() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const userRepository = new UserRepository(AppDataSource);
  const auditQueryRepository = new AuditQueryRepository(AppDataSource);

  return new ListAuditsUseCase(auditQueryRepository, userRepository);
}

export async function GET(request: NextRequest) {
  try {
    const requesterUserId = request.nextUrl.searchParams.get('requesterUserId');
    const userId = request.nextUrl.searchParams.get('userId') ?? undefined;
    const action = parseAuditAction(request.nextUrl.searchParams.get('action'));
    const affectedEntity = request.nextUrl.searchParams.get('affectedEntity') ?? undefined;
    const limitRaw = request.nextUrl.searchParams.get('limit');
    const limit = limitRaw ? Number(limitRaw) : undefined;

    if (!requesterUserId) {
      return NextResponse.json({ error: 'requesterUserId is required' }, { status: 400 });
    }

    const listAuditsUseCase = await getAuditsUseCase();
    const result = await listAuditsUseCase.execute({
      requesterUserId,
      userId,
      action,
      affectedEntity,
      limit,
    });

    return NextResponse.json(result, { status: 200 });
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

  return NextResponse.json({ error: message }, { status: 400 });
}

function parseAuditAction(value: string | null): AuditAction | undefined {
  if (!value) {
    return undefined;
  }

  const maybe = value as AuditAction;
  return Object.values(AuditAction).includes(maybe) ? maybe : undefined;
}
