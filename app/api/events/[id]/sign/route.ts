import { NextRequest, NextResponse } from 'next/server';

import { createEventUseCases } from '@/src/modules/events/application/factories/event-use-case.factory';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { signerUserId, documentHashes } = body;

    if (!signerUserId || !Array.isArray(documentHashes)) {
      return NextResponse.json(
        { error: 'signerUserId and documentHashes[] are required' },
        { status: 400 },
      );
    }

    const { signEventUseCase } = await createEventUseCases();
    const updated = await signEventUseCase.execute({
      eventId: id,
      signerUserId,
      documentHashes,
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
