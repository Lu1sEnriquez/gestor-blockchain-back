"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Scan } from "lucide-react";
import {
  DEFAULT_FABRIC_SCENE,
  DEFAULT_TEMPLATE_PAGE_SETTINGS,
} from "@/components/template-builder/defaults";
import { Button } from "@/components/ui/button";
import { useTemplateBuilderStore } from "@/components/template-builder/store/use-template-builder-store";
import type {
  FabricTemplateScene,
  TemplatePageSettings,
} from "@/components/template-builder/types";
import type { RuntimeCanvas } from "@/components/template-builder/types/fabric-runtime";
import { resolvePageSettings } from "@/components/template-builder/utils/fabric-helpers";
import { sanitizeSceneForLoad } from "@/components/template-builder/serializer/sanitize";

// ── Hooks ──
import { useCanvasLifecycle } from "@/components/template-builder/hooks/use-canvas-lifecycle";
import { useCanvasNavigation } from "@/components/template-builder/hooks/use-canvas-navigation";
import { useCanvasDropZone } from "@/components/template-builder/hooks/use-canvas-drop-zone";
import { useCanvasCommands } from "@/components/template-builder/hooks/use-canvas-commands";
import { useCanvasInsertions } from "@/components/template-builder/hooks/use-canvas-insertions";
import { useCanvasMode } from "@/components/template-builder/hooks/use-canvas-mode";

// ── UI ──
import {
  CanvasContextMenu,
  type ContextMenuState,
} from "@/components/template-builder/canvas-context-menu";
import { FloatingToolbar } from "@/components/template-builder/floating-toolbar";

// ── Props ──

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

