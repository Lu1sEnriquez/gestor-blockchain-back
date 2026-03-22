import { NextRequest, NextResponse } from 'next/server';

import { createEventUseCases } from '@/src/modules/events/application/factories/event-use-case.factory';

import { requireSessionUser } from '../../../_shared/auth-session';

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    if (sessionUser instanceof NextResponse) {
      return sessionUser;
    }

    const body = await request.json().catch(() => ({}));
    const maxJobs =
      typeof body.maxJobs === 'number' && Number.isFinite(body.maxJobs)
        ? body.maxJobs
        : undefined;

    const { processRevocationQueueUseCase } = await createEventUseCases();
    const result = await processRevocationQueueUseCase.execute({
      requesterUserId: sessionUser.id,
      maxJobs,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
