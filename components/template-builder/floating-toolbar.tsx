'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Copy,
  Group,
  MoreHorizontal,
  Trash2,
  Ungroup,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTemplateBuilderStore } from '@/components/template-builder/store/use-template-builder-store';
import type { RuntimeCanvas } from '@/components/template-builder/types/fabric-runtime';
import {
  CanvasContextMenu,
  type ContextMenuState,
} from '@/components/template-builder/canvas-context-menu';

// ── Toolbar position relative to the workspace container ──

interface ToolbarPosition {
  x: number;
  y: number;
  visible: boolean;
}

const TOOLBAR_GAP = 8;
const TOOLBAR_HEIGHT_ESTIMATE = 36;

function computeToolbarPosition(
  runtimeCanvas: RuntimeCanvas | null,
  canvasElement: HTMLCanvasElement | null,
  workspaceElement: HTMLDivElement | null,
): ToolbarPosition {
  if (!runtimeCanvas || !canvasElement || !workspaceElement) {
    return { x: 0, y: 0, visible: false };
  }

  const active = runtimeCanvas.getActiveObject();
  if (!active) {
    return { x: 0, y: 0, visible: false };
  }

  const getBoundingRect = (active as { getBoundingRect?: () => { left: number; top: number; width: number; height: number } }).getBoundingRect;
  if (typeof getBoundingRect !== 'function') {
    return { x: 0, y: 0, visible: false };
  }

  // boundingRect is in canvas viewport coordinates (pixels on the <canvas> element)
  const rect = getBoundingRect.call(active);

  const canvasRect = canvasElement.getBoundingClientRect();
  const workspaceRect = workspaceElement.getBoundingClientRect();

  // Convert canvas-element-relative → workspace-relative (accounting for scroll)
  const offsetX = canvasRect.left - workspaceRect.left + workspaceElement.scrollLeft;
  const offsetY = canvasRect.top - workspaceRect.top + workspaceElement.scrollTop;

  const x = offsetX + rect.left + rect.width / 2;
  let y = offsetY + rect.top - TOOLBAR_GAP - TOOLBAR_HEIGHT_ESTIMATE;

  // If toolbar would go above the visible area, place it below the selection
  if (y < workspaceElement.scrollTop + 4) {
    y = offsetY + rect.top + rect.height + TOOLBAR_GAP;
  }

  return { x, y, visible: true };
}

// ── Props ──

interface FloatingToolbarProps {
  workspaceRef: React.RefObject<HTMLDivElement | null>;
  canvasElementRef: React.RefObject<HTMLCanvasElement | null>;
  runtimeCanvasRef: React.RefObject<RuntimeCanvas | null>;
  fabricModuleRef: React.RefObject<Record<string, unknown> | null>;
  onDuplicate: () => void;
  onDelete: () => void;
  isContextMenuOpen?: boolean;
}


