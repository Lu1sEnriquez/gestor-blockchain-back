import { NextRequest, NextResponse } from 'next/server';

import { createEventUseCases } from '@/src/modules/events/application/factories/event-use-case.factory';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { authorizerUserId } = body;

    if (!authorizerUserId) {
      return NextResponse.json({ error: 'authorizerUserId is required' }, { status: 400 });
    }

    const { authorizeEventUseCase } = await createEventUseCases();
    const updated = await authorizeEventUseCase.execute({
      eventId: id,
      authorizerUserId,
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
