import { useEffect } from 'react';
import type {
  RuntimeCanvas,
  RuntimeFabricObject,
  RuntimeImageFactory,
} from '@/components/template-builder/types/fabric-runtime';
import {
  getFabricExport,
  toAbsoluteUrl,
  toSameOriginApiPath,
  createFabricImageFromUrl,
} from '@/components/template-builder/utils/fabric-helpers';

interface UploadedTemplateImage {
  assetId: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
}

interface TemplateImageUploadEventDetail {
  file: File;
}

async function uploadTemplateImage(
  templateId: string,
  file: File,
): Promise<UploadedTemplateImage> {
  const payload = new FormData();
  payload.set('image', file);

  const response = await fetch(`/api/proxy/templates/${templateId}/images`, {
    method: 'POST',
    body: payload,
  });

  if (!response.ok) {
    let message = 'Error uploading image';
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  return (await response.json()) as UploadedTemplateImage;
}

async function insertUploadedImageIntoCanvas(params: {
  runtimeCanvas: RuntimeCanvas;
  fabricModule: Record<string, unknown>;
  uploaded: UploadedTemplateImage;
}): Promise<void> {
  const imageFactory =
    getFabricExport<RuntimeImageFactory>(params.fabricModule, 'FabricImage') ??
    getFabricExport<RuntimeImageFactory>(params.fabricModule, 'Image');
  if (!imageFactory || typeof imageFactory.fromURL !== 'function') {
    throw new Error(
      'No se pudo inicializar FabricImage para insertar la imagen.',
    );
  }

  const sameOriginPath = toSameOriginApiPath(params.uploaded.publicUrl);
  const imageUrl = toAbsoluteUrl(sameOriginPath);

  const imageObject = await createFabricImageFromUrl(imageFactory, imageUrl, {
    left: params.runtimeCanvas.getWidth() / 2,
    top: params.runtimeCanvas.getHeight() / 2,
    originX: 'center',
    originY: 'center',
  });

  if (!imageObject) {
    throw new Error(
      `No se pudo crear la imagen en el canvas para URL: ${params.uploaded.publicUrl} (normalizada: ${sameOriginPath})`,
    );
  }

  const runtimeImage = imageObject as RuntimeFabricObject;
  if (typeof runtimeImage.set === 'function') {
    runtimeImage.set({
      category: 'plantilla',
      elementType: 'image',
      isDynamic: false,
      fieldId: `imagen_${params.uploaded.assetId}`,
      name: `imagen_${params.uploaded.assetId}`,
      assetId: params.uploaded.assetId,
      metadata: {
        category: 'plantilla',
        type: 'image',
        isDynamic: false,
        assetId: params.uploaded.assetId,
      },
    });
  }

  const width = Number((runtimeImage.width as number | undefined) ?? 0);
  const height = Number((runtimeImage.height as number | undefined) ?? 0);
  if (width > 0 && height > 0 && typeof runtimeImage.set === 'function') {
    const maxWidth = params.runtimeCanvas.getWidth() * 0.45;
    const maxHeight = params.runtimeCanvas.getHeight() * 0.45;
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);

    runtimeImage.set({
      scaleX: scale,
      scaleY: scale,
    });
  }

  runtimeImage.setCoords?.();
  params.runtimeCanvas.add(runtimeImage);
  params.runtimeCanvas.setActiveObject(runtimeImage);
  params.runtimeCanvas.requestRenderAll();
}

function normalizeClipboardText(input: unknown): string {
  if (typeof input === 'string') {
    return input.replace(/\r\n/g, '\n').trim();
  }

  if (input == null) {
    return '';
  }

  return String(input).replace(/\r\n/g, '\n').trim();
}

function createPlainTextFromClipboard(input: unknown): string {
  const normalized = normalizeClipboardText(input);
  if (normalized.length > 0) {
    return normalized;
  }

  throw new Error('No hay texto en el portapapeles.');
}

export function insertPlainTextIntoCanvas(params: {
  runtimeCanvas: RuntimeCanvas;
  fabricModule: Record<string, unknown>;
  text: unknown;
  left?: number;
  top?: number;
}): void {
  const Textbox = getFabricExport<
    new (
      text: string,
      options: Record<string, unknown>,
    ) => Record<string, unknown>
  >(params.fabricModule, 'Textbox');

  if (!Textbox) {
    throw new Error('No se pudo inicializar Textbox para pegar texto.');
  }

  const safeText = createPlainTextFromClipboard(params.text);

  const object = new Textbox(safeText, {
    left: params.left ?? params.runtimeCanvas.getWidth() / 2,
    top: params.top ?? params.runtimeCanvas.getHeight() / 2,
    width: 520,
    fontSize: 22,
    fill: '#0f172a',
    category: 'plantilla',
    elementType: 'text',
    isDynamic: false,
    fieldId: 'texto_pegado',
    name: `texto_pegado_${Date.now()}`,
    originX: 'center',
    originY: 'center',
  });

  params.runtimeCanvas.add(object);
  params.runtimeCanvas.setActiveObject(object);
  params.runtimeCanvas.requestRenderAll();
}

