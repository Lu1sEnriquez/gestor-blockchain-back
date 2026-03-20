import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FALLBACK_IMAGES_DIR = path.join(process.cwd(), 'storage', 'template-images');

type FolderStrategy = 'template' | 'user-template' | 'scope-template';

function resolveImagesRootDir(): string {
  const configured = process.env.TEMPLATE_IMAGES_DIR?.trim();
  if (!configured) {
    return FALLBACK_IMAGES_DIR;
  }

  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

function resolvePublicBaseUrl(): string | null {
  const configured = process.env.TEMPLATE_IMAGES_BASE_URL?.trim();
  if (!configured) {
    return null;
  }

  return configured.replace(/\/$/, '');
}

function resolveFolderStrategy(): FolderStrategy {
  const raw = process.env.TEMPLATE_IMAGES_FOLDER_STRATEGY?.trim();
  if (raw === 'user-template' || raw === 'scope-template') {
    return raw;
  }

  return 'template';
}

function sanitizeTemplateId(templateId: string): string {
  return templateId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'image/svg+xml') return 'svg';
  return 'bin';
}

function normalizeAssetId(assetId: string): string {
  return assetId.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export interface StoredTemplateImage {
  assetId: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
}

export class TemplateImageStorageService {
  private readonly rootDir = resolveImagesRootDir();
  private readonly publicBaseUrl = resolvePublicBaseUrl();
  private readonly folderStrategy = resolveFolderStrategy();

  async saveImage(params: {
    templateId: string;
    fileBuffer: Buffer;
    mimeType: string;
    ownerUserId?: string;
    scope?: string;
  }): Promise<StoredTemplateImage> {
    const safeTemplateId = sanitizeTemplateId(params.templateId);
    const extension = extensionFromMimeType(params.mimeType);
    const assetId = `${crypto.randomUUID()}.${extension}`;
    const templateDir = this.resolveTemplateDir({
      safeTemplateId,
      ownerUserId: params.ownerUserId,
      scope: params.scope,
    });
    const absolutePath = this.resolveSafePath(templateDir, assetId);

    await mkdir(templateDir, { recursive: true });
    await writeFile(absolutePath, params.fileBuffer);

    return {
      assetId,
      publicUrl: this.buildPublicUrl(params.templateId, assetId),
      mimeType: params.mimeType,
      sizeBytes: params.fileBuffer.byteLength,
    };
  }

  async readImage(params: {
    templateId: string;
    assetId: string;
    ownerUserId?: string;
    scope?: string;
  }): Promise<{ buffer: Buffer; mimeType: string; sizeBytes: number } | null> {
    const safeTemplateId = sanitizeTemplateId(params.templateId);
    const safeAssetId = normalizeAssetId(params.assetId);
    const templateDir = this.resolveTemplateDir({
      safeTemplateId,
      ownerUserId: params.ownerUserId,
      scope: params.scope,
    });
    const absolutePath = this.resolveSafePath(templateDir, safeAssetId);

    try {
      const [buffer, fileStats] = await Promise.all([readFile(absolutePath), stat(absolutePath)]);
      return {
        buffer,
        mimeType: this.mimeTypeFromAssetId(safeAssetId),
        sizeBytes: fileStats.size,
      };
    } catch {
      return null;
    }
  }

  private buildPublicUrl(templateId: string, assetId: string): string {
    const relativePath = `/api/proxy/templates/${encodeURIComponent(templateId)}/images/${encodeURIComponent(assetId)}`;
    if (!this.publicBaseUrl) {
      return relativePath;
    }

    return `${this.publicBaseUrl}${relativePath}`;
  }

  private resolveTemplateDir(params: {
    safeTemplateId: string;
    ownerUserId?: string;
    scope?: string;
  }): string {
    const parts: string[] = [this.rootDir];

    if (this.folderStrategy === 'user-template' && params.ownerUserId) {
      parts.push('users', sanitizePathSegment(params.ownerUserId));
    }

    if (this.folderStrategy === 'scope-template' && params.scope) {
      parts.push('scopes', sanitizePathSegment(params.scope));
    }

    parts.push('templates', params.safeTemplateId);
    return path.join(...parts);
  }

  private resolveSafePath(baseDir: string, fileName: string): string {
    const resolvedBaseDir = path.resolve(baseDir);
    const resolvedFilePath = path.resolve(resolvedBaseDir, fileName);

    if (!resolvedFilePath.startsWith(resolvedBaseDir)) {
      throw new Error('Invalid template image path');
    }

    return resolvedFilePath;
  }

  private mimeTypeFromAssetId(assetId: string): string {
    const extension = path.extname(assetId).replace('.', '').toLowerCase();
    if (extension === 'png') return 'image/png';
    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
    if (extension === 'webp') return 'image/webp';
    if (extension === 'gif') return 'image/gif';
    if (extension === 'svg') return 'image/svg+xml';
    return 'application/octet-stream';
  }
}
