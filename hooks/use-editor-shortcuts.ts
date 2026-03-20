'use client';

import { useEffect, useRef } from 'react';
import { useTemplateBuilderStore } from '@/components/template-builder/store/use-template-builder-store';

type RuntimeCanvasObject = Record<string, unknown> & {
  clone?: ((callback: (cloned: Record<string, unknown>) => void) => void) | (() => Promise<Record<string, unknown>>);
  set?: (values: Record<string, unknown>) => void;
  setCoords?: () => void;
  toActiveSelection?: () => Record<string, unknown>;
};

type RuntimeCanvas = {
  add: (...objects: Record<string, unknown>[]) => void;
  remove: (object: Record<string, unknown>) => void;
  getActiveObject: () => RuntimeCanvasObject | null;
  getActiveObjects?: () => RuntimeCanvasObject[];
  setActiveObject: (object: Record<string, unknown>) => void;
  discardActiveObject: () => void;
  requestRenderAll: () => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  return target.isContentEditable;
}

async function cloneObject(source: RuntimeCanvasObject): Promise<RuntimeCanvasObject | null> {
  const clone = source.clone;
  if (!clone || typeof clone !== 'function') {
    return null;
  }

  if (clone.length === 0) {
    try {
      const cloned = await (clone as () => Promise<Record<string, unknown>>)();
      return cloned as RuntimeCanvasObject;
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    try {
      (clone as (callback: (cloned: Record<string, unknown>) => void) => void)((cloned) => {
        resolve(cloned as RuntimeCanvasObject);
      });
    } catch {
      resolve(null);
    }
  });
}

export function useEditorShortcuts() {
  const canvas = useTemplateBuilderStore((state) => state.canvas) as RuntimeCanvas | null;
  const activeObjects = useTemplateBuilderStore((state) => state.activeObjects) as RuntimeCanvasObject[];
  const undo = useTemplateBuilderStore((state) => state.undo);
  const redo = useTemplateBuilderStore((state) => state.redo);

  const clipboardRef = useRef<RuntimeCanvasObject[]>([]);
  const pasteOffsetRef = useRef(0);

  useEffect(() => {
    const onKeyDown = async (event: KeyboardEvent) => {
      if (!canvas) {
        return;
      }

      const editableTarget = isEditableTarget(event.target);
      const commandKey = event.ctrlKey || event.metaKey;

      if ((event.key === 'Delete' || event.key === 'Backspace') && !editableTarget) {
        event.preventDefault();
        const selected = activeObjects.length > 0
          ? activeObjects
          : canvas.getActiveObject()
            ? [canvas.getActiveObject() as RuntimeCanvasObject]
            : [];

        selected.forEach((entry) => canvas.remove(entry));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        return;
      }

      if (!commandKey) {
        return;
      }

      if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
        event.preventDefault();
        redo();
        return;
      }

      if (editableTarget) {
        return;
      }

      if (event.key.toLowerCase() === 'c') {
        event.preventDefault();
        const selected = activeObjects.length > 0
          ? activeObjects
          : canvas.getActiveObject()
            ? [canvas.getActiveObject() as RuntimeCanvasObject]
            : [];

        const cloned = await Promise.all(selected.map((entry) => cloneObject(entry)));
        clipboardRef.current = cloned.filter((entry): entry is RuntimeCanvasObject => Boolean(entry));
        pasteOffsetRef.current = 0;
        return;
      }

      if (event.key.toLowerCase() === 'v') {
        if (clipboardRef.current.length === 0) {
          // Permite que el pegado nativo procese imagenes desde el portapapeles.
          return;
        }

        event.preventDefault();

        pasteOffsetRef.current += 18;
        const pasted: RuntimeCanvasObject[] = [];

        for (const entry of clipboardRef.current) {
          const cloned = await cloneObject(entry);
          if (!cloned) {
            continue;
          }

          const nextLeft = Number((cloned.left as number | undefined) ?? 0) + pasteOffsetRef.current;
          const nextTop = Number((cloned.top as number | undefined) ?? 0) + pasteOffsetRef.current;
          cloned.set?.({ left: nextLeft, top: nextTop });
          cloned.setCoords?.();
          canvas.add(cloned);
          pasted.push(cloned);
        }

        if (pasted[0]) {
          canvas.setActiveObject(pasted[0]);
        }
        canvas.requestRenderAll();
        return;
      }

      if (event.key.toLowerCase() === 'g' && !event.shiftKey) {
        event.preventDefault();
        const active = canvas.getActiveObject() as RuntimeCanvasObject | null;
        const toGroup = active && typeof (active as { toGroup?: () => Record<string, unknown> }).toGroup === 'function'
          ? (active as { toGroup: () => Record<string, unknown> }).toGroup
          : undefined;
        if (toGroup) {
          const group = toGroup();
          canvas.setActiveObject(group);
          canvas.requestRenderAll();
        }
        return;
      }

      if (event.key.toLowerCase() === 'g' && event.shiftKey) {
        event.preventDefault();
        const active = canvas.getActiveObject() as RuntimeCanvasObject | null;
        if (!active || typeof active.toActiveSelection !== 'function') {
          return;
        }
        const selection = active.toActiveSelection();
        canvas.setActiveObject(selection);
        canvas.requestRenderAll();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeObjects, canvas, redo, undo]);
}