export function FloatingToolbar({
  workspaceRef,
  canvasElementRef,
  runtimeCanvasRef,
  fabricModuleRef,
  onDuplicate,
  onDelete,
  isContextMenuOpen = false,
}: FloatingToolbarProps) {
  const [position, setPosition] = useState<ToolbarPosition>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextClipboardRef = useRef<Record<string, unknown> | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const trackingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const activeObjects = useTemplateBuilderStore((s) => s.activeObjects);
  const selectedObject = useTemplateBuilderStore((s) => s.selectedObject);
  const queueCanvasCommand = useTemplateBuilderStore((s) => s.queueCanvasCommand);

  const isMultiSelect = activeObjects.length > 1;
  const isGroup = selectedObject?.fabricType === 'Group' || selectedObject?.fabricType === 'group';

  // ── Recompute position ──

  const updatePosition = useCallback(() => {
    const pos = computeToolbarPosition(
      runtimeCanvasRef.current,
      canvasElementRef.current,
      workspaceRef.current,
    );
    setPosition(pos);
  }, [runtimeCanvasRef, canvasElementRef, workspaceRef]);

  // Subscribe to canvas events that affect bounding rect
  useEffect(() => {
    const canvas = runtimeCanvasRef.current;
    if (!canvas) return;

    const runTrackFrame = () => {
      updatePosition();
      if (!trackingRef.current) {
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(runTrackFrame);
    };

    const startTracking = () => {
      if (trackingRef.current) return;
      trackingRef.current = true;
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(runTrackFrame);
      }
    };

    const stopTracking = () => {
      trackingRef.current = false;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      requestAnimationFrame(updatePosition);
    };

    const onUpdate = () => {
      requestAnimationFrame(updatePosition);
    };

    const onInteractUpdate = () => {
      startTracking();
      requestAnimationFrame(updatePosition);
    };

    canvas.on('selection:created', onUpdate);
    canvas.on('selection:updated', onUpdate);
    canvas.on('selection:cleared', onUpdate);
    canvas.on('object:moving', onInteractUpdate);
    canvas.on('object:scaling', onInteractUpdate);
    canvas.on('object:rotating', onInteractUpdate);
    canvas.on('object:modified', stopTracking);
    canvas.on('mouse:up', stopTracking);
    canvas.on('selection:cleared', stopTracking);

    // Initial position
    onUpdate();

    return () => {
      stopTracking();
      canvas.off('selection:created', onUpdate);
      canvas.off('selection:updated', onUpdate);
      canvas.off('selection:cleared', onUpdate);
      canvas.off('object:moving', onInteractUpdate);
      canvas.off('object:scaling', onInteractUpdate);
      canvas.off('object:rotating', onInteractUpdate);
      canvas.off('object:modified', stopTracking);
      canvas.off('mouse:up', stopTracking);
      canvas.off('selection:cleared', stopTracking);
   };
  }, [runtimeCanvasRef, updatePosition]);

  // Also recalculate when selectedObject changes (covers undo/redo, etc.)
  useEffect(() => {
    updatePosition();
   }, [selectedObject, updatePosition, isContextMenuOpen]);
  // ── Context menu from [...] button ──
  const onMoreClick = () => {
    const btn = moreButtonRef.current;
    const workspace = workspaceRef.current;
    if (!btn || !workspace) return;

    const btnRect = btn.getBoundingClientRect();
    const workspaceRect = workspace.getBoundingClientRect();

    const x = btnRect.left - workspaceRect.left + workspace.scrollLeft;
    const y = btnRect.bottom - workspaceRect.top + workspace.scrollTop + 4;

    const activeObj = runtimeCanvasRef.current?.getActiveObject() as
      | Record<string, unknown>
      | null
      | undefined;
    const hasSelection = Boolean(activeObj);
    const isLocked = Boolean(
      activeObj?.lockMovementX && activeObj?.lockMovementY,
    );

    setContextMenu({
      x,
      y,
      canvasLeft: 0,
      canvasTop: 0,
      hasSelection,
      isLocked,
    });
  };

  // Close context menu on escape / outside click
  useEffect(() => {
    if (!contextMenu) return;

    const close = () => setContextMenu(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    window.addEventListener('click', close);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [contextMenu]);

  if (!position.visible || !selectedObject || isContextMenuOpen) {
   return null;
  }

  return (
    <>
      <div
        className="pointer-events-auto absolute z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
        style={{ left: position.x, top: position.y }}
      >
        {/* Group / Ungroup */}
        {isMultiSelect && (
          <Button
            size="icon-sm"
            variant="ghost"
            title="Agrupar"
            onClick={() => queueCanvasCommand({ type: 'group' })}
          >
            <Group className="h-4 w-4" />
          </Button>
        )}
        {isGroup && !isMultiSelect && (
          <Button
            size="icon-sm"
            variant="ghost"
            title="Desagrupar"
            onClick={() => queueCanvasCommand({ type: 'ungroup' })}
          >
            <Ungroup className="h-4 w-4" />
          </Button>
        )}

        {/* Separator when group buttons are visible */}
        {(isMultiSelect || isGroup) && (
          <div className="mx-0.5 h-4 w-px bg-slate-200" />
        )}

        {/* Duplicate */}
        <Button size="icon-sm" variant="ghost" title="Duplicar" onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </Button>

        {/* Delete */}
        <Button size="icon-sm" variant="ghost" title="Eliminar" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>

        {/* More actions */}
        <div className="mx-0.5 h-4 w-px bg-slate-200" />
        <Button
          ref={moreButtonRef}
          size="icon-sm"
          variant="ghost"
          title="Mas opciones"
          onClick={(e) => {
            e.stopPropagation();
            onMoreClick();
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Context menu anchored to [...] button */}
      {contextMenu && (
        <CanvasContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          runtimeCanvasRef={runtimeCanvasRef}
          fabricModuleRef={fabricModuleRef}
          contextClipboardRef={contextClipboardRef}
        />
      )}
    </>
  );
}
