import type {
  RuntimeCanvas,
  RuntimeFabricObject,
  RuntimeImageFactory,
} from '@/components/template-builder/types/fabric-runtime';
import type {
  TemplatePageSettings,
  TextStyleChanges,
  SelectedObjectState,
  ElementType,
} from '@/components/template-builder/types';

// ── Page dimensions ──

export const PAGE_DIMENSIONS: Record<
  'a4' | 'letter' | 'oficio',
  Record<'portrait' | 'landscape', { width: number; height: number }>
> = {
  a4: {
    portrait: { width: 794, height: 1123 },
    landscape: { width: 1123, height: 794 },
  },
  letter: {
    portrait: { width: 816, height: 1056 },
    landscape: { width: 1056, height: 816 },
  },
  oficio: {
    portrait: { width: 816, height: 1344 },
    landscape: { width: 1344, height: 816 },
  },
};

export function resolvePageSettings(
  current: TemplatePageSettings,
  changes: Partial<TemplatePageSettings>,
): TemplatePageSettings {
  const next = {
    ...current,
    ...changes,
  };

  if (next.format === 'custom') {
    return next;
  }

  const size = PAGE_DIMENSIONS[next.format][next.orientation];
  return {
    ...next,
    width: size.width,
    height: size.height,
  };
}

// ── Object manipulation helpers ──

export function applyTextStyle(
  active: RuntimeFabricObject,
  style: TextStyleChanges,
): void {
  if (typeof active.set === 'function') {
    active.set(style as Record<string, unknown>);
  }
  active.setCoords?.();
}

export function alignObject(
  active: RuntimeFabricObject,
  canvas: RuntimeCanvas,
  align: string,
): void {
  const objectWidth = Number(active.getScaledWidth?.() ?? active.width ?? 0);
  const objectHeight = Number(active.getScaledHeight?.() ?? active.height ?? 0);
  const originX = (active.originX as string) ?? 'left';
  const originY = (active.originY as string) ?? 'top';
  const next: Record<string, unknown> = {};

  // Calculate adjustment based on object's origin point
  const centerOffsetX = originX === 'center' ? 0 : originX === 'right' ? objectWidth / 2 : -objectWidth / 2;
  const centerOffsetY = originY === 'center' ? 0 : originY === 'bottom' ? objectHeight / 2 : -objectHeight / 2;

  if (align === 'left') {
    next.left = originX === 'left' ? 0 : originX === 'center' ? -objectWidth / 2 : -objectWidth;
  }
  if (align === 'center-horizontal') {
    next.left = canvas.getWidth() / 2 + centerOffsetX;
  }
  if (align === 'right') {
    next.left = originX === 'left' ? canvas.getWidth() - objectWidth : originX === 'center' ? canvas.getWidth() + objectWidth / 2 : canvas.getWidth();
  }
  if (align === 'top') {
    next.top = originY === 'top' ? 0 : originY === 'center' ? -objectHeight / 2 : -objectHeight;
  }
  if (align === 'center-vertical') {
    next.top = canvas.getHeight() / 2 + centerOffsetY;
  }
  if (align === 'bottom') {
    next.top = originY === 'top' ? canvas.getHeight() - objectHeight : originY === 'center' ? canvas.getHeight() + objectHeight / 2 : canvas.getHeight();
  }

  if (typeof active.set === 'function') {
    active.set(next);
  }
  active.setCoords?.();
}

/**
 * Aligns multiple objects relative to the bounding box of the selection.
 * Used when an ActiveSelection (multi-select) is aligned.
 */
