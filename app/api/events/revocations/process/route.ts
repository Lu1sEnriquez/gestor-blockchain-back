import { NextRequest, NextResponse } from 'next/server';

import { createEventUseCases } from '@/src/modules/events/application/factories/event-use-case.factory';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const requesterUserId =
      typeof body.requesterUserId === 'string' ? body.requesterUserId.trim() : '';

    if (!requesterUserId) {
      return NextResponse.json({ error: 'requesterUserId is required' }, { status: 400 });
    }

    const maxJobs =
      typeof body.maxJobs === 'number' && Number.isFinite(body.maxJobs)
        ? body.maxJobs
        : undefined;

    const { processRevocationQueueUseCase } = await createEventUseCases();
    const result = await processRevocationQueueUseCase.execute({
      requesterUserId,
      maxJobs,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
