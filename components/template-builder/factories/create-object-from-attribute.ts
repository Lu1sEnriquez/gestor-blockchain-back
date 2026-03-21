import type { TemplateAttribute } from '@/components/template-builder/types';
import { getFabricExport } from '@/components/template-builder/utils/fabric-helpers';

export function createObjectFromAttribute(
  attribute: TemplateAttribute,
  fabricModule: Record<string, unknown>,
): Record<string, unknown> {
  const Textbox = getFabricExport<
    new (
      text: string,
      options: Record<string, unknown>,
    ) => Record<string, unknown>
  >(fabricModule, 'Textbox');
  const Rect = getFabricExport<
    new (options: Record<string, unknown>) => Record<string, unknown>
  >(fabricModule, 'Rect');

  if (!Textbox || !Rect) {
    throw new Error(
      'No se pudieron resolver Textbox/Rect en Fabric para insertar atributo.',
    );
  }

  const placeholder = `{{${attribute.key}}}`;
  const commonMetadata = {
    isDynamic: true,
    category: attribute.category,
    elementType: (attribute.dataType === 'date'
      ? 'text'
      : attribute.dataType) as 'text' | 'image' | 'qr',
    fieldId: attribute.key,
    placeholder,
    name: attribute.key,
  };

  if (attribute.dataType === 'image') {
    return new Rect({
      left: 120,
      top: 110,
      width: 180,
      height: 220,
      fill: '#f8fafc',
      stroke: '#64748b',
      strokeDashArray: [8, 6],
      ...commonMetadata,
    });
  }

  if (attribute.dataType === 'qr') {
    return new Rect({
      left: 120,
      top: 110,
      width: 120,
      height: 120,
      fill: '#e2e8f0',
      stroke: '#0f172a',
      strokeWidth: 1,
      ...commonMetadata,
    });
  }

  return new Textbox(placeholder, {
    left: 120,
    top: 110,
    width: 520,
    fontSize: attribute.dataType === 'date' ? 18 : 22,
    fill: '#0f172a',
    ...commonMetadata,
  });
}
