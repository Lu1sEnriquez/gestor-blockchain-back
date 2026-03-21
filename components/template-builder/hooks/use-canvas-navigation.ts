import { useEffect, useRef } from 'react';
import type { RuntimeCanvas } from '@/components/template-builder/types/fabric-runtime';

/**
 * Handles zoom (ctrl+wheel) and pan (space+drag) on the canvas workspace.
 */
export function useCanvasNavigation(
  workspaceRef: React.RefObject<HTMLDivElement | null>,
  runtimeCanvasRef: React.RefObject<RuntimeCanvas | null>,
  setZoom: (zoom: number) => void,
  setPan: (pan: { x: number; y: number }) => void,
) {
  const isSpacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

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
        typeof runtimeCanvas.getZoom !== 'function' ||
        typeof runtimeCanvas.zoomToPoint !== 'function'
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
      if (event.code === 'Space') {
        isSpacePressedRef.current = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
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

    workspace.addEventListener('wheel', onWheel, { passive: false });
    workspace.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      workspace.removeEventListener('wheel', onWheel);
      workspace.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [workspaceRef, runtimeCanvasRef, setPan, setZoom]);
}
