import { useEffect } from 'react';
import type { RuntimeCanvas, RuntimeFabricObject } from '@/components/template-builder/types/fabric-runtime';
import type { SelectedObjectState } from '@/components/template-builder/types';

/**
 * Toggles object selectability/evented based on edit vs preview mode.
 */
export function useCanvasMode(
  runtimeCanvasRef: React.RefObject<RuntimeCanvas | null>,
  mode: 'edit' | 'preview',
  setSelectedObject: (selected: SelectedObjectState | null) => void,
) {
  useEffect(() => {
    const runtimeCanvas = runtimeCanvasRef.current;
    if (!runtimeCanvas) {
      return;
    }

    const editable = mode === 'edit';
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
  }, [runtimeCanvasRef, mode, setSelectedObject]);
}
