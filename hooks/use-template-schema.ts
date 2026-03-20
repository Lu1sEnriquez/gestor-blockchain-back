'use client';

import { useMemo } from 'react';
import type { Template } from '@/lib/types';

export type EventoFieldType = 'text' | 'image' | 'signature_block';

export interface EventoField {
  fieldId: string;
  label: string;
  fieldType: EventoFieldType;
  placeholder?: string;
}

export function useTemplateSchema(template: Template | undefined) {
  return useMemo(() => {
    const schema =
      (template?.fabricSchemaJson as Record<string, unknown> | undefined) ??
      (template?.craftSchemaJson as Record<string, unknown> | undefined);

    const rawObjects = Array.isArray(
      (schema as { objects?: unknown })?.objects
    )
      ? (schema as { objects: Array<Record<string, unknown>> }).objects
      : [];

    const eventoFields: EventoField[] = [];
    const seen = new Set<string>();

    for (const obj of rawObjects) {
      if (obj.category !== 'evento') continue;

      const fieldId =
        typeof obj.fieldId === 'string' && obj.fieldId ? obj.fieldId : null;
      if (!fieldId || seen.has(fieldId)) continue;
      seen.add(fieldId);

      const elementType = typeof obj.elementType === 'string' ? obj.elementType : '';
      let fieldType: EventoFieldType = 'text';
      if (elementType === 'image') fieldType = 'image';
      else if (elementType === 'signature_block') fieldType = 'signature_block';

      const label = fieldId
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      eventoFields.push({
        fieldId,
        label,
        fieldType,
        placeholder: typeof obj.placeholder === 'string' ? obj.placeholder : undefined,
      });
    }

    return {
      eventoFields,
      hasEventoFields: eventoFields.length > 0,
      textFields: eventoFields.filter((f) => f.fieldType === 'text'),
      imageFields: eventoFields.filter((f) => f.fieldType === 'image'),
      signatureBlocks: eventoFields.filter((f) => f.fieldType === 'signature_block'),
    };
  }, [template]);
}
