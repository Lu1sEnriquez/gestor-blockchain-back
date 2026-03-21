import type { RuntimeCanvas, RuntimeFabricObject } from '@/components/template-builder/types/fabric-runtime';
import { getFabricExport } from '@/components/template-builder/utils/fabric-helpers';

/**
 * Set up Smart Snapping (magnetic guides) on the canvas.
 * Returns a cleanup function to remove guides and event listeners.
 */
export function setupCanvasSnapping(
  runtimeCanvas: RuntimeCanvas,
  fabricModule: Record<string, unknown>,
): () => void {
  const SNAP_THRESHOLD = 5;
  const GUIDE_COLOR = '#06b6d4';
  const guideLines: Array<Record<string, unknown>> = [];

  const LineClass = getFabricExport<
    new (
      points: number[],
      options: Record<string, unknown>,
    ) => Record<string, unknown>
  >(fabricModule, 'Line');

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
      if (typeof active.set === 'function')
        active.set({ left: canvasCX - aWidth / 2 });
      addGuide(canvasCX, 0, canvasCX, canvasH);
    }
    if (Math.abs(aCenterY - canvasCY) < SNAP_THRESHOLD) {
      if (typeof active.set === 'function')
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

      // Horizontal snaps
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
          if (typeof active.set === 'function')
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
          if (typeof active.set === 'function')
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

  runtimeCanvas.on('object:moving', onObjectMoving);
  runtimeCanvas.on('object:scaling', onObjectMoving);
  runtimeCanvas.on('mouse:up', onObjectModifiedOrMouseUp);

  return () => {
    runtimeCanvas.off('object:moving', onObjectMoving);
    runtimeCanvas.off('object:scaling', onObjectMoving);
    runtimeCanvas.off('mouse:up', onObjectModifiedOrMouseUp);
    clearGuides();
  };
}
