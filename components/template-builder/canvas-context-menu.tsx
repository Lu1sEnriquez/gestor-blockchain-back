"use client";

import { useState } from "react";

import type {
  RuntimeCanvas,
} from "@/components/template-builder/types/fabric-runtime";
import type {
  AlignCommand,
  ZOrderCommand,
} from "@/components/template-builder/types";
import { useTemplateBuilderStore } from "@/components/template-builder/store/use-template-builder-store";
import { insertPlainTextIntoCanvas } from "@/components/template-builder/hooks/use-canvas-drop-zone";
import {

  AlignCenterHorizontal,
  
  AlignStartVertical,
  AlignEndVertical,
  AlignCenterVertical,
  
} from "lucide-react";

interface TemplateImageUploadEventDetail {
  file: File;
}

export interface ContextMenuState {
  x: number;
  y: number;
  canvasLeft: number;
  canvasTop: number;
  hasSelection: boolean;
  isLocked: boolean;
}

interface CanvasContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
  runtimeCanvasRef: React.RefObject<RuntimeCanvas | null>;
  fabricModuleRef: React.RefObject<Record<string, unknown> | null>;
  contextClipboardRef: React.MutableRefObject<Record<string, unknown> | null>;
}

export function CanvasContextMenu({
  menu,
  onClose,
  runtimeCanvasRef,
  fabricModuleRef,
  contextClipboardRef,
}: CanvasContextMenuProps) {
  const [alignOpen, setAlignOpen] = useState(false);
  const [alignSubmenuPosition, setAlignSubmenuPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const openAlignSubmenu = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return;

    const rect = target.getBoundingClientRect();
    const submenuWidth = 224;
    const gap = 8;

    const openToLeft = rect.right + gap + submenuWidth > window.innerWidth;
    const left = openToLeft
      ? Math.max(8, rect.left - gap - submenuWidth)
      : rect.right + gap;

    setAlignSubmenuPosition({
      left,
      top: Math.max(8, rect.top),
    });
    setAlignOpen(true);
  };

  const closeAlignSubmenu = () => {
    setAlignOpen(false);
    setAlignSubmenuPosition(null);
  };

  const onContextCopy = () => {
    const canvas = runtimeCanvasRef.current;
    const active = canvas?.getActiveObject() as
      | Record<string, unknown>
      | null
      | undefined;
    if (!active) return;
    contextClipboardRef.current = active;
    onClose();
  };

  const onContextDuplicate = async () => {
    onClose();
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
    onClose();
    useTemplateBuilderStore
      .getState()
      .queueCanvasCommand({ type: "align", value });
  };

  const onContextZOrder = (value: ZOrderCommand) => {
    onClose();
    useTemplateBuilderStore
      .getState()
      .queueCanvasCommand({ type: "z-order", value });
  };

  const onContextLock = () => {
    onClose();
    useTemplateBuilderStore
      .getState()
      .queueCanvasCommand({ type: "toggle-lock" });
  };

  const onContextDelete = () => {
    onClose();
    const canvas = runtimeCanvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.remove(active as Record<string, unknown>);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  };

  const onPasteImageFromContextMenu = async () => {
    onClose();

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
    const menuState = menu;
    onClose();

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

  return (
    <div
      className="absolute z-50 min-w-52 select-none rounded-md border border-slate-200 bg-white p-1 shadow-xl"
      style={{ left: menu.x, top: menu.y }}
      onClick={(event) => event.stopPropagation()}
    >
      {menu.hasSelection ? (
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
          <div className="relative w-full">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
              // onMouseEnter={(event) => openAlignSubmenu(event.currentTarget)}
              // onFocus={(event) => openAlignSubmenu(event.currentTarget)}
              onClick={(event) => {
                if (alignOpen) {
                  closeAlignSubmenu();
                  return;
                }
                openAlignSubmenu(event.currentTarget);
              }}
            >
              <span>Alinear elementos</span>
              <span className="text-slate-400">▸</span>
            </button>
          </div>

          {alignOpen && alignSubmenuPosition && (
            <div
              className="fixed z-60 min-w-52 rounded-md border border-slate-200 bg-white p-1 shadow-xl"
              style={{
                left: alignSubmenuPosition.left,
                top: alignSubmenuPosition.top,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              {(
                [
                  {
                    label: "Izquierda",
                    value: "left",
                    icon: AlignStartVertical,
                  },
                  {
                    label: "Centrar vertical",
                    value: "center-horizontal",
                    icon: AlignCenterVertical,
                  },
                  { label: "Derecha", value: "right", icon: AlignEndVertical },
                  { label: "Arriba", value: "top", icon: AlignStartVertical },
                  {
                    label: "Centrar horizontal",
                    value: "center-vertical",
                    icon: AlignCenterHorizontal,
                  },
                  { label: "Abajo", value: "bottom", icon: AlignEndVertical },
                ] as const
              ).map(({ label, value, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    closeAlignSubmenu();
                    onContextAlign(value);
                  }}
                  title={label}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
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
            <span>{menu.isLocked ? "Desbloquear" : "Bloquear"}</span>
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
  );
}
