import { NextRequest, NextResponse } from 'next/server';

import { createEventUseCases } from '@/src/modules/events/application/factories/event-use-case.factory';

import { requireSessionUser } from '../../../../_shared/auth-session';

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
    const { declaredZones, rows, zipBundles } = body;

    if (!Array.isArray(declaredZones) || !Array.isArray(rows)) {
      return NextResponse.json(
        { error: 'declaredZones[] and rows[] are required' },
        { status: 400 },
      );
    }

    const { reconcileStagingUseCase } = await createEventUseCases();
    const result = await reconcileStagingUseCase.execute({
      eventId: id,
      operatorUserId: sessionUser.id,
      declaredZones,
      rows,
      zipBundles: Array.isArray(zipBundles) ? zipBundles : [],
    });

    return NextResponse.json(result, { status: 200 });
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

  if (message.includes('required SIGNED')) {
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}
