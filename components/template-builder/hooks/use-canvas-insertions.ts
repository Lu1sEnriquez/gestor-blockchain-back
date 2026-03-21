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

    // If a Textbox was being edited, insert the placeholder into it
    const editingTextbox = lastEditingTextboxRef.current;
    if (
      editingTextbox &&
      typeof (editingTextbox as { insertChars?: unknown }).insertChars ===
        'function'
    ) {
      const placeholder = `{{${attribute.key}}}`;
      (editingTextbox as { insertChars: (text: string) => void }).insertChars(
        placeholder,
      );
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
