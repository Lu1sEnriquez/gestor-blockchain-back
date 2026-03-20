import { NextRequest, NextResponse } from 'next/server';

import { createEventUseCases } from '@/src/modules/events/application/factories/event-use-case.factory';

import { requireSessionUser } from '../../../_shared/auth-session';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    if (sessionUser instanceof NextResponse) {
      return sessionUser;
    }

    const { id } = await context.params;
    const body = await request.json();
    const { hashToRevoke, idempotencyKey } = body;

    if (!hashToRevoke || !idempotencyKey) {
      return NextResponse.json(
        { error: 'hashToRevoke and idempotencyKey are required' },
        { status: 400 },
      );
    }

    const { revokeEventUseCase } = await createEventUseCases();
    const job = await revokeEventUseCase.execute({
      eventId: id,
      requesterUserId: sessionUser.id,
      hashToRevoke,
      idempotencyKey,
    });

    return NextResponse.json(
      {
        id: job.id,
        eventId: job.eventId,
        status: job.status,
        txHash: job.txHash,
        attemptCount: job.attemptCount,
      },
      { status: 202 },
    );
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

  if (message.includes('cannot be revoked')) {
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}
