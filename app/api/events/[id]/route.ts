import { NextRequest, NextResponse } from 'next/server';

import { createEventUseCases } from '@/src/modules/events/application/factories/event-use-case.factory';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const requesterUserId = request.nextUrl.searchParams.get('requesterUserId');

    if (!requesterUserId) {
      return NextResponse.json({ error: 'requesterUserId is required' }, { status: 400 });
    }

    const { getEventUseCase } = await createEventUseCases();
    const event = await getEventUseCase.execute({
      eventId: id,
      requesterUserId,
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
