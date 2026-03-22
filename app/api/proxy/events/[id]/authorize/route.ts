import { NextRequest, NextResponse } from 'next/server';

import { createEventUseCases } from '@/src/modules/events/application/factories/event-use-case.factory';

import { requireSessionUser } from '../../../_shared/auth-session';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    if (sessionUser instanceof NextResponse) {
      return sessionUser;
    }

    const { id } = await context.params;

    const { authorizeEventUseCase } = await createEventUseCases();
    const updated = await authorizeEventUseCase.execute({
      eventId: id,
      authorizerUserId: sessionUser.id,
    });

    return NextResponse.json(
      {
        id: updated.id,
        consensusStatus: updated.consensusStatus,
      },
      { status: 200 },
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

  if (message.includes('Cannot transition')) {
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}
