import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { AppDataSource } from '@/src/shared/db/data-source';
import { DocumentTemplateRepository } from '@/src/modules/templates/infrastructure/repositories/document-template.repository';
import { TemplateImageStorageService } from '@/src/modules/templates/infrastructure/services/template-image-storage.service';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';

interface Params {
  params: Promise<{ id: string }>;
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: templateId } = await params;

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const templateRepo = new DocumentTemplateRepository(AppDataSource);
    const userRepo = new UserRepository(AppDataSource);
    const rbacService = new RBACService();

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

    const canEditTemplate = requester.rolesAssigned.some((role) =>
      rbacService.canCreateTemplate(role)
    );
    if (!canEditTemplate) {
      return NextResponse.json({ error: 'User lacks create_template permission' }, { status: 403 });
    }

    const formData = await request.formData();
    const imageFile = formData.get('image');
    const scopeInput = formData.get('scope');
    const scope = typeof scopeInput === 'string' ? scopeInput.trim() : undefined;

    if (!(imageFile instanceof File)) {
      return NextResponse.json({ error: 'image file is required' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(imageFile.type)) {
      return NextResponse.json(
        { error: `Unsupported image MIME type: ${imageFile.type || 'unknown'}` },
        { status: 400 }
      );
    }

    if (imageFile.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Image exceeds ${MAX_IMAGE_SIZE_BYTES} bytes` },
        { status: 400 }
      );
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const storageService = new TemplateImageStorageService();
    const storedImage = await storageService.saveImage({
      templateId,
      fileBuffer: imageBuffer,
      mimeType: imageFile.type,
      ownerUserId: template.creatorId,
      scope,
    });

    return NextResponse.json(storedImage, { status: 201 });
  } catch (error) {
    console.error('[proxy/templates/:id/images POST]', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
