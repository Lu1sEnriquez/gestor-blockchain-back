import { NextRequest, NextResponse } from 'next/server';

import { createEventUseCases } from '@/src/modules/events/application/factories/event-use-case.factory';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, eventName, creatorUserId, globalContextInjected } = body;

    if (!templateId || !eventName || !creatorUserId) {
      return NextResponse.json(
        { error: 'templateId, eventName and creatorUserId are required' },
        { status: 400 },
      );
    }

    const { createEventUseCase } = await createEventUseCases();
    const created = await createEventUseCase.execute({
      templateId,
      eventName,
      creatorUserId,
      globalContextInjected,
    });

    return NextResponse.json(
      {
        id: created.id,
        eventName: created.eventName,
        templateId: created.templateId,
        creatorId: created.creatorId,
        consensusStatus: created.consensusStatus,
      },
      { status: 201 },
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