export function alignObjectsRelative(
  objects: RuntimeFabricObject[],
  align: string,
): void {
  if (objects.length < 2) return;

  // Compute bounding box of all objects (considering their visual bounds)
  let minLeft = Infinity;
  let minTop = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;

  const measurements = objects.map((obj) => {
    const left = Number(obj.left ?? 0);
    const top = Number(obj.top ?? 0);
    const w = Number(obj.getScaledWidth?.() ?? obj.width ?? 0);
    const h = Number(obj.getScaledHeight?.() ?? obj.height ?? 0);
    const originX = (obj.originX as string) ?? 'left';
    const originY = (obj.originY as string) ?? 'top';

    // Calculate visual bounds based on origin
    const offsetLeftX = originX === 'center' ? w / 2 : originX === 'right' ? w : 0;
    const offsetTopY = originY === 'center' ? h / 2 : originY === 'bottom' ? h : 0;

    const visualLeft = left - offsetLeftX;
    const visualTop = top - offsetTopY;
    const visualRight = visualLeft + w;
    const visualBottom = visualTop + h;

    minLeft = Math.min(minLeft, visualLeft);
    minTop = Math.min(minTop, visualTop);
    maxRight = Math.max(maxRight, visualRight);
    maxBottom = Math.max(maxBottom, visualBottom);

    return { obj, w, h, originX, originY, offsetLeftX, offsetTopY };
  });

  const boundsW = maxRight - minLeft;
  const boundsH = maxBottom - minTop;
  const centerX = minLeft + boundsW / 2;
  const centerY = minTop + boundsH / 2;

  for (const { obj, w, h, originX, originY, offsetLeftX, offsetTopY } of measurements) {
    const next: Record<string, unknown> = {};

    if (align === 'left') {
      next.left = minLeft + offsetLeftX;
    }
    if (align === 'center-horizontal') {
      const centerOffset = originX === 'center' ? 0 : originX === 'right' ? w / 2 : -w / 2;
      next.left = centerX + centerOffset;
    }
    if (align === 'right') {
      next.left = maxRight - w + offsetLeftX;
    }
    if (align === 'top') {
      next.top = minTop + offsetTopY;
    }
    if (align === 'center-vertical') {
      const centerOffset = originY === 'center' ? 0 : originY === 'bottom' ? h / 2 : -h / 2;
      next.top = centerY + centerOffset;
    }
    if (align === 'bottom') {
      next.top = maxBottom - h + offsetTopY;
    }

    if (typeof obj.set === 'function') {
      obj.set(next);
    }
    obj.setCoords?.();
  }
}

export function toggleObjectLock(active: RuntimeFabricObject): void {
  const isLocked = Boolean(active.lockMovementX && active.lockMovementY);
  const nextLocked = !isLocked;
  if (typeof active.set === 'function') {
    active.set({
      lockMovementX: nextLocked,
      lockMovementY: nextLocked,
      lockRotation: nextLocked,
      lockScalingX: nextLocked,
      lockScalingY: nextLocked,
      selectable: !nextLocked,
      evented: !nextLocked,
    });
  }
  active.setCoords?.();
}

// ── Type guards & normalization ──

export function isElementType(value: unknown): value is ElementType {
  return (
    value === 'text' ||
    value === 'image' ||
    value === 'signature_block' ||
    value === 'qr' ||
    value === 'shape'
  );
}

