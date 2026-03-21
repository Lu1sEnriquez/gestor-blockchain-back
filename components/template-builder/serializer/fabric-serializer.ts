import type { RuntimeCanvas } from '@/components/template-builder/types/fabric-runtime';
import type {
  FabricTemplateScene,
  TemplatePageSettings,
} from '@/components/template-builder/types';
import { FABRIC_METADATA_KEYS } from '@/components/template-builder/types';
import { getFabricExport } from '@/components/template-builder/utils/fabric-helpers';
import { partitionSceneObjects } from '@/components/template-builder/serializer/sanitize';
import { createObjectByPreset } from '@/components/template-builder/factories/create-object-by-preset';
import type { RuntimeFabricObject } from '@/components/template-builder/types/fabric-runtime';

/**
 * Load a scene into the canvas.
 * Signature blocks are reconstructed from lightweight markers instead of
 * deserializing nested group children from JSON.
 */
export async function loadSceneSafely(
  runtimeCanvas: RuntimeCanvas,
  scene: Record<string, unknown>,
  fabricModule: Record<string, unknown>,
): Promise<void> {
  const allObjects = Array.isArray(scene.objects)
    ? (scene.objects as Array<Record<string, unknown>>)
    : [];

  const signatureMarkers = allObjects.filter((entry) => {
    const elementType = entry.elementType;
    const fieldId = entry.fieldId;
    return (
      elementType === 'signature_block' ||
      (typeof fieldId === 'string' && fieldId.startsWith('firma_'))
    );
  });

  const objectsWithoutSignature = allObjects.filter(
    (entry) => !signatureMarkers.includes(entry),
  );

  const { nonText, text: textObjects } =
    partitionSceneObjects(objectsWithoutSignature);

  // --- Step 1: load non-text objects via native loadFromJSON ---
  const nonTextScene = { ...scene, objects: nonText };
  try {
    const maybePromise = runtimeCanvas.loadFromJSON(nonTextScene);
    if (
      maybePromise &&
      typeof (maybePromise as Promise<unknown>).then === 'function'
    ) {
      await (maybePromise as Promise<unknown>);
    }
  } catch (error) {
    console.error(
      '[template-builder] loadFromJSON failed for non-text scene',
      error,
    );
    const maybePromise = runtimeCanvas.loadFromJSON({
      ...nonTextScene,
      objects: [],
    });
    if (
      maybePromise &&
      typeof (maybePromise as Promise<unknown>).then === 'function'
    ) {
      await (maybePromise as Promise<unknown>);
    }
  }

  // --- Step 2: manually create Textbox instances ---
  const TextboxClass = getFabricExport<
    new (
      text: string,
      options: Record<string, unknown>,
    ) => Record<string, unknown>
  >(fabricModule, 'Textbox');

  if (TextboxClass) {
    const CONSTRUCTOR_SKIP_KEYS = new Set(['type', 'version', 'text']);

    for (const objData of textObjects) {
      try {
        const textContent =
          typeof objData.text === 'string' ? objData.text : '';
        const options: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(objData)) {
          if (CONSTRUCTOR_SKIP_KEYS.has(key)) continue;
          if (value === undefined) continue;
          options[key] = value;
        }

        if (options.styles == null || Array.isArray(options.styles)) {
          options.styles = {};
        }

        const instance = new TextboxClass(textContent, options);
        runtimeCanvas.add(instance);
      } catch (textError) {
        console.error(
          '[template-builder] Failed to create Textbox from saved data',
          textError,
          objData,
        );
      }
    }
  }

  // --- Step 3: rebuild signature blocks from markers ---
  for (const marker of signatureMarkers) {
    try {
      const signatureObject = createObjectByPreset(
        'evento-firma',
        fabricModule,
        runtimeCanvas,
      ) as RuntimeFabricObject;

      const patch: Record<string, unknown> = {};
      if (typeof marker.left === 'number') patch.left = marker.left;
      if (typeof marker.top === 'number') patch.top = marker.top;
      if (typeof marker.scaleX === 'number') patch.scaleX = marker.scaleX;
      if (typeof marker.scaleY === 'number') patch.scaleY = marker.scaleY;
      if (typeof marker.angle === 'number') patch.angle = marker.angle;

      if (
        marker.originX === 'left' ||
        marker.originX === 'center' ||
        marker.originX === 'right'
      ) {
        patch.originX = marker.originX;
      }
      if (
        marker.originY === 'top' ||
        marker.originY === 'center' ||
        marker.originY === 'bottom'
      ) {
        patch.originY = marker.originY;
      }

      patch.elementType = 'signature_block';
      patch.category = 'evento';
      patch.isDynamic = true;
      patch.fieldId =
        typeof marker.fieldId === 'string' && marker.fieldId.length > 0
          ? marker.fieldId
          : 'firma_1';
      patch.placeholder = `{{${patch.fieldId as string}}}`;

      if (typeof marker.name === 'string' && marker.name.length > 0) {
        patch.name = marker.name;
      }

      if (typeof signatureObject.set === 'function') {
        signatureObject.set(patch);
      } else {
        Object.assign(signatureObject, patch);
      }

      signatureObject.setCoords?.();
      runtimeCanvas.add(signatureObject as Record<string, unknown>);
    } catch (error) {
      console.error(
        '[template-builder] Failed to rebuild signature block',
        error,
        marker,
      );
    }
  }

  runtimeCanvas.requestRenderAll();
}

export function serializeScene(
  canvas: RuntimeCanvas,
  pageSettings: TemplatePageSettings,
): FabricTemplateScene {
  const rawScene = canvas.toJSON(FABRIC_METADATA_KEYS);
  const objects = Array.isArray(rawScene.objects)
    ? (rawScene.objects as Array<Record<string, unknown>>)
    : [];

  // Use backgroundColor (Fabric-native key) for round-trip safety.
  const bg =
    typeof rawScene.backgroundColor === 'string'
      ? rawScene.backgroundColor
      : typeof rawScene.background === 'string'
        ? rawScene.background
        : '#ffffff';

  return {
    version:
      typeof rawScene.version === 'string' ? rawScene.version : undefined,
    backgroundColor: bg,
    background: bg,
    page: pageSettings,
    objects,
  };
}
