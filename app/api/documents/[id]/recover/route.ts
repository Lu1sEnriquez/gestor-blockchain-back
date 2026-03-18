import { NextRequest, NextResponse } from 'next/server';
import { createRecoverDocumentUseCase } from '@/src/modules/documents/application/factories/recover-document.factory';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: folioId } = await context.params;
    const body = await request.json();
    const { requesterUserId, reason } = body;

    if (!requesterUserId) {
      return NextResponse.json(
        { error: 'requesterUserId is required' },
        { status: 400 },
      );
    }

    const useCase = await createRecoverDocumentUseCase();
    const result = await useCase.execute({
      folioId,
      requesterUserId,
      reason,
    });

    // Retornar el PDF como blob con headers apropiados
    return new NextResponse(new Uint8Array(result.pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.institutionalFolio}.pdf"`,
        'X-Folio-ID': result.folioId,
        'X-Enrollment-ID': result.enrollmentId,
        'X-Recovery-Timestamp': result.recoveredAt.toISOString(),
      },
    });
  } catch (error) {
    return mapErrorToResponse(error);
  }
}

function mapErrorToResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : 'Unexpected error';

  if (message.includes('not found')) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (message.includes('lacks recovery permission') || message.includes('lacks')) {
    return NextResponse.json({ error: message }, { status: 403 });
  }

  if (message.includes('not available in storage')) {
    return NextResponse.json(
      { error: 'PDF not available for recovery: ' + message },
      { status: 410 }, // 410 Gone - resource is no longer available
    );
  }

  if (message.includes('could not retrieve')) {
    return NextResponse.json(
      { error: 'Storage error: ' + message },
      { status: 503 }, // 503 Service Unavailable
    );
  }

  console.error('Unhandled error in recover document route:', error);
  return NextResponse.json({ error: message }, { status: 500 });
}