export function normalizeHexColor(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  const shortHex = /^#([0-9a-fA-F]{3})$/;
  const fullHex = /^#([0-9a-fA-F]{6})$/;
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;

  if (fullHex.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  const shortMatch = trimmed.match(shortHex);
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  const rgbMatch = trimmed.match(rgb);
  if (!rgbMatch) {
    return undefined;
  }

  const toHex = (entry: string) => {
    const bounded = Math.max(0, Math.min(255, Number(entry)));
    return bounded.toString(16).padStart(2, '0');
  };

  return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
}

// ── SelectedObjectState builder ──

export function buildSelectedObjectState(
  active: Record<string, unknown>,
): SelectedObjectState {
  const legacyType = active.type;
  const metadata = {
    isDynamic: active.isDynamic as boolean | undefined,
    category: active.category as
      | 'plantilla'
      | 'evento'
      | 'titular'
      | 'sistema'
      | undefined,
    elementType: isElementType(active.elementType)
      ? active.elementType
      : isElementType(legacyType)
        ? legacyType
        : undefined,
    fieldId: active.fieldId as string | undefined,
    placeholder: active.placeholder as string | undefined,
  };

  const scaleX = typeof active.scaleX === 'number' ? active.scaleX : 1;
  const scaleY = typeof active.scaleY === 'number' ? active.scaleY : 1;

  return {
    id: String(active.name ?? active.id ?? crypto.randomUUID()),
    left: Number(active.left ?? 0),
    top: Number(active.top ?? 0),
    width: Number(active.width ?? 0),
    height: Number(active.height ?? 0),
    scaleX,
    scaleY,
    angle: Number(active.angle ?? 0),
    fabricType: typeof active.type === 'string' ? active.type : undefined,
    text: typeof active.text === 'string' ? active.text : undefined,
    fill:
      normalizeHexColor(active.fill) ??
      (typeof active.fill === 'string' ? active.fill : undefined),
    fontSize: typeof active.fontSize === 'number' ? active.fontSize : undefined,
    fontFamily:
      typeof active.fontFamily === 'string' ? active.fontFamily : undefined,
    fontWeight:
      typeof active.fontWeight === 'string' ||
      typeof active.fontWeight === 'number'
        ? (active.fontWeight as string | number)
        : undefined,
    fontStyle:
      active.fontStyle === 'normal' || active.fontStyle === 'italic'
        ? (active.fontStyle as 'normal' | 'italic')
        : undefined,
    underline:
      typeof active.underline === 'boolean' ? active.underline : undefined,
    textAlign:
      active.textAlign === 'left' ||
      active.textAlign === 'center' ||
      active.textAlign === 'right' ||
      active.textAlign === 'justify'
        ? (active.textAlign as 'left' | 'center' | 'right' | 'justify')
        : undefined,
    stroke: typeof active.stroke === 'string' ? active.stroke : undefined,
    strokeWidth:
      typeof active.strokeWidth === 'number' ? active.strokeWidth : undefined,
    strokeDashArray: Array.isArray(active.strokeDashArray)
      ? (active.strokeDashArray as number[])
      : null,
    opacity: typeof active.opacity === 'number' ? active.opacity : 1,
    locked: Boolean(active.lockMovementX && active.lockMovementY),
    metadata,
  };
}

// ── Fabric module resolver ──

export function getFabricExport<T>(
  module: Record<string, unknown>,
  name: string,
): T | null {
  const direct = module[name];
  if (direct != null) {
    return direct as T;
  }

  const namespaced = (module.fabric as Record<string, unknown> | undefined)?.[
    name
  ];
  if (namespaced != null) {
    return namespaced as T;
  }

  const defaultExport = (
    module.default as Record<string, unknown> | undefined
  )?.[name];
  if (defaultExport != null) {
    return defaultExport as T;
  }

  return null;
}

// ── URL helpers ──

export function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (typeof window === 'undefined') {
    return url;
  }

  return new URL(url, window.location.origin).toString();
}

export function toSameOriginApiPath(url: string): string {
  if (url.startsWith('/api/')) {
    return url;
  }

  try {
    const parsed = new URL(
      url,
      typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost',
    );
    if (parsed.pathname.startsWith('/api/')) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Keep original URL when parsing fails.
  }

  return url;
}

// ── Image helpers ──

export async function createFabricImageFromUrl(
  imageFactory: RuntimeImageFactory,
  url: string,
  options: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  try {
    const promiseResult = await (
      imageFactory as {
        fromURL: (
          url: string,
          options?: Record<string, unknown>,
        ) => Promise<Record<string, unknown>>;
      }
    ).fromURL(url, options);
    if (promiseResult) {
      return promiseResult;
    }
  } catch {
    // Fall back to callback-based overload.
  }

  try {
    return await new Promise<Record<string, unknown> | null>((resolve) => {
      try {
        (
          imageFactory.fromURL as (
            url: string,
            callback: (image: Record<string, unknown> | null) => void,
            options?: Record<string, unknown>,
          ) => void
        ).call(imageFactory, url, (image) => resolve(image ?? null), options);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}