/**
 * Handles paste (image), drag-and-drop (image), and sidebar upload events.
 */
export function useCanvasDropZone(
  workspaceRef: React.RefObject<HTMLDivElement | null>,
  runtimeCanvasRef: React.RefObject<RuntimeCanvas | null>,
  fabricModuleRef: React.RefObject<Record<string, unknown> | null>,
  templateId: string,
) {
  useEffect(() => {
    const notifyUploadStatus = (detail: {
      status: 'uploading' | 'success' | 'error';
      source: 'paste' | 'drop' | 'sidebar';
      message?: string;
    }) => {
      window.dispatchEvent(
        new CustomEvent('template-builder:image-upload-status', {
          detail,
        }),
      );
    };

    const processImageFile = async (
      file: File,
      source: 'paste' | 'drop' | 'sidebar',
    ) => {
      try {
        const runtimeCanvas = runtimeCanvasRef.current;
        const fabricModule = fabricModuleRef.current;

        if (!runtimeCanvas || !fabricModule) {
          return;
        }

        if (!templateId) {
          console.warn(
            `[template-builder] Ignored ${source} image because templateId is empty.`,
          );
          notifyUploadStatus({
            status: 'error',
            source,
            message: 'No se puede subir imagen sin templateId activo.',
          });
          return;
        }

        notifyUploadStatus({
          status: 'uploading',
          source,
          message: 'Subiendo imagen...',
        });

        const uploaded = await uploadTemplateImage(templateId, file);
        await insertUploadedImageIntoCanvas({
          runtimeCanvas,
          fabricModule,
          uploaded,
        });

        notifyUploadStatus({
          status: 'success',
          source,
          message: 'Imagen agregada al canvas.',
        });
      } catch (error) {
        console.error(
          `[template-builder] Failed to handle ${source} image`,
          error,
        );
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo procesar la imagen.';
        notifyUploadStatus({
          status: 'error',
          source,
          message,
        });
      }
    };

    const onPaste = async (event: ClipboardEvent) => {
      const imageItem = event.clipboardData
        ? Array.from(event.clipboardData.items).find((entry) =>
            entry.type.startsWith('image/'),
          )
        : undefined;

      if (!imageItem) {
        return;
      }

      const file = imageItem.getAsFile();
      if (!file) {
        return;
      }

      event.preventDefault();
      await processImageFile(file, 'paste');
    };

    const onDrop = async (event: DragEvent) => {
      const workspace = workspaceRef.current;
      if (!workspace) {
        return;
      }

      const target = event.target as Node | null;
      if (target && !workspace.contains(target)) {
        return;
      }

      const imageFile = event.dataTransfer?.files
        ? Array.from(event.dataTransfer.files).find((entry) =>
            entry.type.startsWith('image/'),
          )
        : undefined;

      if (!imageFile) {
        return;
      }

      event.preventDefault();
      await processImageFile(imageFile, 'drop');
    };

    const onDragOver = (event: DragEvent) => {
      const workspace = workspaceRef.current;
      if (!workspace) {
        return;
      }

      const target = event.target as Node | null;
      if (target && !workspace.contains(target)) {
        return;
      }

      const hasImageFile = event.dataTransfer?.types?.includes('Files');
      if (!hasImageFile) {
        return;
      }

      event.preventDefault();
      event.dataTransfer!.dropEffect = 'copy';
    };

    const onSidebarUpload = async (event: Event) => {
      const customEvent = event as CustomEvent<TemplateImageUploadEventDetail>;
      const file = customEvent.detail?.file;
      if (!file || !file.type.startsWith('image/')) {
        return;
      }

      await processImageFile(file, 'sidebar');
    };

    window.addEventListener('paste', onPaste);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    window.addEventListener('template-builder:image-upload', onSidebarUpload);

    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener(
        'template-builder:image-upload',
        onSidebarUpload,
      );
    };
  }, [workspaceRef, runtimeCanvasRef, fabricModuleRef, templateId]);
}
