"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_FABRIC_SCENE,
  DEFAULT_TEMPLATE_PAGE_SETTINGS,
} from "@/components/template-builder/defaults";
import { FABRIC_METADATA_KEYS } from "@/components/template-builder/types";
import { preloadSceneFonts } from "@/components/template-builder/font-loader";
import { useTemplateBuilderStore } from "@/components/template-builder/store/use-template-builder-store";
import {
  TemplateAttribute,
  FabricTemplateScene,
  InsertionPreset,
  SelectedObjectState,
  ElementType,
  TemplatePageSettings,
  TextStyleChanges,
  AlignCommand,
  ZOrderCommand,
} from "@/components/template-builder/types";

type RuntimeCanvas = {
  add: (...args: unknown[]) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
  dispose: () => void;
  getObjects: () => Array<Record<string, unknown>>;
  getActiveObject: () => Record<string, unknown> | null;
  getActiveObjects?: () => Array<Record<string, unknown>>;
  discardActiveObject: () => void;
  remove: (object: Record<string, unknown>) => void;
  setActiveObject: (object: Record<string, unknown>) => void;
  requestRenderAll: () => void;
  getWidth: () => number;
  getHeight: () => number;
  setDimensions: (dimensions: { width: number; height: number }) => void;
  toJSON: (propertiesToInclude?: string[]) => Record<string, unknown>;
  loadFromJSON: (
    json: Record<string, unknown>,
    callback?: () => void,
  ) => void | Promise<unknown>;
};

