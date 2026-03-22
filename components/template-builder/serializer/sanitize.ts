import { normalizeHexColor } from '@/components/template-builder/utils/fabric-helpers';

// Map lowercase type → PascalCase class name expected by Fabric.js v7 classRegistry.
export const FABRIC_V7_TYPE_MAP: Record<string, string> = {
  textbox: 'Textbox',
  text: 'Textbox', // legacy Text → Textbox
  'i-text': 'Textbox', // legacy IText → Textbox
  itext: 'Textbox',
  image: 'Image',
  fabricimage: 'Image',
  rect: 'Rect',
  group: 'Group',
  line: 'Line',
  circle: 'Circle',
  triangle: 'Triangle',
  ellipse: 'Ellipse',
  polygon: 'Polygon',
  polyline: 'Polyline',
  path: 'Path',
  activeselection: 'ActiveSelection',
};

export function sanitizeFabricObjectForLoad(entry: unknown): unknown {
  if (!entry || typeof entry !== 'object') {
    return entry;
  }

  const object = { ...(entry as Record<string, unknown>) };
  const rawType = typeof object.type === 'string' ? object.type : '';
  const typeLower = rawType.toLowerCase();

  const resolvedType = FABRIC_V7_TYPE_MAP[typeLower];
  if (!resolvedType) {
    return null;
  }

  // Always write the PascalCase type Fabric v7 expects.
  object.type = resolvedType;

  const isTextType = resolvedType === 'Textbox';
  const hasTextTraits =
    typeof object.fontSize === 'number' ||
    typeof object.fontFamily === 'string' ||
    typeof object.textAlign === 'string' ||
    Object.prototype.hasOwnProperty.call(object, 'text');

  if (isTextType || hasTextTraits) {
    // Fabric.js v7 calls .split() on text and fontFamily internally.
    // Undefined values cause "Cannot read properties of undefined (reading 'split')".
    if (typeof object.text !== 'string') {
      object.text = object.text == null ? '' : String(object.text);
    }

    if (typeof object.fontFamily !== 'string' || !object.fontFamily) {
      object.fontFamily = 'sans-serif';
    }

    if (typeof object.textAlign !== 'string') {
      object.textAlign = 'left';
    }

    if (typeof object.fontStyle !== 'string') {
      object.fontStyle = 'normal';
    }

    if (
      typeof object.fontWeight !== 'string' &&
      typeof object.fontWeight !== 'number'
    ) {
      object.fontWeight = 'normal';
    }

    if (object.styles == null || Array.isArray(object.styles)) {
      object.styles = {};
    }

    if (typeof object.splitByGrapheme !== 'boolean') {
      object.splitByGrapheme = false;
    }

    // Fabric.js v7 may call .split() on path if it's not null/string.
    if (
      object.path !== undefined &&
      object.path !== null &&
      typeof object.path !== 'string' &&
      !Array.isArray(object.path)
    ) {
      delete object.path;
    }
  }

  // Ensure fill is always a valid value — Fabric v7 may call .split() on color strings
  if (object.fill === undefined || object.fill === null) {
    object.fill = isTextType ? '#0f172a' : '#e2e8f0';
  }
  const normalizedFill = normalizeHexColor(object.fill);
  if (normalizedFill) {
    object.fill = normalizedFill;
  }

  if (object.stroke === undefined) {
    // Leave stroke as undefined — Fabric handles no-stroke fine
  } else if (object.stroke === null) {
    delete object.stroke;
  } else {
    const normalizedStroke = normalizeHexColor(object.stroke);
    if (normalizedStroke) {
      object.stroke = normalizedStroke;
    }
  }

  if (Array.isArray(object.objects)) {
    object.objects = object.objects.map((child) =>
      sanitizeFabricObjectForLoad(child),
    );
  }

  return object;
}

export function sanitizeSceneForLoad(
  scene: Record<string, unknown>,
): Record<string, unknown> {
  const objects = Array.isArray(scene.objects)
    ? (scene.objects as unknown[])
        .map((entry) => sanitizeFabricObjectForLoad(entry))
        .filter((entry): entry is Record<string, unknown> =>
          Boolean(entry && typeof entry === 'object'),
        )
    : [];

  const normalizedBackground =
    normalizeHexColor(scene.backgroundColor) ??
    normalizeHexColor(scene.background) ??
    (typeof scene.backgroundColor === 'string'
      ? scene.backgroundColor
      : '#ffffff');

  // Build a clean scene: only pass Fabric-native keys + page metadata.
  // Avoids polluting loadFromJSON with unknown keys.
  return {
    version: scene.version,
    backgroundColor: normalizedBackground,
    objects,
    // Keep page as opaque data — Fabric ignores it, but our code reads it.
    page: scene.page,
  };
}

/**
 * Partition scene objects into text vs non-text.
 * Text objects (Textbox) crash inside Fabric v7's fromObject, so we'll
 * load them manually via the Textbox constructor instead.
 */
export function partitionSceneObjects(objects: Array<Record<string, unknown>>): {
  nonText: Array<Record<string, unknown>>;
  text: Array<Record<string, unknown>>;
} {
  const nonText: Array<Record<string, unknown>> = [];
  const text: Array<Record<string, unknown>> = [];

  for (const obj of objects) {
    const t = typeof obj.type === 'string' ? obj.type : '';
    if (t === 'Textbox' || t === 'IText' || t === 'Text') {
      text.push(obj);
    } else {
      nonText.push(obj);
    }
  }

  return { nonText, text };
}