export function FabricCanvas({
  initialScene,
  onSceneChange,
  onReady,
}: FabricCanvasProps) {
  // ── Refs ──
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeCanvasRef = useRef<RuntimeCanvas | null>(null);
  const fabricModuleRef = useRef<Record<string, unknown> | null>(null);
  const pageSettingsRef = useRef<TemplatePageSettings>(
    DEFAULT_TEMPLATE_PAGE_SETTINGS,
  );
  const lastEditingTextboxRef = useRef<Record<string, unknown> | null>(null);
  const contextClipboardRef = useRef<Record<string, unknown> | null>(null);
  const onSceneChangeRef =
    useRef<FabricCanvasProps["onSceneChange"]>(undefined);
  const onReadyRef = useRef<FabricCanvasProps["onReady"]>(undefined);

  // ── Store selectors ──
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
  const zoom = useTemplateBuilderStore((state) => state.zoom);
  const setSelectedObject = useTemplateBuilderStore(
    (state) => state.setSelectedObject,
  );
  const mode = useTemplateBuilderStore((state) => state.mode);

  // ── Runtime actions for the floating toolbar ──
  const [runtimeActions, setRuntimeActions] = useState<{
    duplicate: () => void;
    remove: () => void;
  }>({ duplicate: () => {}, remove: () => {} });

  // Wrap onReady to capture actions locally for the toolbar
  const onReadyWrapper = useCallback(
    (actions: { duplicate: () => void; bringToFront: () => void; sendToBack: () => void; remove: () => void }) => {
      setRuntimeActions({ duplicate: actions.duplicate, remove: actions.remove });
      onReady?.(actions);
    },
    [onReady],
  );

  // ── Context menu state ──
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ── Hydrate scene ──
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

  // ── Keep callback refs fresh ──
  useEffect(() => {
    onSceneChangeRef.current = onSceneChange;
  }, [onSceneChange]);

  useEffect(() => {
    onReadyRef.current = onReadyWrapper;
  }, [onReadyWrapper]);

  // ── Hooks (all logic delegated) ──

  useCanvasLifecycle(
    canvasElementRef,
    runtimeCanvasRef,
    fabricModuleRef,
    pageSettingsRef,
    lastEditingTextboxRef,
    onSceneChangeRef,
    onReadyRef,
    sanitizedHydratedScene,
    initCanvas,
    pushHistory,
    setActiveObjects,
    setSelectedObject,
  );

  useCanvasNavigation(
    workspaceRef,
    canvasElementRef,
    runtimeCanvasRef,
    zoom,
    setZoom,
    setPan,
  );

  useCanvasDropZone(workspaceRef, runtimeCanvasRef, fabricModuleRef, templateId);

  useCanvasCommands(
    runtimeCanvasRef,
    fabricModuleRef,
    pageSettingsRef,
    onSceneChangeRef,
    pendingCanvasCommand,
    consumeCanvasCommand,
    pushHistory,
    setSelectedObject,
  );

  useCanvasInsertions(
    runtimeCanvasRef,
    fabricModuleRef,
    lastEditingTextboxRef,
    pendingInsertion,
    consumeInsertion,
    pendingAttributeId,
    consumeAttributeInsertion,
    attributes,
    markAttributeInUse,
  );

  useCanvasMode(runtimeCanvasRef, mode, setSelectedObject);

  // ── Context menu close on Escape/click ──
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

  // ── Context menu open handler ──
  const onWorkspaceContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== "edit") {
      return;
    }

    const workspace = workspaceRef.current;
    if (!workspace) {
      return;
    }

    event.preventDefault();

    const canvasRect = canvasElementRef.current?.getBoundingClientRect();

    // Coordenadas relativas a la ventana del navegador para el trigger (fixed positioning)
    const x = event.clientX;
    const y = event.clientY;

    // Coordenadas relativas al canvas para pegar texto
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

    setContextMenu({ x, y, canvasLeft, canvasTop, hasSelection, isLocked });
  };

  const applyZoomFromCenter = useCallback(
    (factor: number) => {
      const nextZoom = Math.min(Math.max(zoom * factor, 0.25), 4);
      setZoom(nextZoom);
    },
    [setZoom, zoom],
  );

  const handleZoomOut = useCallback(() => {
    applyZoomFromCenter(0.9);
  }, [applyZoomFromCenter]);

  const handleZoomIn = useCallback(() => {
    applyZoomFromCenter(1.1);
  }, [applyZoomFromCenter]);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  const handleZoomFitToSheet = useCallback(() => {
    const workspace = workspaceRef.current;
    if (!workspace) {
      return;
    }

    const padding = 48;
    const availableWidth = Math.max(workspace.clientWidth - padding, 200);
    const availableHeight = Math.max(workspace.clientHeight - padding, 200);
    const pageWidth = Math.max(pageSettingsRef.current.width + 24, 1);
    const pageHeight = Math.max(pageSettingsRef.current.height + 24, 1);
    const fitZoom = Math.min(
      Math.max(Math.min(availableWidth / pageWidth, availableHeight / pageHeight), 0.25),
      4,
    );

    setZoom(fitZoom);

    requestAnimationFrame(() => {
      workspace.scrollLeft = Math.max(
        (workspace.scrollWidth - workspace.clientWidth) / 2,
        0,
      );
      workspace.scrollTop = Math.max(
        (workspace.scrollHeight - workspace.clientHeight) / 2,
        0,
      );
    });
  }, [setZoom]);

  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      handleZoomFitToSheet();
    });

    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        handleZoomFitToSheet();
      });
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, [handleZoomFitToSheet]);

  // ── Render ──
  return (
    <div className="relative h-full overflow-hidden">
      <div
        ref={workspaceRef}
        className="flex h-full overflow-auto bg-slate-300 p-10"
        onContextMenu={onWorkspaceContextMenu}
      >
        <div
          className="m-auto"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
        >
          <div className="rounded-xl border border-slate-300 bg-white p-3 shadow-[0_16px_42px_rgba(15,23,42,0.24)]">
            <canvas ref={canvasElementRef} className="block cursor-crosshair" />
          </div>
        </div>
        {mode === "edit" && (
          <FloatingToolbar
            workspaceRef={workspaceRef}
            canvasElementRef={canvasElementRef}
            runtimeCanvasRef={runtimeCanvasRef}
            fabricModuleRef={fabricModuleRef}
            onDuplicate={runtimeActions.duplicate}
            onDelete={runtimeActions.remove}
            isContextMenuOpen={!!contextMenu}
          />
        )}
        {contextMenu ? (
          <CanvasContextMenu
            menu={contextMenu}
            onClose={() => setContextMenu(null)}
            runtimeCanvasRef={runtimeCanvasRef}
            fabricModuleRef={fabricModuleRef}
            contextClipboardRef={contextClipboardRef}
          />
        ) : null}
      </div>

      {mode === "edit" ? (
        <div className="pointer-events-none absolute inset-0 z-30">
          <div className="pointer-events-auto absolute bottom-4 right-4 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleZoomOut}
              aria-label="Alejar"
              title="Alejar"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleZoomReset}
              className="min-w-16"
              title="Restablecer zoom"
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleZoomFitToSheet}
              aria-label="Encajar hoja"
              title="Encajar hoja completa"
            >
              <Scan className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleZoomIn}
              aria-label="Acercar"
              title="Acercar"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
