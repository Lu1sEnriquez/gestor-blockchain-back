import type { InsertionPreset } from '@/components/template-builder/types';
import type { RuntimeCanvas } from '@/components/template-builder/types/fabric-runtime';
import { getFabricExport } from '@/components/template-builder/utils/fabric-helpers';
import { getPresetFactory } from '@/components/template-builder/factories/preset-registry';

export function createObjectByPreset(
  preset: InsertionPreset,
  fabricModule: Record<string, unknown>,
  canvas?: RuntimeCanvas,
): Record<string, unknown> {
  const Textbox = getFabricExport<
    new (text: string, options: Record<string, unknown>) => Record<string, unknown>
  >(fabricModule, 'Textbox');
  const Rect = getFabricExport<
    new (options: Record<string, unknown>) => Record<string, unknown>
  >(fabricModule, 'Rect');
  const Group = getFabricExport<
    new (
      objects: Array<Record<string, unknown>>,
      options: Record<string, unknown>,
    ) => Record<string, unknown>
  >(fabricModule, 'Group');
  const Line = getFabricExport<
    new (points: number[], options: Record<string, unknown>) => Record<string, unknown>
  >(fabricModule, 'Line');

  if (!Textbox || !Rect || !Group || !Line) {
    throw new Error(
      'No se pudieron resolver las clases base de Fabric (Textbox/Rect/Group/Line).',
    );
  }

  // All new objects are placed at canvas center
  const cx = canvas ? canvas.getWidth() / 2 : 560;
  const cy = canvas ? canvas.getHeight() / 2 : 400;
  const centered = { left: cx, top: cy, originX: 'center', originY: 'center' };

  const factory = getPresetFactory(preset);
  if (factory) {
    return factory({ Textbox, Rect, Group, Line, centered });
  }

  // Fallback for unknown presets
  return new Textbox('Elemento', { ...centered });
}
