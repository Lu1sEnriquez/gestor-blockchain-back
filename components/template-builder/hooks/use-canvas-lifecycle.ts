import { useEffect } from 'react';
import type {
  RuntimeCanvas,
  RuntimeFabricObject,
  FabricCloneCallback,
} from '@/components/template-builder/types/fabric-runtime';
import type {
  FabricTemplateScene,
  SelectedObjectState,
  TemplatePageSettings,
} from '@/components/template-builder/types';
import {
  DEFAULT_TEMPLATE_PAGE_SETTINGS,
} from '@/components/template-builder/defaults';
import {
  getFabricExport,
  resolvePageSettings,
  buildSelectedObjectState,
} from '@/components/template-builder/utils/fabric-helpers';
import { loadSceneSafely, serializeScene } from '@/components/template-builder/serializer/fabric-serializer';
import { preloadSceneFonts } from '@/components/template-builder/font-loader';
import { setupCanvasSnapping } from '@/components/template-builder/hooks/use-canvas-snapping';
import { useTemplateBuilderStore } from '@/components/template-builder/store/use-template-builder-store';

interface CanvasLifecycleCallbacks {
  onSceneChange?: (scene: FabricTemplateScene) => void;
  onReady?: (actions: {
    duplicate: () => void;
    bringToFront: () => void;
    sendToBack: () => void;
    remove: () => void;
  }) => void;
}

/**
 * Mounts the Fabric canvas, hydrates the initial scene, wires all canvas events,
 * sets up snapping, and provides duplicate/z-order/remove actions via onReady.
 */