type RuntimeImageFactory = {
  fromURL:
    | ((
        url: string,
        options?: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>)
    | ((
        url: string,
        callback: (image: Record<string, unknown>) => void,
        options?: Record<string, unknown>,
      ) => void);
};

type FabricCloneCallback = (cloned: Record<string, unknown>) => void;

type RuntimeFabricObject = Record<string, unknown> & {
  clone?:
    | ((callback: FabricCloneCallback) => void)
    | (() => Promise<Record<string, unknown>>);
  set?: (values: Record<string, unknown>) => void;
  setCoords?: () => void;
  bringToFront?: () => void;
  sendToBack?: () => void;
  bringForward?: () => void;
  sendBackwards?: () => void;
  selectable?: boolean;
  evented?: boolean;
  lockMovementX?: boolean;
  lockMovementY?: boolean;
  lockRotation?: boolean;
  lockScalingX?: boolean;
  lockScalingY?: boolean;
  getScaledWidth?: () => number;
  getScaledHeight?: () => number;
};

const PAGE_DIMENSIONS: Record<
  "a4" | "letter" | "oficio",
  Record<"portrait" | "landscape", { width: number; height: number }>
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

function resolvePageSettings(
  current: TemplatePageSettings,
  changes: Partial<TemplatePageSettings>,
): TemplatePageSettings {
  const next = {
    ...current,
    ...changes,
  };

  if (next.format === "custom") {
    return next;
  }

  const size = PAGE_DIMENSIONS[next.format][next.orientation];
  return {
    ...next,
    width: size.width,
    height: size.height,
  };
}

function applyTextStyle(
  active: RuntimeFabricObject,
  style: TextStyleChanges,
): void {
  if (typeof active.set === "function") {
    active.set(style as Record<string, unknown>);
  }
  active.setCoords?.();
}

function alignObject(
  active: RuntimeFabricObject,
  canvas: RuntimeCanvas,
  align: string,
): void {
  const objectWidth = Number(active.getScaledWidth?.() ?? active.width ?? 0);
  const objectHeight = Number(active.getScaledHeight?.() ?? active.height ?? 0);
  const next: Record<string, unknown> = {};

  if (align === "left") {
    next.left = 0;
  }
  if (align === "center-horizontal") {
    next.left = Math.max((canvas.getWidth() - objectWidth) / 2, 0);
  }
  if (align === "right") {
    next.left = Math.max(canvas.getWidth() - objectWidth, 0);
  }
  if (align === "top") {
    next.top = 0;
  }
  if (align === "center-vertical") {
    next.top = Math.max((canvas.getHeight() - objectHeight) / 2, 0);
  }
  if (align === "bottom") {
    next.top = Math.max(canvas.getHeight() - objectHeight, 0);
  }

  if (typeof active.set === "function") {
    active.set(next);
  }
  active.setCoords?.();
}

function toggleObjectLock(active: RuntimeFabricObject): void {
  const isLocked = Boolean(active.lockMovementX && active.lockMovementY);
  const nextLocked = !isLocked;
  if (typeof active.set === "function") {
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

function isElementType(value: unknown): value is ElementType {
  return (
    value === "text" ||
    value === "image" ||
    value === "signature_block" ||
    value === "qr" ||
    value === "shape"
  );
}

function normalizeHexColor(value: unknown): string | undefined {
  if (typeof value !== "string") {
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
    const [r, g, b] = shortMatch[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  const rgbMatch = trimmed.match(rgb);
  if (!rgbMatch) {
    return undefined;
  }

  const toHex = (entry: string) => {
    const bounded = Math.max(0, Math.min(255, Number(entry)));
    return bounded.toString(16).padStart(2, "0");
  };

  return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
}

// Map lowercase type → PascalCase class name expected by Fabric.js v7 classRegistry.
const FABRIC_V7_TYPE_MAP: Record<string, string> = {
  textbox: "Textbox",
  text: "Textbox", // legacy Text → Textbox
  "i-text": "Textbox", // legacy IText → Textbox
  itext: "Textbox",
  image: "Image",
  fabricimage: "Image",
  rect: "Rect",
  group: "Group",
  line: "Line",
  circle: "Circle",
  triangle: "Triangle",
  ellipse: "Ellipse",
  polygon: "Polygon",
  polyline: "Polyline",
  path: "Path",
  activeselection: "ActiveSelection",
};

function sanitizeFabricObjectForLoad(entry: unknown): unknown {
  if (!entry || typeof entry !== "object") {
    return entry;
  }

  const object = { ...(entry as Record<string, unknown>) };
  const rawType = typeof object.type === "string" ? object.type : "";
  const typeLower = rawType.toLowerCase();

  const resolvedType = FABRIC_V7_TYPE_MAP[typeLower];
  if (!resolvedType) {
    return null;
  }

  // Always write the PascalCase type Fabric v7 expects.
  object.type = resolvedType;

  const isTextType = resolvedType === "Textbox";
  const hasTextTraits =
    typeof object.fontSize === "number" ||
    typeof object.fontFamily === "string" ||
    typeof object.textAlign === "string" ||
    Object.prototype.hasOwnProperty.call(object, "text");

  if (isTextType || hasTextTraits) {
    // Fabric.js v7 calls .split() on text and fontFamily internally.
    // Undefined values cause "Cannot read properties of undefined (reading 'split')".
    if (typeof object.text !== "string") {
      object.text = object.text == null ? "" : String(object.text);
    }

    if (typeof object.fontFamily !== "string" || !object.fontFamily) {
      object.fontFamily = "sans-serif";
    }

    if (typeof object.textAlign !== "string") {
      object.textAlign = "left";
    }

    if (typeof object.fontStyle !== "string") {
      object.fontStyle = "normal";
    }

    if (
      typeof object.fontWeight !== "string" &&
      typeof object.fontWeight !== "number"
    ) {
      object.fontWeight = "normal";
    }

    if (object.styles == null || Array.isArray(object.styles)) {
      object.styles = {};
    }

    if (typeof object.splitByGrapheme !== "boolean") {
      object.splitByGrapheme = false;
    }

    // Fabric.js v7 may call .split() on path if it's not null/string.
    if (
      object.path !== undefined &&
      object.path !== null &&
      typeof object.path !== "string" &&
      !Array.isArray(object.path)
    ) {
      delete object.path;
    }
  }

  // Ensure fill is always a valid value — Fabric v7 may call .split() on color strings
  if (object.fill === undefined || object.fill === null) {
    object.fill = isTextType ? "#0f172a" : "#e2e8f0";
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

function sanitizeSceneForLoad(
  scene: Record<string, unknown>,
): Record<string, unknown> {
  const objects = Array.isArray(scene.objects)
    ? (scene.objects as unknown[])
        .map((entry) => sanitizeFabricObjectForLoad(entry))
        .filter((entry): entry is Record<string, unknown> =>
          Boolean(entry && typeof entry === "object"),
        )
    : [];

  const normalizedBackground =
    normalizeHexColor(scene.backgroundColor) ??
    normalizeHexColor(scene.background) ??
    (typeof scene.backgroundColor === "string"
      ? scene.backgroundColor
      : "#ffffff");

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
function partitionSceneObjects(objects: Array<Record<string, unknown>>): {
  nonText: Array<Record<string, unknown>>;
  text: Array<Record<string, unknown>>;
} {
  const nonText: Array<Record<string, unknown>> = [];
  const text: Array<Record<string, unknown>> = [];

  for (const obj of objects) {
    const t = typeof obj.type === "string" ? obj.type : "";
    if (t === "Textbox" || t === "IText" || t === "Text") {
      text.push(obj);
    } else {
      nonText.push(obj);
    }
  }

  return { nonText, text };
}

/**
 * Load a scene into the canvas.
 * Signature blocks are reconstructed from lightweight markers instead of
 * deserializing nested group children from JSON.
 */
async function loadSceneSafely(
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
      elementType === "signature_block" ||
      (typeof fieldId === "string" && fieldId.startsWith("firma_"))
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
      typeof (maybePromise as Promise<unknown>).then === "function"
    ) {
      await (maybePromise as Promise<unknown>);
    }
  } catch (error) {
    console.error(
      "[template-builder] loadFromJSON failed for non-text scene",
      error,
    );
    const maybePromise = runtimeCanvas.loadFromJSON({
      ...nonTextScene,
      objects: [],
    });
    if (
      maybePromise &&
      typeof (maybePromise as Promise<unknown>).then === "function"
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
  >(fabricModule, "Textbox");

  if (TextboxClass) {
    const CONSTRUCTOR_SKIP_KEYS = new Set(["type", "version", "text"]);

    for (const objData of textObjects) {
      try {
        const textContent =
          typeof objData.text === "string" ? objData.text : "";
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
          "[template-builder] Failed to create Textbox from saved data",
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
        "evento-firma",
        fabricModule,
        runtimeCanvas,
      ) as RuntimeFabricObject;

      const patch: Record<string, unknown> = {};
      if (typeof marker.left === "number") patch.left = marker.left;
      if (typeof marker.top === "number") patch.top = marker.top;
      if (typeof marker.scaleX === "number") patch.scaleX = marker.scaleX;
      if (typeof marker.scaleY === "number") patch.scaleY = marker.scaleY;
      if (typeof marker.angle === "number") patch.angle = marker.angle;

      if (
        marker.originX === "left" ||
        marker.originX === "center" ||
        marker.originX === "right"
      ) {
        patch.originX = marker.originX;
      }
      if (
        marker.originY === "top" ||
        marker.originY === "center" ||
        marker.originY === "bottom"
      ) {
        patch.originY = marker.originY;
      }

      patch.elementType = "signature_block";
      patch.category = "evento";
      patch.isDynamic = true;
      patch.fieldId =
        typeof marker.fieldId === "string" && marker.fieldId.length > 0
          ? marker.fieldId
          : "firma_1";
      patch.placeholder = `{{${patch.fieldId as string}}}`;

      if (typeof marker.name === "string" && marker.name.length > 0) {
        patch.name = marker.name;
      }

      if (typeof signatureObject.set === "function") {
        signatureObject.set(patch);
      } else {
        Object.assign(signatureObject, patch);
      }

      signatureObject.setCoords?.();
      runtimeCanvas.add(signatureObject as Record<string, unknown>);
    } catch (error) {
      console.error(
        "[template-builder] Failed to rebuild signature block",
        error,
        marker,
      );
    }
  }

  runtimeCanvas.requestRenderAll();
}

function getFabricExport<T>(
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

interface FabricCanvasProps {
  initialScene?: Record<string, unknown>;
  onSceneChange?: (scene: FabricTemplateScene) => void;
  onReady?: (actions: {
    duplicate: () => void;
    bringToFront: () => void;
    sendToBack: () => void;
    remove: () => void;
  }) => void;
}

function buildSelectedObjectState(
  active: Record<string, unknown>,
): SelectedObjectState {
  const legacyType = active.type;
  const metadata = {
    isDynamic: active.isDynamic as boolean | undefined,
    category: active.category as
      | "plantilla"
      | "evento"
      | "titular"
      | "sistema"
      | undefined,
    elementType: isElementType(active.elementType)
      ? active.elementType
      : isElementType(legacyType)
        ? legacyType
        : undefined,
    fieldId: active.fieldId as string | undefined,
    placeholder: active.placeholder as string | undefined,
  };

  const scaleX = typeof active.scaleX === "number" ? active.scaleX : 1;
  const scaleY = typeof active.scaleY === "number" ? active.scaleY : 1;

  return {
    id: String(active.name ?? active.id ?? crypto.randomUUID()),
    left: Number(active.left ?? 0),
    top: Number(active.top ?? 0),
    width: Number(active.width ?? 0),
    height: Number(active.height ?? 0),
    scaleX,
    scaleY,
    angle: Number(active.angle ?? 0),
    fabricType: typeof active.type === "string" ? active.type : undefined,
    text: typeof active.text === "string" ? active.text : undefined,
    fill:
      normalizeHexColor(active.fill) ??
      (typeof active.fill === "string" ? active.fill : undefined),
    fontSize: typeof active.fontSize === "number" ? active.fontSize : undefined,
    fontFamily:
      typeof active.fontFamily === "string" ? active.fontFamily : undefined,
    fontWeight:
      typeof active.fontWeight === "string" ||
      typeof active.fontWeight === "number"
        ? (active.fontWeight as string | number)
        : undefined,
    fontStyle:
      active.fontStyle === "normal" || active.fontStyle === "italic"
        ? (active.fontStyle as "normal" | "italic")
        : undefined,
    underline:
      typeof active.underline === "boolean" ? active.underline : undefined,
    textAlign:
      active.textAlign === "left" ||
      active.textAlign === "center" ||
      active.textAlign === "right" ||
      active.textAlign === "justify"
        ? (active.textAlign as "left" | "center" | "right" | "justify")
        : undefined,
    stroke: typeof active.stroke === "string" ? active.stroke : undefined,
    strokeWidth:
      typeof active.strokeWidth === "number" ? active.strokeWidth : undefined,
    strokeDashArray: Array.isArray(active.strokeDashArray)
      ? (active.strokeDashArray as number[])
      : null,
    opacity: typeof active.opacity === "number" ? active.opacity : 1,
    locked: Boolean(active.lockMovementX && active.lockMovementY),
    metadata,
  };
}

function serializeScene(
  canvas: RuntimeCanvas,
  pageSettings: TemplatePageSettings,
): FabricTemplateScene {
  const rawScene = canvas.toJSON(FABRIC_METADATA_KEYS);
  const objects = Array.isArray(rawScene.objects)
    ? (rawScene.objects as Array<Record<string, unknown>>)
    : [];

  // Use backgroundColor (Fabric-native key) for round-trip safety.
  const bg =
    typeof rawScene.backgroundColor === "string"
      ? rawScene.backgroundColor
      : typeof rawScene.background === "string"
        ? rawScene.background
        : "#ffffff";

  return {
    version:
      typeof rawScene.version === "string" ? rawScene.version : undefined,
    backgroundColor: bg,
    background: bg,
    page: pageSettings,
    objects,
  };
}

function createObjectByPreset(
  preset: InsertionPreset,
  fabricModule: Record<string, unknown>,
  canvas?: RuntimeCanvas,
): Record<string, unknown> {
  const Textbox = getFabricExport<
    new (
      text: string,
      options: Record<string, unknown>,
    ) => Record<string, unknown>
  >(fabricModule, "Textbox");
  const Rect = getFabricExport<
    new (options: Record<string, unknown>) => Record<string, unknown>
  >(fabricModule, "Rect");
  const Group = getFabricExport<
    new (
      objects: Array<Record<string, unknown>>,
      options: Record<string, unknown>,
    ) => Record<string, unknown>
  >(fabricModule, "Group");
  const Line = getFabricExport<
    new (
      points: number[],
      options: Record<string, unknown>,
    ) => Record<string, unknown>
  >(fabricModule, "Line");

  if (!Textbox || !Rect || !Group || !Line) {
    throw new Error(
      "No se pudieron resolver las clases base de Fabric (Textbox/Rect/Group/Line).",
    );
  }

  // All new objects are placed at canvas center
  const cx = canvas ? canvas.getWidth() / 2 : 560;
  const cy = canvas ? canvas.getHeight() / 2 : 400;
  const centered = { left: cx, top: cy, originX: "center", originY: "center" };

  switch (preset) {
    case "plantilla-titulo":
      return new Textbox("Titulo principal", {
        ...centered,
        width: 620,
        fontSize: 40,
        fontWeight: "bold",
        textAlign: "center",
        fill: "#0f172a",
        isDynamic: false,
        category: "plantilla",
        elementType: "text",
        fieldId: "titulo_principal",
      });
    case "plantilla-subtitulo":
      return new Textbox("Anadir un subtitulo", {
        ...centered,
        width: 560,
        fontSize: 24,
        fill: "#1e293b",
        isDynamic: false,
        category: "plantilla",
        elementType: "text",
        fieldId: "subtitulo",
      });
    case "plantilla-parrafo":
      return new Textbox("Anadir texto normal", {
        ...centered,
        width: 520,
        fontSize: 16,
        fill: "#334155",
        isDynamic: false,
        category: "plantilla",
        elementType: "text",
        fieldId: "texto_normal",
      });
    case "plantilla-texto":
      return new Textbox("Texto fijo de plantilla", {
        ...centered,
        width: 460,
        fontSize: 22,
        fill: "#0f172a",
        isDynamic: false,
        category: "plantilla",
        elementType: "text",
        fieldId: "texto_plantilla",
        placeholder: "{{texto_plantilla}}",
      });
    case "plantilla-forma":
      return new Rect({
        ...centered,
        width: 320,
        height: 84,
        rx: 12,
        ry: 12,
        fill: "#e2e8f0",
        stroke: "#94a3b8",
        strokeWidth: 1,
        isDynamic: false,
        category: "plantilla",
        elementType: "shape",
        fieldId: "forma_plantilla",
      });
    case "evento-texto":
      return new Textbox("{{nombre_evento}}", {
        ...centered,
        width: 520,
        fontSize: 20,
        fill: "#1e293b",
        isDynamic: true,
        category: "evento",
        elementType: "text",
        fieldId: "nombre_evento",
        placeholder: "{{nombre_evento}}",
      });
    case "evento-firma": {
      const componentWidth = 200;
      const centerX = componentWidth / 2;

      // 1. Configuración de alturas y espaciado (Valores de tu versión funcional)
      const boxHeight = 100;
      const lineY = boxHeight / 2 + 10; // Mantenemos tu cálculo de posición de línea
      const nameY = lineY + 10;
      const nameFontSize = 15;
      const roleFontSize = 12;
      const roleY = nameY + nameFontSize + 1;

      const totalHeight = roleY + roleFontSize;
      const offsetY = -(totalHeight / 2);

      // 2. Caja de firma punteada (CORREGIDO: ahora sí centrado)
      const signatureBox = new Rect({
        // Centra el cuadro de 120px respecto a los 200px del grupo
        top: offsetY,
        width: 120,
        height: boxHeight,
        fill: "#f8fafc",
        stroke: "#94a3b8",
        strokeDashArray: [6, 4],
        selectable: false,
        evented: false,
      });

      // 3. Etiqueta, Línea y Textos (Todos usan el ancho total para centrado automático)
      const signatureLabel = new Textbox("Espacio de firma", {
        top: offsetY + boxHeight / 2 - 6,
        width: componentWidth, // Usa los 200px
        fontSize: 10,
        fill: "#94a3b8",
        textAlign: "center",
        fontStyle: "italic",
        selectable: false,
        evented: false,
      });

      const line = new Line([0, 0, componentWidth, 0], {
        left: 0,
        top: offsetY + lineY,
        stroke: "#334155",
        strokeWidth: 1.2,
        selectable: false,
        evented: false,
      });

      const name = new Textbox("{{nombre}}", {
        top: offsetY + nameY,
        width: componentWidth,
        fontSize: nameFontSize,
        fontWeight: "bold",
        fill: "#0f172a",
        textAlign: "center",
      });

      const role = new Textbox("{{cargo}}", {
        top: offsetY + roleY,
        width: componentWidth,
        fontSize: roleFontSize,
        fill: "#64748b",
        textAlign: "center",
      });

      return new Group([signatureBox, signatureLabel, line, name, role], {
        ...centered,
        isDynamic: true,
        category: "evento",
        elementType: "signature_block",
        fieldId: "firma_1",
        placeholder: "{{firma_1}}",
        originX: "center",
        originY: "center",
      });
    }
    case "titular-texto":
      return new Textbox("{{nombre_completo}}", {
        ...centered,
        width: 520,
        fontSize: 24,
        fill: "#0f172a",
        isDynamic: true,
        category: "titular",
        elementType: "text",
        fieldId: "nombre_completo",
        placeholder: "{{nombre_completo}}",
      });
    case "titular-imagen":
      return new Rect({
        ...centered,
        width: 180,
        height: 220,
        fill: "#f8fafc",
        stroke: "#64748b",
        strokeDashArray: [8, 6],
        isDynamic: true,
        category: "titular",
        elementType: "image",
        fieldId: "foto_perfil",
        placeholder: "{{foto_perfil}}",
      });
    case "sistema-qr":
      return new Rect({
        ...centered,
        width: 120,
        height: 120,
        fill: "#e2e8f0",
        stroke: "#0f172a",
        strokeWidth: 1,
        isDynamic: true,
        category: "sistema",
        elementType: "qr",
        fieldId: "qr_web3",
        placeholder: "{{qr_web3}}",
      });
    case "sistema-folio":
      return new Textbox("{{folio}}", {
        ...centered,
        width: 420,
        fontSize: 16,
        fill: "#0f172a",
        isDynamic: true,
        category: "sistema",
        elementType: "text",
        fieldId: "folio",
        placeholder: "{{folio}}",
      });
    default:
      return new Textbox("Elemento", { ...centered });
  }
}

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
  payload.set("image", file);

  const response = await fetch(`/api/proxy/templates/${templateId}/images`, {
    method: "POST",
    body: payload,
  });

  if (!response.ok) {
    let message = "Error uploading image";
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

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (typeof window === "undefined") {
    return url;
  }

  return new URL(url, window.location.origin).toString();
}

function toSameOriginApiPath(url: string): string {
  if (url.startsWith("/api/")) {
    return url;
  }

  try {
    const parsed = new URL(
      url,
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost",
    );
    if (parsed.pathname.startsWith("/api/")) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Keep original URL when parsing fails.
  }

  return url;
}

async function createFabricImageFromUrl(
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

function createObjectFromAttribute(
  attribute: TemplateAttribute,
  fabricModule: Record<string, unknown>,
): Record<string, unknown> {
  const Textbox = getFabricExport<
    new (
      text: string,
      options: Record<string, unknown>,
    ) => Record<string, unknown>
  >(fabricModule, "Textbox");
  const Rect = getFabricExport<
    new (options: Record<string, unknown>) => Record<string, unknown>
  >(fabricModule, "Rect");

  if (!Textbox || !Rect) {
    throw new Error(
      "No se pudieron resolver Textbox/Rect en Fabric para insertar atributo.",
    );
  }

  const placeholder = `{{${attribute.key}}}`;
  const commonMetadata = {
    isDynamic: true,
    category: attribute.category,
    elementType: (attribute.dataType === "date"
      ? "text"
      : attribute.dataType) as "text" | "image" | "qr",
    fieldId: attribute.key,
    placeholder,
    name: attribute.key,
  };

  if (attribute.dataType === "image") {
    return new Rect({
      left: 120,
      top: 110,
      width: 180,
      height: 220,
      fill: "#f8fafc",
      stroke: "#64748b",
      strokeDashArray: [8, 6],
      ...commonMetadata,
    });
  }

  if (attribute.dataType === "qr") {
    return new Rect({
      left: 120,
      top: 110,
      width: 120,
      height: 120,
      fill: "#e2e8f0",
      stroke: "#0f172a",
      strokeWidth: 1,
      ...commonMetadata,
    });
  }

  return new Textbox(placeholder, {
    left: 120,
    top: 110,
    width: 520,
    fontSize: attribute.dataType === "date" ? 18 : 22,
    fill: "#0f172a",
    ...commonMetadata,
  });
}

function normalizeClipboardText(input: unknown): string {
  if (typeof input === "string") {
    return input.replace(/\r\n/g, "\n").trim();
  }

  if (input == null) {
    return "";
  }

  return String(input).replace(/\r\n/g, "\n").trim();
}

function createPlainTextFromClipboard(input: unknown): string {
  const normalized = normalizeClipboardText(input);
  if (normalized.length > 0) {
    return normalized;
  }

  throw new Error("No hay texto en el portapapeles.");
}

async function insertUploadedImageIntoCanvas(params: {
  runtimeCanvas: RuntimeCanvas;
  fabricModule: Record<string, unknown>;
  uploaded: UploadedTemplateImage;
}): Promise<void> {
  const imageFactory =
    getFabricExport<RuntimeImageFactory>(params.fabricModule, "FabricImage") ??
    getFabricExport<RuntimeImageFactory>(params.fabricModule, "Image");
  if (!imageFactory || typeof imageFactory.fromURL !== "function") {
    throw new Error(
      "No se pudo inicializar FabricImage para insertar la imagen.",
    );
  }

  const sameOriginPath = toSameOriginApiPath(params.uploaded.publicUrl);
  const imageUrl = toAbsoluteUrl(sameOriginPath);

  const imageObject = await createFabricImageFromUrl(imageFactory, imageUrl, {
    left: params.runtimeCanvas.getWidth() / 2,
    top: params.runtimeCanvas.getHeight() / 2,
    originX: "center",
    originY: "center",
  });

  if (!imageObject) {
    throw new Error(
      `No se pudo crear la imagen en el canvas para URL: ${params.uploaded.publicUrl} (normalizada: ${sameOriginPath})`,
    );
  }

  const runtimeImage = imageObject as RuntimeFabricObject;
  if (typeof runtimeImage.set === "function") {
    runtimeImage.set({
      category: "plantilla",
      elementType: "image",
      isDynamic: false,
      fieldId: `imagen_${params.uploaded.assetId}`,
      name: `imagen_${params.uploaded.assetId}`,
      assetId: params.uploaded.assetId,
      metadata: {
        category: "plantilla",
        type: "image",
        isDynamic: false,
        assetId: params.uploaded.assetId,
      },
    });
  }

  const width = Number((runtimeImage.width as number | undefined) ?? 0);
  const height = Number((runtimeImage.height as number | undefined) ?? 0);
  if (width > 0 && height > 0 && typeof runtimeImage.set === "function") {
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

function insertPlainTextIntoCanvas(params: {
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
  >(params.fabricModule, "Textbox");

  if (!Textbox) {
    throw new Error("No se pudo inicializar Textbox para pegar texto.");
  }

  const safeText = createPlainTextFromClipboard(params.text);

  const object = new Textbox(safeText, {
    left: params.left ?? params.runtimeCanvas.getWidth() / 2,
    top: params.top ?? params.runtimeCanvas.getHeight() / 2,
    width: 520,
    fontSize: 22,
    fill: "#0f172a",
    category: "plantilla",
    elementType: "text",
    isDynamic: false,
    fieldId: "texto_pegado",
    name: `texto_pegado_${Date.now()}`,
    originX: "center",
    originY: "center",
  });

  params.runtimeCanvas.add(object);
  params.runtimeCanvas.setActiveObject(object);
  params.runtimeCanvas.requestRenderAll();
}

export function FabricCanvas({
  initialScene,
  onSceneChange,
  onReady,
}: FabricCanvasProps) {
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeCanvasRef = useRef<RuntimeCanvas | null>(null);
  const fabricModuleRef = useRef<Record<string, unknown> | null>(null);
  const pageSettingsRef = useRef<TemplatePageSettings>(
    DEFAULT_TEMPLATE_PAGE_SETTINGS,
  );
  const isSpacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const onSceneChangeRef =
    useRef<FabricCanvasProps["onSceneChange"]>(undefined);
  const onReadyRef = useRef<FabricCanvasProps["onReady"]>(undefined);
  const lastEditingTextboxRef = useRef<Record<string, unknown> | null>(null);
  const contextClipboardRef = useRef<Record<string, unknown> | null>(null);

  const pendingInsertion = useTemplateBuilderStore(
    (state) => state.pendingInsertion,
  );
  const pendingAttributeId = useTemplateBuilderStore(
    (state) => state.pendingAttributeId,
  );
  const attributes = useTemplateBuilderStore((state) => state.attributes);
  const consumeInsertion = useTemplateBuilderStore(
    (state) => state.consumeInsertion,
  );
  const consumeAttributeInsertion = useTemplateBuilderStore(
    (state) => state.consumeAttributeInsertion,
  );
  const pendingCanvasCommand = useTemplateBuilderStore(
    (state) => state.pendingCanvasCommand,
  );
  const templateId = useTemplateBuilderStore((state) => state.templateId);
  const consumeCanvasCommand = useTemplateBuilderStore(
    (state) => state.consumeCanvasCommand,
  );
  const markAttributeInUse = useTemplateBuilderStore(
    (state) => state.markAttributeInUse,
  );
  const pushHistory = useTemplateBuilderStore((state) => state.pushHistory);
  const initCanvas = useTemplateBuilderStore((state) => state.initCanvas);
  const setActiveObjects = useTemplateBuilderStore(
    (state) => state.setActiveObjects,
  );
  const setZoom = useTemplateBuilderStore((state) => state.setZoom);
  const setPan = useTemplateBuilderStore((state) => state.setPan);
  const setSelectedObject = useTemplateBuilderStore(
    (state) => state.setSelectedObject,
  );
  const mode = useTemplateBuilderStore((state) => state.mode);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    canvasLeft: number;
    canvasTop: number;
    hasSelection: boolean;
    isLocked: boolean;
  } | null>(null);
  const [contextAlignOpen, setContextAlignOpen] = useState(false);

  const hydratedScene = useMemo(() => {
    if (
      initialScene &&
      Array.isArray((initialScene as { objects?: unknown[] }).objects)
    ) {
      const nextPage = resolvePageSettings(
        DEFAULT_TEMPLATE_PAGE_SETTINGS,
        (initialScene as { page?: Partial<TemplatePageSettings> }).page ?? {},
      );
      return {
        ...initialScene,
        page: nextPage,
      };
    }

    return DEFAULT_FABRIC_SCENE;
  }, [initialScene]);

  const sanitizedHydratedScene = useMemo(
    () => sanitizeSceneForLoad(hydratedScene as Record<string, unknown>),
    [hydratedScene],
  );

  useEffect(() => {
    onSceneChangeRef.current = onSceneChange;
  }, [onSceneChange]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let isActive = true;

    async function mountCanvas() {
      const element = canvasElementRef.current;
      if (!element) {
        return;
      }

      const fabricModule = (await import("fabric")) as unknown as Record<
        string,
        unknown
      >;
      const CanvasClass = getFabricExport<
        new (
          element: HTMLCanvasElement,
          options: Record<string, unknown>,
        ) => RuntimeCanvas
      >(fabricModule, "Canvas");

      if (!CanvasClass) {
        throw new Error("No se pudo resolver Canvas de Fabric en runtime.");
      }

      if (!isActive) {
        return;
      }

      const runtimeCanvas = new CanvasClass(element, {
        width:
          (sanitizedHydratedScene.page as TemplatePageSettings | undefined)
            ?.width ?? 1123,
        height:
          (sanitizedHydratedScene.page as TemplatePageSettings | undefined)
            ?.height ?? 794,
        backgroundColor: "#ffffff",
        preserveObjectStacking: true,
      });

      pageSettingsRef.current = resolvePageSettings(
        DEFAULT_TEMPLATE_PAGE_SETTINGS,
        (sanitizedHydratedScene.page as
          | Partial<TemplatePageSettings>
          | undefined) ?? {},
      );

      fabricModuleRef.current = fabricModule;
      runtimeCanvasRef.current = runtimeCanvas;
      initCanvas(
        runtimeCanvas as unknown as {
          loadFromJSON: (
            json: Record<string, unknown>,
            callback?: () => void,
          ) => void;
          requestRenderAll: () => void;
        },
      );

      const syncSelection = () => {
        const activeObjects =
          typeof runtimeCanvas.getActiveObjects === "function"
            ? runtimeCanvas.getActiveObjects()
            : [];
        setActiveObjects(activeObjects);
        const active = runtimeCanvas.getActiveObject();
        setSelectedObject(active ? buildSelectedObjectState(active) : null);
      };

      // Guard flag — suppress syncScene during loadFromJSON to avoid
      // pushing incomplete scenes to history as objects are added one by one.
      let isHydrating = true;

      const syncScene = () => {
        if (isHydrating) return;
        const scene = serializeScene(runtimeCanvas, pageSettingsRef.current);
        pushHistory(scene);
        onSceneChangeRef.current?.(scene);
      };

      // Pre-load fonts — wrapped in try/catch to never block scene loading
      try {
        await preloadSceneFonts(sanitizedHydratedScene);
      } catch (fontError) {
        console.warn(
          "[template-builder] Font pre-loading failed, continuing without it.",
          fontError,
        );
      }

      console.log(
        "[template-builder] Loading scene with",
        (sanitizedHydratedScene.objects as unknown[])?.length ?? 0,
        "objects",
      );
      console.log(
        "[template-builder] Object types:",
        (sanitizedHydratedScene.objects as Array<Record<string, unknown>>)?.map(
          (o) => o.type,
        ),
      );

      try {
        await loadSceneSafely(
          runtimeCanvas,
          sanitizedHydratedScene,
          fabricModule,
        );
        console.log(
          "[template-builder] Scene loaded, canvas has",
          runtimeCanvas.getObjects().length,
          "objects",
        );
      } catch (error) {
        console.error(
          "[template-builder] loadSceneSafely failed completely.",
          error,
        );
      }

      isHydrating = false;
      runtimeCanvas.requestRenderAll();

      // Push the fully-loaded scene as the initial history entry.
      const initialSerializedScene = serializeScene(
        runtimeCanvas,
        pageSettingsRef.current,
      );
      pushHistory(initialSerializedScene);
      onSceneChangeRef.current?.(initialSerializedScene);

      // ── Smart Snapping (guías magnéticas) ──
      const SNAP_THRESHOLD = 5;
      const GUIDE_COLOR = "#06b6d4";
      const guideLines: Array<Record<string, unknown>> = [];

      const LineClass = getFabricExport<
        new (
          points: number[],
          options: Record<string, unknown>,
        ) => Record<string, unknown>
      >(fabricModule, "Line");

      const clearGuides = () => {
        for (const line of guideLines) {
          runtimeCanvas.remove(line);
        }
        guideLines.length = 0;
      };

      const addGuide = (x1: number, y1: number, x2: number, y2: number) => {
        if (!LineClass) return;
        const line = new LineClass([x1, y1, x2, y2], {
          stroke: GUIDE_COLOR,
          strokeWidth: 1,
          selectable: false,
          evented: false,
          strokeDashArray: [4, 4],
          excludeFromExport: true,
        });
        guideLines.push(line);
        runtimeCanvas.add(line);
      };

      const onObjectMoving = () => {
        clearGuides();
        const active =
          runtimeCanvas.getActiveObject() as RuntimeFabricObject | null;
        if (!active) return;

        const aLeft = Number(active.left ?? 0);
        const aTop = Number(active.top ?? 0);
        const aWidth = Number(active.getScaledWidth?.() ?? active.width ?? 0);
        const aHeight = Number(
          active.getScaledHeight?.() ?? active.height ?? 0,
        );
        const aCenterX = aLeft + aWidth / 2;
        const aCenterY = aTop + aHeight / 2;
        const aRight = aLeft + aWidth;
        const aBottom = aTop + aHeight;

        const canvasW = runtimeCanvas.getWidth();
        const canvasH = runtimeCanvas.getHeight();
        const canvasCX = canvasW / 2;
        const canvasCY = canvasH / 2;

        // Snap to canvas center
        if (Math.abs(aCenterX - canvasCX) < SNAP_THRESHOLD) {
          if (typeof active.set === "function")
            active.set({ left: canvasCX - aWidth / 2 });
          addGuide(canvasCX, 0, canvasCX, canvasH);
        }
        if (Math.abs(aCenterY - canvasCY) < SNAP_THRESHOLD) {
          if (typeof active.set === "function")
            active.set({ top: canvasCY - aHeight / 2 });
          addGuide(0, canvasCY, canvasW, canvasCY);
        }

        // Snap to other objects
        const objects = runtimeCanvas.getObjects();
        for (const obj of objects) {
          if (obj === active || guideLines.includes(obj)) continue;
          const o = obj as RuntimeFabricObject;
          const oLeft = Number(o.left ?? 0);
          const oTop = Number(o.top ?? 0);
          const oWidth = Number(o.getScaledWidth?.() ?? o.width ?? 0);
          const oHeight = Number(o.getScaledHeight?.() ?? o.height ?? 0);
          const oCenterX = oLeft + oWidth / 2;
          const oCenterY = oTop + oHeight / 2;
          const oRight = oLeft + oWidth;
          const oBottom = oTop + oHeight;

          // Horizontal snaps (left, center, right of active to left, center, right of other)
          const hSnaps: Array<[number, number]> = [
            [aLeft, oLeft],
            [aLeft, oCenterX],
            [aLeft, oRight],
            [aCenterX, oLeft],
            [aCenterX, oCenterX],
            [aCenterX, oRight],
            [aRight, oLeft],
            [aRight, oCenterX],
            [aRight, oRight],
          ];
          for (const [aPoint, oPoint] of hSnaps) {
            if (Math.abs(aPoint - oPoint) < SNAP_THRESHOLD) {
              const offset = aPoint - aLeft;
              if (typeof active.set === "function")
                active.set({ left: oPoint - offset });
              addGuide(oPoint, 0, oPoint, canvasH);
              break;
            }
          }

          // Vertical snaps
          const vSnaps: Array<[number, number]> = [
            [aTop, oTop],
            [aTop, oCenterY],
            [aTop, oBottom],
            [aCenterY, oTop],
            [aCenterY, oCenterY],
            [aCenterY, oBottom],
            [aBottom, oTop],
            [aBottom, oCenterY],
            [aBottom, oBottom],
          ];
          for (const [aPoint, oPoint] of vSnaps) {
            if (Math.abs(aPoint - oPoint) < SNAP_THRESHOLD) {
              const offset = aPoint - aTop;
              if (typeof active.set === "function")
                active.set({ top: oPoint - offset });
              addGuide(0, oPoint, canvasW, oPoint);
              break;
            }
          }
        }

        runtimeCanvas.requestRenderAll();
      };

      const onObjectModifiedOrMouseUp = () => {
        clearGuides();
        runtimeCanvas.requestRenderAll();
      };

      runtimeCanvas.on("object:moving", onObjectMoving);
      runtimeCanvas.on("object:scaling", onObjectMoving);
      runtimeCanvas.on("mouse:up", onObjectModifiedOrMouseUp);

      runtimeCanvas.on("text:editing:entered", (...args: unknown[]) => {
        const e = args[0] as Record<string, unknown> | undefined;
        const target = e?.target as Record<string, unknown> | undefined;
        if (target) lastEditingTextboxRef.current = target;
      });
      runtimeCanvas.on("selection:cleared", () => {
        lastEditingTextboxRef.current = null;
      });

      runtimeCanvas.on("selection:created", syncSelection);
      runtimeCanvas.on("selection:updated", syncSelection);
      runtimeCanvas.on("selection:cleared", syncSelection);
      runtimeCanvas.on("object:modified", syncScene);
      runtimeCanvas.on("object:added", syncScene);
      runtimeCanvas.on("object:removed", syncScene);

      onReadyRef.current?.({
        duplicate: () => {
          const active = runtimeCanvas.getActiveObject();
          if (!active) {
            return;
          }

          const source = active as RuntimeFabricObject;
          const clone = source.clone;
          if (typeof clone !== "function") {
            return;
          }

          const placeDuplicate = (duplicated: Record<string, unknown>) => {
            const duplicateObject = duplicated as RuntimeFabricObject;
            const nextLeft =
              Number((duplicateObject.left as number | undefined) ?? 0) + 18;
            const nextTop =
              Number((duplicateObject.top as number | undefined) ?? 0) + 18;

            if (typeof duplicateObject.set === "function") {
              duplicateObject.set({ left: nextLeft, top: nextTop });
            } else {
              duplicateObject.left = nextLeft;
              duplicateObject.top = nextTop;
            }

            duplicateObject.setCoords?.();
            runtimeCanvas.add(duplicateObject);
            runtimeCanvas.setActiveObject(duplicateObject);
            runtimeCanvas.requestRenderAll();
          };

          const maybePromise =
            (clone as RuntimeFabricObject["clone"])!.length === 0
              ? (clone as () => Promise<Record<string, unknown>>)()
              : undefined;

          if (maybePromise) {
            maybePromise.then(placeDuplicate).catch(() => {
              // Ignore clone errors to avoid breaking toolbar actions.
            });
            return;
          }

          (clone as (callback: FabricCloneCallback) => void)(placeDuplicate);
        },
        bringToFront: () => {
          const active = runtimeCanvas.getActiveObject();
          if (!active) {
            return;
          }

          if (
            typeof (active as { bringToFront?: () => void }).bringToFront ===
            "function"
          ) {
            (active as { bringToFront: () => void }).bringToFront();
            runtimeCanvas.requestRenderAll();
          }
        },
        sendToBack: () => {
          const active = runtimeCanvas.getActiveObject();
          if (!active) {
            return;
          }

          if (
            typeof (active as { sendToBack?: () => void }).sendToBack ===
            "function"
          ) {
            (active as { sendToBack: () => void }).sendToBack();
            runtimeCanvas.requestRenderAll();
          }
        },
        remove: () => {
          const active = runtimeCanvas.getActiveObject();
          if (!active) {
            return;
          }

          runtimeCanvas.remove(active);
          runtimeCanvas.requestRenderAll();
          setSelectedObject(null);
        },
      });
    }

    void mountCanvas().catch((error) => {
      console.error("[template-builder] mountCanvas failed.", error);
    });

    return () => {
      isActive = false;
      const runtimeCanvas = runtimeCanvasRef.current;
      if (runtimeCanvas) {
        runtimeCanvas.dispose();
      }
      initCanvas(null);
      setActiveObjects([]);
      runtimeCanvasRef.current = null;
      fabricModuleRef.current = null;
    };
  }, [
    initCanvas,
    pushHistory,
    sanitizedHydratedScene,
    setActiveObjects,
    setSelectedObject,
  ]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    const runtimeCanvas = runtimeCanvasRef.current as
      | (RuntimeCanvas & {
          getZoom?: () => number;
          zoomToPoint?: (point: { x: number; y: number }, zoom: number) => void;
        })
      | null;

    if (!workspace || !runtimeCanvas) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      if (
        !event.ctrlKey ||
        typeof runtimeCanvas.getZoom !== "function" ||
        typeof runtimeCanvas.zoomToPoint !== "function"
      ) {
        return;
      }

      event.preventDefault();
      const currentZoom = runtimeCanvas.getZoom();
      const nextZoom = Math.min(
        Math.max(currentZoom * (event.deltaY > 0 ? 0.95 : 1.05), 0.25),
        4,
      );
      runtimeCanvas.zoomToPoint(
        { x: event.offsetX, y: event.offsetY },
        nextZoom,
      );
      runtimeCanvas.requestRenderAll();
      setZoom(nextZoom);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        isSpacePressedRef.current = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        isSpacePressedRef.current = false;
        isPanningRef.current = false;
      }
    };

    const onMouseDown = (event: MouseEvent) => {
      if (!isSpacePressedRef.current) {
        return;
      }
      isPanningRef.current = true;
      panStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        scrollLeft: workspace.scrollLeft,
        scrollTop: workspace.scrollTop,
      };
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isPanningRef.current || !panStartRef.current) {
        return;
      }

      event.preventDefault();
      const dx = event.clientX - panStartRef.current.x;
      const dy = event.clientY - panStartRef.current.y;
      workspace.scrollLeft = panStartRef.current.scrollLeft - dx;
      workspace.scrollTop = panStartRef.current.scrollTop - dy;
      setPan({ x: workspace.scrollLeft, y: workspace.scrollTop });
    };

    const onMouseUp = () => {
      isPanningRef.current = false;
      panStartRef.current = null;
    };

    workspace.addEventListener("wheel", onWheel, { passive: false });
    workspace.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      workspace.removeEventListener("wheel", onWheel);
      workspace.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [setPan, setZoom]);

  useEffect(() => {
    const notifyUploadStatus = (detail: {
      status: "uploading" | "success" | "error";
      source: "paste" | "drop" | "sidebar";
      message?: string;
    }) => {
      window.dispatchEvent(
        new CustomEvent("template-builder:image-upload-status", {
          detail,
        }),
      );
    };

    const processImageFile = async (
      file: File,
      source: "paste" | "drop" | "sidebar",
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
            status: "error",
            source,
            message: "No se puede subir imagen sin templateId activo.",
          });
          return;
        }

        notifyUploadStatus({
          status: "uploading",
          source,
          message: "Subiendo imagen...",
        });

        const uploaded = await uploadTemplateImage(templateId, file);
        await insertUploadedImageIntoCanvas({
          runtimeCanvas,
          fabricModule,
          uploaded,
        });

        notifyUploadStatus({
          status: "success",
          source,
          message: "Imagen agregada al canvas.",
        });
      } catch (error) {
        console.error(
          `[template-builder] Failed to handle ${source} image`,
          error,
        );
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo procesar la imagen.";
        notifyUploadStatus({
          status: "error",
          source,
          message,
        });
      }
    };

    const onPaste = async (event: ClipboardEvent) => {
      const imageItem = event.clipboardData
        ? Array.from(event.clipboardData.items).find((entry) =>
            entry.type.startsWith("image/"),
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
      await processImageFile(file, "paste");
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
            entry.type.startsWith("image/"),
          )
        : undefined;

      if (!imageFile) {
        return;
      }

      event.preventDefault();
      await processImageFile(imageFile, "drop");
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

      const hasImageFile = event.dataTransfer?.types?.includes("Files");
      if (!hasImageFile) {
        return;
      }

      event.preventDefault();
      event.dataTransfer!.dropEffect = "copy";
    };

    const onSidebarUpload = async (event: Event) => {
      const customEvent = event as CustomEvent<TemplateImageUploadEventDetail>;
      const file = customEvent.detail?.file;
      if (!file || !file.type.startsWith("image/")) {
        return;
      }

      await processImageFile(file, "sidebar");
    };

    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("template-builder:image-upload", onSidebarUpload);

    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener(
        "template-builder:image-upload",
        onSidebarUpload,
      );
    };
  }, [templateId]);

  useEffect(() => {
    const runtimeCanvas = runtimeCanvasRef.current;
    if (!runtimeCanvas) {
      return;
    }

    const editable = mode === "edit";
    const objectList = runtimeCanvas.getObjects();

    for (const entry of objectList) {
      const objectEntry = entry as RuntimeFabricObject;
      const isLocked = Boolean(
        objectEntry.lockMovementX && objectEntry.lockMovementY,
      );
      objectEntry.selectable = editable && !isLocked;
      objectEntry.evented = editable && !isLocked;
    }

    if (!editable) {
      runtimeCanvas.discardActiveObject();
      setSelectedObject(null);
    }

    runtimeCanvas.requestRenderAll();
  }, [mode, setSelectedObject]);

  useEffect(() => {
    if (!pendingCanvasCommand) {
      return;
    }

    const runtimeCanvas = runtimeCanvasRef.current;
    if (!runtimeCanvas) {
      consumeCanvasCommand();
      return;
    }

    const command = pendingCanvasCommand;
    const updateScene = () => {
      const scene = serializeScene(runtimeCanvas, pageSettingsRef.current);
      pushHistory(scene);
      onSceneChangeRef.current?.(scene);
      const active = runtimeCanvas.getActiveObject();
      setSelectedObject(active ? buildSelectedObjectState(active) : null);
    };

    if (command.type === "set-page") {
      const nextPageSettings = resolvePageSettings(
        pageSettingsRef.current,
        command.value,
      );
      pageSettingsRef.current = nextPageSettings;
      runtimeCanvas.setDimensions({
        width: nextPageSettings.width,
        height: nextPageSettings.height,
      });
      runtimeCanvas.requestRenderAll();
      updateScene();
      consumeCanvasCommand();
      return;
    }

    if (command.type === "set-background-image") {
      const bgUrl = command.value.url;
      const extCanvas = runtimeCanvas as RuntimeCanvas & {
        setBackgroundImage?: (
          image: Record<string, unknown> | string | null,
          callback: () => void,
          options?: Record<string, unknown>,
        ) => void;
        backgroundImage?: unknown;
      };

      if (!bgUrl) {
        // Clear background image
        if (typeof extCanvas.setBackgroundImage === "function") {
          extCanvas.setBackgroundImage(null as unknown as string, () => {
            runtimeCanvas.requestRenderAll();
            updateScene();
          });
        } else {
          extCanvas.backgroundImage = undefined;
          runtimeCanvas.requestRenderAll();
          updateScene();
        }
        consumeCanvasCommand();
        return;
      }

      const imageFactory =
        getFabricExport<RuntimeImageFactory>(
          fabricModuleRef.current ?? {},
          "FabricImage",
        ) ??
        getFabricExport<RuntimeImageFactory>(
          fabricModuleRef.current ?? {},
          "Image",
        );

      if (imageFactory && typeof imageFactory.fromURL === "function") {
        createFabricImageFromUrl(imageFactory, bgUrl, {})
          .then((bgImage) => {
            if (!bgImage) {
              consumeCanvasCommand();
              return;
            }

            const canvasW = runtimeCanvas.getWidth();
            const canvasH = runtimeCanvas.getHeight();
            const imgW = Number(
              (bgImage as Record<string, unknown>).width ?? 1,
            );
            const imgH = Number(
              (bgImage as Record<string, unknown>).height ?? 1,
            );
            const scale = Math.max(canvasW / imgW, canvasH / imgH);

            if (typeof (bgImage as RuntimeFabricObject).set === "function") {
              (bgImage as RuntimeFabricObject).set!({
                scaleX: scale,
                scaleY: scale,
              });
            }

            if (typeof extCanvas.setBackgroundImage === "function") {
              extCanvas.setBackgroundImage(bgImage, () => {
                runtimeCanvas.requestRenderAll();
                updateScene();
              });
            } else {
              extCanvas.backgroundImage = bgImage;
              runtimeCanvas.requestRenderAll();
              updateScene();
            }
          })
          .catch(() => {
            // Silently fail on background image load error
          });
      }

      consumeCanvasCommand();
      return;
    }

    const active =
      runtimeCanvas.getActiveObject() as RuntimeFabricObject | null;
    if (!active) {
      consumeCanvasCommand();
      return;
    }

    if (command.type === "align") {
      alignObject(active, runtimeCanvas, command.value);
    }

    if (command.type === "z-order") {
      if (command.value === "front") {
        active.bringToFront?.();
      }
      if (command.value === "back") {
        active.sendToBack?.();
      }
      if (command.value === "forward") {
        active.bringForward?.();
      }
      if (command.value === "backward") {
        active.sendBackwards?.();
      }
    }

    if (command.type === "toggle-lock") {
      toggleObjectLock(active);
    }

    if (command.type === "apply-text-style") {
      applyTextStyle(active, command.value);
    }

    if (command.type === "set-geometry") {
      const geo = command.value;
      const changes: Record<string, unknown> = {};
      if (geo.left !== undefined) changes.left = geo.left;
      if (geo.top !== undefined) changes.top = geo.top;
      if (geo.width !== undefined) {
        const baseWidth = Number(
          active.width ?? (active as Record<string, unknown>).width ?? 1,
        );
        if (baseWidth > 0) {
          changes.scaleX = geo.width / baseWidth;
        }
      }
      if (geo.height !== undefined) {
        const baseHeight = Number(
          active.height ?? (active as Record<string, unknown>).height ?? 1,
        );
        if (baseHeight > 0) {
          changes.scaleY = geo.height / baseHeight;
        }
      }
      if (typeof active.set === "function") {
        active.set(changes);
      }
      active.setCoords?.();
    }

    if (command.type === "set-appearance") {
      const appearance = command.value;
      const changes: Record<string, unknown> = {};
      if (appearance.stroke !== undefined) changes.stroke = appearance.stroke;
      if (appearance.strokeWidth !== undefined)
        changes.strokeWidth = appearance.strokeWidth;
      if (appearance.strokeDashArray !== undefined)
        changes.strokeDashArray = appearance.strokeDashArray;
      if (appearance.opacity !== undefined)
        changes.opacity = appearance.opacity;
      if (appearance.fill !== undefined) changes.fill = appearance.fill;
      if (typeof active.set === "function") {
        active.set(changes);
      }
      active.setCoords?.();
    }

    if (command.type === "set-metadata") {
      const meta = command.value;
      const changes: Record<string, unknown> = {};
      if (meta.fieldId !== undefined) {
        changes.fieldId = meta.fieldId;
        changes.name = meta.fieldId;
        changes.placeholder = `{{${meta.fieldId}}}`;
      }
      if (typeof active.set === "function") {
        active.set(changes);
      }
    }

    runtimeCanvas.requestRenderAll();
    updateScene();
    consumeCanvasCommand();
  }, [
    consumeCanvasCommand,
    pendingCanvasCommand,
    pushHistory,
    setSelectedObject,
  ]);

  useEffect(() => {
    if (!pendingInsertion) {
      return;
    }

    const runtimeCanvas = runtimeCanvasRef.current;
    const fabricModule = fabricModuleRef.current;

    if (!runtimeCanvas || !fabricModule) {
      consumeInsertion();
      return;
    }

    const obj = createObjectByPreset(
      pendingInsertion,
      fabricModule,
      runtimeCanvas,
    );
    runtimeCanvas.add(obj);
    runtimeCanvas.setActiveObject(obj);
    runtimeCanvas.requestRenderAll();
    consumeInsertion();
  }, [consumeInsertion, pendingInsertion]);

  useEffect(() => {
    if (!pendingAttributeId) {
      return;
    }

    const runtimeCanvas = runtimeCanvasRef.current;
    const fabricModule = fabricModuleRef.current;
    const attribute = attributes.find(
      (entry) => entry.id === pendingAttributeId,
    );

    if (!runtimeCanvas || !attribute) {
      consumeAttributeInsertion();
      return;
    }

    // If a Textbox was being edited, insert the placeholder into it
    const editingTextbox = lastEditingTextboxRef.current;
    if (
      editingTextbox &&
      typeof (editingTextbox as { insertChars?: unknown }).insertChars ===
        "function"
    ) {
      const placeholder = `{{${attribute.key}}}`;
      (editingTextbox as { insertChars: (text: string) => void }).insertChars(
        placeholder,
      );
      runtimeCanvas.requestRenderAll();
      markAttributeInUse(attribute.id);
      consumeAttributeInsertion();
      return;
    }

    // No active text editing — create a new element
    if (!fabricModule) {
      consumeAttributeInsertion();
      return;
    }

    const obj = createObjectFromAttribute(attribute, fabricModule);
    runtimeCanvas.add(obj);
    runtimeCanvas.setActiveObject(obj);
    runtimeCanvas.requestRenderAll();
    markAttributeInUse(attribute.id);
    consumeAttributeInsertion();
  }, [
    attributes,
    consumeAttributeInsertion,
    markAttributeInUse,
    pendingAttributeId,
  ]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const close = () => setContextMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("click", close);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [contextMenu]);

  const onWorkspaceContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== "edit") {
      return;
    }

    const workspace = workspaceRef.current;
    if (!workspace) {
      return;
    }

    event.preventDefault();

    const workspaceRect = workspace.getBoundingClientRect();
    const canvasRect = canvasElementRef.current?.getBoundingClientRect();

    const x = Math.max(8, event.clientX - workspaceRect.left);
    const y = Math.max(8, event.clientY - workspaceRect.top);
    const canvasLeft = canvasRect
      ? Math.max(event.clientX - canvasRect.left, 0)
      : 0;
    const canvasTop = canvasRect
      ? Math.max(event.clientY - canvasRect.top, 0)
      : 0;

    const activeObj = runtimeCanvasRef.current?.getActiveObject() as
      | Record<string, unknown>
      | null
      | undefined;
    const hasSelection = Boolean(activeObj);
    const isLocked = Boolean(
      activeObj?.lockMovementX && activeObj?.lockMovementY,
    );

    setContextAlignOpen(false);
    setContextMenu({ x, y, canvasLeft, canvasTop, hasSelection, isLocked });
  };

  const onPasteImageFromContextMenu = async () => {
    const menuState = contextMenu;
    setContextMenu(null);

    try {
      if (!navigator.clipboard?.read) {
        throw new Error(
          "Tu navegador no permite leer imagenes del portapapeles en este contexto.",
        );
      }

      const items = await navigator.clipboard.read();
      const imageItem = items.find((item) =>
        item.types.some((type) => type.startsWith("image/")),
      );

      if (!imageItem) {
        throw new Error("No hay una imagen en el portapapeles.");
      }

      const mimeType =
        imageItem.types.find((type) => type.startsWith("image/")) ??
        "image/png";
      const blob = await imageItem.getType(mimeType);
      const extension = mimeType.split("/")[1] ?? "png";
      const file = new File([blob], `clipboard-${Date.now()}.${extension}`, {
        type: mimeType,
      });

      if (menuState && workspaceRef.current && canvasElementRef.current) {
        // Preserve location intent for future use if needed.
      }

      window.dispatchEvent(
        new CustomEvent<TemplateImageUploadEventDetail>(
          "template-builder:image-upload",
          {
            detail: { file },
          },
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo pegar la imagen.";
      window.dispatchEvent(
        new CustomEvent("template-builder:image-upload-status", {
          detail: {
            status: "error",
            source: "sidebar",
            message,
          },
        }),
      );
    }
  };

  const onPasteTextFromContextMenu = async () => {
    const menuState = contextMenu;
    setContextMenu(null);

    try {
      if (!navigator.clipboard?.readText) {
        throw new Error(
          "Tu navegador no permite leer texto del portapapeles en este contexto.",
        );
      }

      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        throw new Error("No hay texto en el portapapeles.");
      }

      const runtimeCanvas = runtimeCanvasRef.current;
      const fabricModule = fabricModuleRef.current;
      if (!runtimeCanvas || !fabricModule) {
        throw new Error("El canvas aun no esta listo para pegar texto.");
      }

      insertPlainTextIntoCanvas({
        runtimeCanvas,
        fabricModule,
        text,
        left: menuState?.canvasLeft,
        top: menuState?.canvasTop,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo pegar el texto.";
      window.dispatchEvent(
        new CustomEvent("template-builder:image-upload-status", {
          detail: {
            status: "error",
            source: "sidebar",
            message,
          },
        }),
      );
    }
  };

  const onContextCopy = () => {
    const canvas = runtimeCanvasRef.current;
    const active = canvas?.getActiveObject() as
      | Record<string, unknown>
      | null
      | undefined;
    if (!active) return;
    contextClipboardRef.current = active;
    setContextMenu(null);
  };

  const onContextDuplicate = async () => {
    setContextMenu(null);
    const canvas = runtimeCanvasRef.current;
    const active = canvas?.getActiveObject() as
      | (Record<string, unknown> & {
          clone?: unknown;
          left?: number;
          top?: number;
        })
      | null
      | undefined;
    if (!canvas || !active) return;
    const cloneFn = active.clone;
    if (typeof cloneFn !== "function") return;
    try {
      let cloned: Record<string, unknown> | null = null;
      if ((cloneFn as { length: number }).length === 0) {
        cloned = await (cloneFn as () => Promise<Record<string, unknown>>).call(
          active,
        );
      } else {
        cloned = await new Promise<Record<string, unknown>>((resolve) => {
          (cloneFn as (cb: (c: Record<string, unknown>) => void) => void).call(
            active,
            resolve,
          );
        });
      }
      if (!cloned) return;
      const setFn = (cloned as { set?: (v: Record<string, unknown>) => void })
        .set;
      setFn?.({
        left: ((active.left ?? 0) as number) + 20,
        top: ((active.top ?? 0) as number) + 20,
      });
      (cloned as { setCoords?: () => void }).setCoords?.();
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
    } catch {
      // ignore
    }
  };

  const onContextAlign = (value: AlignCommand) => {
    setContextMenu(null);
    useTemplateBuilderStore
      .getState()
      .queueCanvasCommand({ type: "align", value });
  };

  const onContextZOrder = (value: ZOrderCommand) => {
    setContextMenu(null);
    useTemplateBuilderStore
      .getState()
      .queueCanvasCommand({ type: "z-order", value });
  };

  const onContextLock = () => {
    setContextMenu(null);
    useTemplateBuilderStore
      .getState()
      .queueCanvasCommand({ type: "toggle-lock" });
  };

  const onContextDelete = () => {
    setContextMenu(null);
    const canvas = runtimeCanvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.remove(active as Record<string, unknown>);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  };

  return (
    <div
      ref={workspaceRef}
      className="relative flex h-full overflow-auto bg-slate-300 p-10"
      onContextMenu={onWorkspaceContextMenu}
    >
      <div className="m-auto rounded-xl border border-slate-300 bg-white p-3 shadow-[0_16px_42px_rgba(15,23,42,0.24)]">
        <canvas ref={canvasElementRef} className="block cursor-crosshair" />
      </div>
      {contextMenu ? (
        <div
          className="absolute z-50 min-w-52 select-none rounded-md border border-slate-200 bg-white p-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {contextMenu.hasSelection ? (
            <>
              {/* Copy & Duplicate */}
              <button
                type="button"
                className="flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                onClick={onContextCopy}
              >
                <span>Copiar</span>
                <span className="text-xs text-slate-400">Ctrl+C</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                onClick={onContextDuplicate}
              >
                Duplicar
              </button>
              <div className="my-1 border-t border-slate-100" />

              {/* Align submenu */}
              <button
                type="button"
                className="flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => setContextAlignOpen((v) => !v)}
              >
                <span>Alinear elementos</span>
                <span className="text-slate-400">
                  {contextAlignOpen ? "▾" : "▸"}
                </span>
              </button>
              {contextAlignOpen && (
                <div className="ml-3 border-l border-slate-100 pl-1">
                  {(
                    [
                      { label: "← Izquierda", value: "left" },
                      { label: "↔ Centro H.", value: "center-horizontal" },
                      { label: "→ Derecha", value: "right" },
                      { label: "↑ Arriba", value: "top" },
                      { label: "↕ Centro V.", value: "center-vertical" },
                      { label: "↓ Abajo", value: "bottom" },
                    ] as const
                  ).map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      className="flex w-full items-center rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                      onClick={() => onContextAlign(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <div className="my-1 border-t border-slate-100" />

              {/* Z-order */}
              <button
                type="button"
                className="flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => onContextZOrder("front")}
              >
                <span>Traer al frente</span>
                <span className="text-xs text-slate-400">]</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => onContextZOrder("forward")}
              >
                <span>Subir</span>
                <span className="text-xs text-slate-400">Ctrl+]</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => onContextZOrder("backward")}
              >
                <span>Bajar</span>
                <span className="text-xs text-slate-400">Ctrl+[</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => onContextZOrder("back")}
              >
                <span>Enviar al fondo</span>
                <span className="text-xs text-slate-400">[</span>
              </button>
              <div className="my-1 border-t border-slate-100" />

              {/* Lock & Delete */}
              <button
                type="button"
                className="flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                onClick={onContextLock}
              >
                <span>{contextMenu.isLocked ? "Desbloquear" : "Bloquear"}</span>
                <span className="text-xs text-slate-400">Ctrl+L</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center rounded px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                onClick={onContextDelete}
              >
                Eliminar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="flex w-full items-center rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                onClick={onPasteTextFromContextMenu}
              >
                Pegar texto
              </button>
              <button
                type="button"
                className="flex w-full items-center rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                onClick={onPasteImageFromContextMenu}
              >
                Pegar imagen
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
