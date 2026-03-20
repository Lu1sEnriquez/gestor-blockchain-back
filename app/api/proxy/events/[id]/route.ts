import { NextRequest, NextResponse } from 'next/server';

import { createEventUseCases } from '@/src/modules/events/application/factories/event-use-case.factory';

import { requireSessionUser } from '../../_shared/auth-session';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    if (sessionUser instanceof NextResponse) {
      return sessionUser;
    }

    const { id } = await context.params;

    const { getEventUseCase } = await createEventUseCases();
    const event = await getEventUseCase.execute({
      eventId: id,
      requesterUserId: sessionUser.id,
    });

    return NextResponse.json(
      {
        id: event.id,
        eventName: event.eventName,
        templateId: event.templateId,
        creatorId: event.creatorId,
        consensusStatus: event.consensusStatus,
        web3Enabled: event.web3Enabled,
        globalContextInjected: event.globalContextInjected,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
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

  return NextResponse.json({ error: message }, { status: 400 });
}
