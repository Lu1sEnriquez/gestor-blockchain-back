import { useEffect } from 'react';
import type { RuntimeCanvas, RuntimeFabricObject, RuntimeImageFactory } from '@/components/template-builder/types/fabric-runtime';
import type { FabricTemplateScene, TemplatePageSettings } from '@/components/template-builder/types';
import {
  applyTextStyle,
  alignObject,
  alignObjectsRelative,
  toggleObjectLock,
  resolvePageSettings,
  buildSelectedObjectState,
  getFabricExport,
  createFabricImageFromUrl,
} from '@/components/template-builder/utils/fabric-helpers';
import { serializeScene } from '@/components/template-builder/serializer/fabric-serializer';
import type { CanvasCommand } from '@/components/template-builder/types';

/**
 * Dispatches queued canvas commands (align, z-order, lock, styles, geometry, etc.)
 */
export function useCanvasCommands(
  runtimeCanvasRef: React.RefObject<RuntimeCanvas | null>,
  fabricModuleRef: React.RefObject<Record<string, unknown> | null>,
  pageSettingsRef: React.MutableRefObject<TemplatePageSettings>,
  onSceneChangeRef: React.RefObject<((scene: FabricTemplateScene) => void) | undefined>,
  pendingCanvasCommand: CanvasCommand | null,
  consumeCanvasCommand: () => void,
  pushHistory: (scene: FabricTemplateScene) => void,
  setSelectedObject: (selected: import('@/components/template-builder/types').SelectedObjectState | null) => void,
) {
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

    if (command.type === 'set-page') {
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

    if (command.type === 'set-background-image') {
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
        if (typeof extCanvas.setBackgroundImage === 'function') {
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
          'FabricImage',
        ) ??
        getFabricExport<RuntimeImageFactory>(
          fabricModuleRef.current ?? {},
          'Image',
        );

      if (imageFactory && typeof imageFactory.fromURL === 'function') {
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

            if (typeof (bgImage as RuntimeFabricObject).set === 'function') {
              (bgImage as RuntimeFabricObject).set!({
                scaleX: scale,
                scaleY: scale,
              });
            }

            if (typeof extCanvas.setBackgroundImage === 'function') {
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

    if (command.type === 'group') {
      // ActiveSelection → Group (Fabric v7: activeSelection.toGroup())
      const toGroup = (active as RuntimeFabricObject).toGroup;
      if (typeof toGroup === 'function') {
        const group = toGroup.call(active);
        if (group) {
          runtimeCanvas.requestRenderAll();
          updateScene();
        }
      }
      consumeCanvasCommand();
      return;
    }

    if (command.type === 'ungroup') {
      // Group → ActiveSelection (Fabric v7: group.toActiveSelection())
      const toActiveSelection = (active as RuntimeFabricObject).toActiveSelection;
      if (typeof toActiveSelection === 'function') {
        toActiveSelection.call(active);
        runtimeCanvas.requestRenderAll();
        updateScene();
      }
      consumeCanvasCommand();
      return;
    }

    if (command.type === 'align') {
      // Multi-selection: align objects relative to each other
      const activeObjects =
        typeof runtimeCanvas.getActiveObjects === 'function'
          ? runtimeCanvas.getActiveObjects()
          : [];
      if (activeObjects.length > 1) {
        alignObjectsRelative(
          activeObjects as RuntimeFabricObject[],
          command.value,
        );
      } else {
        alignObject(active, runtimeCanvas, command.value);
      }
      // Force reselection to update the selection state after alignment
      if (typeof runtimeCanvas.setActiveObject === 'function') {
        runtimeCanvas.setActiveObject(active);
      }
    }

    if (command.type === 'z-order') {
      if (command.value === 'front') {
        active.bringToFront?.();
      }
      if (command.value === 'back') {
        active.sendToBack?.();
      }
      if (command.value === 'forward') {
        active.bringForward?.();
      }
      if (command.value === 'backward') {
        active.sendBackwards?.();
      }
      // Force reselection to update the selection state after z-order change
      if (typeof runtimeCanvas.setActiveObject === 'function') {
        runtimeCanvas.setActiveObject(active);
      }
    }

    if (command.type === 'toggle-lock') {
      toggleObjectLock(active);
    }

    if (command.type === 'apply-text-style') {
      applyTextStyle(active, command.value);
    }

    if (command.type === 'set-geometry') {
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
      if (typeof active.set === 'function') {
        active.set(changes);
      }
      active.setCoords?.();
    }

    if (command.type === 'set-appearance') {
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
      if (typeof active.set === 'function') {
        active.set(changes);
      }
      active.setCoords?.();
    }

    if (command.type === 'set-metadata') {
      const meta = command.value;
      const changes: Record<string, unknown> = {};
      if (meta.fieldId !== undefined) {
        changes.fieldId = meta.fieldId;
        changes.name = meta.fieldId;
        changes.placeholder = `{{${meta.fieldId}}}`;
      }
      if (typeof active.set === 'function') {
        active.set(changes);
      }
    }

    runtimeCanvas.requestRenderAll();
    updateScene();
    consumeCanvasCommand();
  }, [
    runtimeCanvasRef,
    fabricModuleRef,
    pageSettingsRef,
    onSceneChangeRef,
    consumeCanvasCommand,
    pendingCanvasCommand,
    pushHistory,
    setSelectedObject,
  ]);
}
