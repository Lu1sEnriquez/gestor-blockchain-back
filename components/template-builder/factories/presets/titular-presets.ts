import type { PresetFactory } from '@/components/template-builder/factories/preset-registry';

export const titularTexto: PresetFactory = ({ Textbox, centered }) =>
  new Textbox('{{nombre_completo}}', {
    ...centered,
    width: 520,
    fontSize: 24,
    fill: '#0f172a',
    isDynamic: true,
    category: 'titular',
    elementType: 'text',
    fieldId: 'nombre_completo',
    placeholder: '{{nombre_completo}}',
  });

export const titularImagen: PresetFactory = ({ Rect, centered }) =>
  new Rect({
    ...centered,
    width: 200,
    height: 200,
    fill: '#f8fafc',
    stroke: '#64748b',
    strokeDashArray: [8, 6],
    isDynamic: true,
    category: 'titular',
    elementType: 'image',
    fieldId: 'foto_perfil',
    placeholder: '{{foto_perfil}}',
  });
