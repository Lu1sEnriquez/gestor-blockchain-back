import { NextRequest, NextResponse } from 'next/server';

import { createEventUseCases } from '@/src/modules/events/application/factories/event-use-case.factory';

import { requireSessionUser } from '../_shared/auth-session';

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    if (sessionUser instanceof NextResponse) {
      return sessionUser;
    }

    const body = await request.json();
    const { templateId, eventName, globalContextInjected } = body;

    if (!templateId || !eventName) {
      return NextResponse.json(
        { error: 'templateId and eventName are required' },
        { status: 400 },
      );
    }

    const { createEventUseCase } = await createEventUseCases();
    const created = await createEventUseCase.execute({
      templateId,
      eventName,
      creatorUserId: sessionUser.id,
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