export function useCanvasLifecycle(
  canvasElementRef: React.RefObject<HTMLCanvasElement | null>,
  runtimeCanvasRef: React.MutableRefObject<RuntimeCanvas | null>,
  fabricModuleRef: React.MutableRefObject<Record<string, unknown> | null>,
  pageSettingsRef: React.MutableRefObject<TemplatePageSettings>,
  lastEditingTextboxRef: React.MutableRefObject<Record<string, unknown> | null>,
  onSceneChangeRef: React.RefObject<CanvasLifecycleCallbacks['onSceneChange'] | undefined>,
  onReadyRef: React.RefObject<CanvasLifecycleCallbacks['onReady'] | undefined>,
  sanitizedHydratedScene: Record<string, unknown>,
  initCanvas: (canvas: RuntimeCanvas | null) => void,
  pushHistory: (scene: FabricTemplateScene) => void,
  setActiveObjects: (objects: Array<Record<string, unknown>>) => void,
  setSelectedObject: (selected: SelectedObjectState | null) => void,
) {
  useEffect(() => {
    let isActive = true;

    async function mountCanvas() {
      const element = canvasElementRef.current;
      if (!element) {
        return;
      }

      const fabricModule = (await import('fabric')) as unknown as Record<
        string,
        unknown
      >;
      const CanvasClass = getFabricExport<
        new (
          element: HTMLCanvasElement,
          options: Record<string, unknown>,
        ) => RuntimeCanvas
      >(fabricModule, 'Canvas');

      if (!CanvasClass) {
        throw new Error('No se pudo resolver Canvas de Fabric en runtime.');
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
        backgroundColor: '#ffffff',
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
      // The store's RuntimeCanvas type is a subset of the full one — safe cast.
      initCanvas(runtimeCanvas as never);

      const syncSelection = () => {
        const activeObjects =
          typeof runtimeCanvas.getActiveObjects === 'function'
            ? runtimeCanvas.getActiveObjects()
            : [];
        setActiveObjects(activeObjects);
        const active = runtimeCanvas.getActiveObject();
        setSelectedObject(active ? buildSelectedObjectState(active) : null);
      };

      // Guard flag — suppress syncScene during loadFromJSON
      let isHydrating = true;

      // Guard flag — suppress intermediate history saves during active drag/transform.
      // Set to true when a transform begins (before:transform) and cleared when the
      // object is released (object:modified). This prevents every mouse-move position
      // from being recorded as a separate undo step.
      let isTransforming = false;

      const syncScene = () => {
        if (isHydrating) return;
        // Skip history saves when undo/redo is reloading the canvas
        if (useTemplateBuilderStore.getState()._skipHistory) return;
        // Skip intermediate positions recorded while the user is still dragging
        if (isTransforming) return;
        const scene = serializeScene(runtimeCanvas, pageSettingsRef.current);
        pushHistory(scene);
        onSceneChangeRef.current?.(scene);
      };

      const onBeforeTransform = () => {
        isTransforming = true;
      };

      const onObjectModified = () => {
        isTransforming = false;
        syncScene();
      };

      // Pre-load fonts
      try {
        await preloadSceneFonts(sanitizedHydratedScene);
      } catch (fontError) {
        console.warn(
          '[template-builder] Font pre-loading failed, continuing without it.',
          fontError,
        );
      }

      console.log(
        '[template-builder] Loading scene with',
        (sanitizedHydratedScene.objects as unknown[])?.length ?? 0,
        'objects',
      );
      console.log(
        '[template-builder] Object types:',
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
          '[template-builder] Scene loaded, canvas has',
          runtimeCanvas.getObjects().length,
          'objects',
        );
      } catch (error) {
        console.error(
          '[template-builder] loadSceneSafely failed completely.',
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

      // ── Smart Snapping ──
      const cleanupSnapping = setupCanvasSnapping(runtimeCanvas, fabricModule);

      // ── Text editing tracking ──
      runtimeCanvas.on('text:editing:entered', (...args: unknown[]) => {
        const e = args[0] as Record<string, unknown> | undefined;
        const target = e?.target as Record<string, unknown> | undefined;
        if (target) lastEditingTextboxRef.current = target;
      });
      runtimeCanvas.on('selection:cleared', () => {
        lastEditingTextboxRef.current = null;
      });

      // ── Selection & scene sync ──
      runtimeCanvas.on('selection:created', syncSelection);
      runtimeCanvas.on('selection:updated', syncSelection);
      runtimeCanvas.on('selection:cleared', syncSelection);
      // before:transform fires when the user starts dragging/scaling/rotating;
      // object:modified fires once when they release — so each gesture = 1 history entry.
      runtimeCanvas.on('before:transform', onBeforeTransform);
      runtimeCanvas.on('object:modified', onObjectModified);
      runtimeCanvas.on('object:added', syncScene);
      runtimeCanvas.on('object:removed', syncScene);

      // ── onReady actions ──
      onReadyRef.current?.({
        duplicate: () => {
          const active = runtimeCanvas.getActiveObject();
          if (!active) {
            return;
          }

          const source = active as RuntimeFabricObject;
          const clone = source.clone;
          if (typeof clone !== 'function') {
            return;
          }

          const placeDuplicate = (duplicated: Record<string, unknown>) => {
            const duplicateObject = duplicated as RuntimeFabricObject;
            const nextLeft =
              Number((duplicateObject.left as number | undefined) ?? 0) + 18;
            const nextTop =
              Number((duplicateObject.top as number | undefined) ?? 0) + 18;

            if (typeof duplicateObject.set === 'function') {
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
            (clone as RuntimeFabricObject['clone'])!.length === 0
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
            'function'
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
            'function'
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

      // Cleanup function stored for the effect teardown
      return cleanupSnapping;
    }

    let cleanupSnapping: (() => void) | undefined;
    void mountCanvas()
      .then((cleanup) => {
        cleanupSnapping = cleanup;
      })
      .catch((error) => {
        console.error('[template-builder] mountCanvas failed.', error);
      });

    return () => {
      isActive = false;
      cleanupSnapping?.();
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
    canvasElementRef,
    runtimeCanvasRef,
    fabricModuleRef,
    pageSettingsRef,
    lastEditingTextboxRef,
    onSceneChangeRef,
    onReadyRef,
    initCanvas,
    pushHistory,
    sanitizedHydratedScene,
    setActiveObjects,
    setSelectedObject,
  ]);
}
