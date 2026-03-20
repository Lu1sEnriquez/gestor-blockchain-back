import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { AppDataSource } from '@/src/shared/db/data-source';
import { DocumentTemplateRepository } from '@/src/modules/templates/infrastructure/repositories/document-template.repository';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { TemplateImageStorageService } from '@/src/modules/templates/infrastructure/services/template-image-storage.service';

interface Params {
  params: Promise<{ id: string; assetId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: templateId, assetId } = await params;

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const templateRepo = new DocumentTemplateRepository(AppDataSource);
    const userRepo = new UserRepository(AppDataSource);

    const [template, requester] = await Promise.all([
      templateRepo.findById(templateId),
      userRepo.findById(session.user.id),
    ]);

    if (!template) {
      return NextResponse.json({ error: `Template with ID ${templateId} not found` }, { status: 404 });
    }

    if (!requester) {
      return NextResponse.json({ error: 'Requester user not found' }, { status: 404 });
    }

    const scope = request.nextUrl.searchParams.get('scope')?.trim() || undefined;
    const storageService = new TemplateImageStorageService();
    const storedImage = await storageService.readImage({
      templateId,
      assetId,
      ownerUserId: template.creatorId,
      scope,
    });

    if (!storedImage) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const payload = new Uint8Array(
      storedImage.buffer.buffer,
      storedImage.buffer.byteOffset,
      storedImage.buffer.byteLength,
    );

    return new NextResponse(payload, {
      status: 200,
      headers: {
        'Content-Type': storedImage.mimeType,
        'Content-Length': String(storedImage.sizeBytes),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[proxy/templates/:id/images/:assetId GET]', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
