'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Brackets,
  CalendarDays,
  Copy,
  Group,
  Lock,
  Move,
  MoreHorizontal,
  Trash2,
  Type,
  Unlock,
  Ungroup,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTemplateBuilderStore } from '@/components/template-builder/store/use-template-builder-store';
import type { RuntimeCanvas } from '@/components/template-builder/types/fabric-runtime';
import {
  CanvasContextMenu,
  type ContextMenuState,
} from '@/components/template-builder/canvas-context-menu';

// ── Toolbar position (fixed / viewport coordinates) ──

interface ScreenRect {
  cx: number;
  top: number;
  bottom: number;
  visible: boolean;
}

const TOOLBAR_GAP = 8;
const MOVE_HANDLE_GAP = 8;

function getSelectionScreenRect(
  runtimeCanvas: RuntimeCanvas | null,
  canvasElement: HTMLCanvasElement | null,
): ScreenRect {
  const empty: ScreenRect = { cx: 0, top: 0, bottom: 0, visible: false };

  if (!runtimeCanvas || !canvasElement) return empty;

  const active = runtimeCanvas.getActiveObject();
  if (!active) return empty;

  const fn = (active as { getBoundingRect?: () => { left: number; top: number; width: number; height: number } }).getBoundingRect;
  if (typeof fn !== 'function') return empty;

  // rect is in canvas-internal pixels (unscaled)
  const rect = fn.call(active);

  // canvasRect is the on-screen size (already includes CSS scale from zoom)
  const canvasRect = canvasElement.getBoundingClientRect();

  // Compute the scale ratio: DOM size vs canvas internal size
  const scaleX = canvasRect.width / canvasElement.offsetWidth;
  const scaleY = canvasRect.height / canvasElement.offsetHeight;

  return {
    cx: canvasRect.left + rect.left * scaleX + (rect.width * scaleX) / 2,
    top: canvasRect.top + rect.top * scaleY,
    bottom: canvasRect.top + rect.top * scaleY + rect.height * scaleY,
    visible: true,
  };
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
  const [rect, setRect] = useState<ScreenRect>({ cx: 0, top: 0, bottom: 0, visible: false });
  const [interacting, setInteracting] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextClipboardRef = useRef<Record<string, unknown> | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);

  const activeObjects = useTemplateBuilderStore((s) => s.activeObjects);
  const selectedObject = useTemplateBuilderStore((s) => s.selectedObject);
  const queueCanvasCommand = useTemplateBuilderStore((s) => s.queueCanvasCommand);
  const queueAttributeInsertion = useTemplateBuilderStore((s) => s.queueAttributeInsertion);
  const attributes = useTemplateBuilderStore((s) => s.attributes);
  const zoom = useTemplateBuilderStore((s) => s.zoom);
  const activeSidebarSection = useTemplateBuilderStore((s) => s.activeSidebarSection);

  const isMultiSelect = activeObjects.length > 1;
  const hasSingleSelection = activeObjects.length === 1;
  const isGroup = selectedObject?.fabricType === 'Group' || selectedObject?.fabricType === 'group';
  const isLocked = selectedObject?.locked === true;
  const insertableAttributes = useMemo(
    () => attributes.filter((a) => a.dataType === 'text' || a.dataType === 'date'),
    [attributes],
  );

  // ── Recompute position ──

  const updatePosition = useCallback(() => {
    setRect(getSelectionScreenRect(runtimeCanvasRef.current, canvasElementRef.current));
  }, [runtimeCanvasRef, canvasElementRef]);

  // Hide during interaction, reposition when done
  useEffect(() => {
    const canvas = runtimeCanvasRef.current;
    if (!canvas) return;

    const onSelectionChange = () => {
      updatePosition();
    };

    const onInteractStart = () => {
      setInteracting(true);
    };

    const onInteractEnd = () => {
      setInteracting(false);
      requestAnimationFrame(updatePosition);
    };

    canvas.on('selection:created', onSelectionChange);
    canvas.on('selection:updated', onSelectionChange);
    canvas.on('selection:cleared', onSelectionChange);
    canvas.on('object:moving', onInteractStart);
    canvas.on('object:scaling', onInteractStart);
    canvas.on('object:rotating', onInteractStart);
    canvas.on('object:modified', onInteractEnd);
    canvas.on('mouse:up', onInteractEnd);

    onSelectionChange();

    return () => {
      canvas.off('selection:created', onSelectionChange);
      canvas.off('selection:updated', onSelectionChange);
      canvas.off('selection:cleared', onSelectionChange);
      canvas.off('object:moving', onInteractStart);
      canvas.off('object:scaling', onInteractStart);
      canvas.off('object:rotating', onInteractStart);
      canvas.off('object:modified', onInteractEnd);
      canvas.off('mouse:up', onInteractEnd);
    };
  }, [runtimeCanvasRef, updatePosition]);

  // Update on scroll (workspace is the scrollable container)
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const onScroll = () => {
      requestAnimationFrame(updatePosition);
    };

    workspace.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      workspace.removeEventListener('scroll', onScroll);
    };
  }, [workspaceRef, updatePosition]);

  // Also recalculate when selectedObject, zoom, or sidebar changes
  useEffect(() => {
    // Use rAF to let the layout settle after sidebar transitions
    const id = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(id);
  }, [selectedObject, updatePosition, isContextMenuOpen, zoom, activeSidebarSection]);

  // Reposition when the canvas element moves/resizes (e.g. sidebar toggle animation)
  useEffect(() => {
    const el = canvasElementRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(updatePosition);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasElementRef, updatePosition]);

  // ── Context menu from [...] button ──
  const onMoreClick = () => {
    const btn = moreButtonRef.current;
    if (!btn) return;

    const btnRect = btn.getBoundingClientRect();

    const activeObj = runtimeCanvasRef.current?.getActiveObject() as
      | Record<string, unknown>
      | null
      | undefined;
    const hasSelection = Boolean(activeObj);
    const objIsLocked = Boolean(
      activeObj?.lockMovementX && activeObj?.lockMovementY,
    );

    setContextMenu({
      x: btnRect.right,
      y: btnRect.bottom + 4,
      canvasLeft: 0,
      canvasTop: 0,
      hasSelection,
      isLocked: objIsLocked,
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

  if (!rect.visible || !selectedObject || isContextMenuOpen || interacting) {
    return null;
  }

  // ── Locked state: show only unlock button ──
  if (isLocked) {
    return (
      <>
        <div
          className="pointer-events-auto fixed z-40 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          style={{ left: rect.cx, top: rect.top - TOOLBAR_GAP, transform: 'translate(-50%, -100%)' }}
        >
          <Button
            size="icon-sm"
            variant="ghost"
            title="Desbloquear"
            onClick={() => queueCanvasCommand({ type: 'toggle-lock' })}
          >
            <Unlock className="h-4 w-4" />
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Toolbar: fixed, centered above selection */}
      <div
        className="pointer-events-auto fixed z-40 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
        style={{ left: rect.cx, top: rect.top - TOOLBAR_GAP, transform: 'translate(-50%, -100%)' }}
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

        {/* Attribute dropdown */}
        {hasSingleSelection && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  title="Insertar atributo"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Brackets className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-56"
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                {insertableAttributes.length === 0 ? (
                  <DropdownMenuItem disabled>Sin atributos disponibles</DropdownMenuItem>
                ) : (
                  insertableAttributes.map((attribute) => {
                    const Icon = attribute.dataType === 'date' ? CalendarDays : Type;
                    return (
                      <DropdownMenuItem
                        key={attribute.id}
                        onClick={(event) => {
                          event.preventDefault();
                          queueAttributeInsertion(attribute.id);
                        }}
                      >
                        <span className="truncate">{attribute.label}</span>
                        <Icon className="ml-auto h-4 w-4 text-slate-400" />
                      </DropdownMenuItem>
                    );
                  })
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="mx-0.5 h-4 w-px bg-slate-200" />
          </>
        )}

        {/* Duplicate */}
        <Button size="icon-sm" variant="ghost" title="Duplicar" onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </Button>

        {/* Delete */}
        <Button size="icon-sm" variant="ghost" title="Eliminar" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>

        {/* Lock */}
        <div className="mx-0.5 h-4 w-px bg-slate-200" />
        <Button
          size="icon-sm"
          variant="ghost"
          title="Bloquear"
          onClick={() => queueCanvasCommand({ type: 'toggle-lock' })}
        >
          <Lock className="h-4 w-4" />
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

      {/* Move handle: fixed, centered below selection */}
      <div
        className="pointer-events-none fixed z-40 -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 p-2 shadow-lg"
        style={{ left: rect.cx, top: rect.bottom + MOVE_HANDLE_GAP }}
      >
        <Move className="h-5 w-5 text-slate-700" />
      </div>

      {/* Context menu anchored to [...] button */}
      {contextMenu && (
        <div className="fixed z-50" style={{ left: 0, top: 0 }}>
          <CanvasContextMenu
            menu={contextMenu}
            onClose={() => setContextMenu(null)}
            runtimeCanvasRef={runtimeCanvasRef}
            fabricModuleRef={fabricModuleRef}
            contextClipboardRef={contextClipboardRef}
          />
        </div>
      )}
    </>
  );
}
