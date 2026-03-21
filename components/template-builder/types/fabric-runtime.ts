/**
 * Runtime type definitions for Fabric.js canvas objects.
 * These are "loose" Record-based types because Fabric is loaded dynamically
 * and its class shapes are not available at compile time.
 */

export type RuntimeCanvas = {
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

export type RuntimeImageFactory = {
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

export type FabricCloneCallback = (cloned: Record<string, unknown>) => void;

export type RuntimeFabricObject = Record<string, unknown> & {
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
  getBoundingRect?: () => { left: number; top: number; width: number; height: number };
  toGroup?: () => RuntimeFabricObject;
  toActiveSelection?: () => RuntimeFabricObject;
  getObjects?: () => Array<Record<string, unknown>>;
};
