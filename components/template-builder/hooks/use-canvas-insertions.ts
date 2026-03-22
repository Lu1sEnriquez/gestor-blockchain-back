import { useEffect } from 'react';
import type { RuntimeCanvas } from '@/components/template-builder/types/fabric-runtime';
import type { TemplateAttribute, InsertionPreset } from '@/components/template-builder/types';
import { createObjectByPreset } from '@/components/template-builder/factories/create-object-by-preset';
import { createObjectFromAttribute } from '@/components/template-builder/factories/create-object-from-attribute';

/**
 * Consumes pendingInsertion (sidebar preset clicks) and
 * pendingAttributeId (attribute drag/click insertions).
 */
export function useCanvasInsertions(
  runtimeCanvasRef: React.RefObject<RuntimeCanvas | null>,
  fabricModuleRef: React.RefObject<Record<string, unknown> | null>,
  lastEditingTextboxRef: React.RefObject<Record<string, unknown> | null>,
  pendingInsertion: InsertionPreset | null,
  consumeInsertion: () => void,
  pendingAttributeId: string | null,
  consumeAttributeInsertion: () => void,
  attributes: TemplateAttribute[],
  markAttributeInUse: (attributeId: string) => void,
) {
  // Handle preset insertions
  useEffect(() => {
    if (!pendingInsertion) {
      return;
    }

    const runtimeCanvas = runtimeCanvasRef.current;
    const fabricModule = fabricModuleRef.current;

    if (!runtimeCanvas || !fabricModule) {
      consumeInsertion();
      return;
    }

    const obj = createObjectByPreset(
      pendingInsertion,
      fabricModule,
      runtimeCanvas,
    );
    runtimeCanvas.add(obj);
    runtimeCanvas.setActiveObject(obj);
    runtimeCanvas.requestRenderAll();
    consumeInsertion();
  }, [runtimeCanvasRef, fabricModuleRef, consumeInsertion, pendingInsertion]);

  // Handle attribute insertions
  useEffect(() => {
    if (!pendingAttributeId) {
      return;
    }

    const runtimeCanvas = runtimeCanvasRef.current;
    const fabricModule = fabricModuleRef.current;
    const attribute = attributes.find(
      (entry) => entry.id === pendingAttributeId,
    );

    if (!runtimeCanvas || !attribute) {
      consumeAttributeInsertion();
      return;
    }

    // Try the textbox that was being edited first, then fall back to the active object
    const editingTextbox = lastEditingTextboxRef.current;
    const activeObj = runtimeCanvas.getActiveObject() as Record<string, unknown> | null;
    const textTarget = editingTextbox ?? activeObj;

    if (
      textTarget &&
      (textTarget as { isEditing?: boolean }).isEditing === true &&
      typeof (textTarget as { insertChars?: unknown }).insertChars === 'function'
    ) {
      // Textbox is actively in editing mode — insert at cursor
      const placeholder = `{{${attribute.key}}}`;
      (textTarget as { insertChars: (text: string) => void }).insertChars(placeholder);
      runtimeCanvas.requestRenderAll();
      markAttributeInUse(attribute.id);
      consumeAttributeInsertion();
      return;
    }

    // Active object is a Textbox but NOT in editing mode — append placeholder to its text
    if (
      activeObj &&
      typeof (activeObj as { type?: string }).type === 'string' &&
      ((activeObj as { type: string }).type.toLowerCase().includes('text') ||
        (activeObj as { type: string }).type.toLowerCase().includes('itext'))
    ) {
      const currentText = String((activeObj as { text?: string }).text ?? '');
      const placeholder = `{{${attribute.key}}}`;
      if (typeof (activeObj as { set?: unknown }).set === 'function') {
        (activeObj as { set: (props: Record<string, unknown>) => void }).set({
          text: currentText + placeholder,
        });
      }
      (activeObj as { setCoords?: () => void }).setCoords?.();
      runtimeCanvas.requestRenderAll();
      markAttributeInUse(attribute.id);
      consumeAttributeInsertion();
      return;
    }

    // No active text editing — create a new element
    if (!fabricModule) {
      consumeAttributeInsertion();
      return;
    }

    const obj = createObjectFromAttribute(attribute, fabricModule);
    runtimeCanvas.add(obj);
    runtimeCanvas.setActiveObject(obj);
    runtimeCanvas.requestRenderAll();
    markAttributeInUse(attribute.id);
    consumeAttributeInsertion();
  }, [
    runtimeCanvasRef,
    fabricModuleRef,
    lastEditingTextboxRef,
    attributes,
    consumeAttributeInsertion,
    markAttributeInUse,
    pendingAttributeId,
  ]);
}
