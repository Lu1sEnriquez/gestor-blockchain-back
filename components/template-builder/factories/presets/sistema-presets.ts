import type { PresetFactory } from '@/components/template-builder/factories/preset-registry';

export const sistemaQr: PresetFactory = ({ Rect, centered }) =>
  new Rect({
    ...centered,
    width: 120,
    height: 120,
    fill: '#e2e8f0',
    stroke: '#0f172a',
    strokeWidth: 1,
    isDynamic: true,
    category: 'sistema',
    elementType: 'qr',
    fieldId: 'qr_web3',
    placeholder: '{{qr_web3}}',
  });

export const sistemaFolio: PresetFactory = ({ Textbox, centered }) =>
  new Textbox('{{folio}}', {
    ...centered,
    width: 420,
    fontSize: 16,
    fill: '#0f172a',
    isDynamic: true,
    category: 'sistema',
    elementType: 'text',
    fieldId: 'folio',
    placeholder: '{{folio}}',
  });
