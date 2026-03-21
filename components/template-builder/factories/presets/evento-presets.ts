import type { PresetFactory } from '@/components/template-builder/factories/preset-registry';

export const eventoTexto: PresetFactory = ({ Textbox, centered }) =>
  new Textbox('{{nombre_evento}}', {
    ...centered,
    width: 520,
    fontSize: 20,
    fill: '#1e293b',
    isDynamic: true,
    category: 'evento',
    elementType: 'text',
    fieldId: 'nombre_evento',
    placeholder: '{{nombre_evento}}',
  });

export const eventoFirma: PresetFactory = ({ Textbox, Rect, Group, Line, centered }) => {
  const componentWidth = 200;
  const centerX = componentWidth / 2;

  // 1. Configuración de alturas y espaciado
  const boxHeight = 100;
  const lineY = boxHeight / 2 + 10;
  const nameY = lineY + 10;
  const nameFontSize = 15;
  const roleFontSize = 12;
  const roleY = nameY + nameFontSize + 1;

  const totalHeight = roleY + roleFontSize;
  const offsetY = -(totalHeight / 2);

  // 2. Caja de firma punteada
  const signatureBox = new Rect({
    top: offsetY,
    width: 120,
    height: boxHeight,
    fill: '#f8fafc',
    stroke: '#94a3b8',
    strokeDashArray: [6, 4],
    selectable: false,
    evented: false,
  });

  // 3. Etiqueta, Línea y Textos
  const signatureLabel = new Textbox('Espacio de firma', {
    top: offsetY + boxHeight / 2 - 6,
    width: componentWidth,
    fontSize: 10,
    fill: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
    selectable: false,
    evented: false,
  });

  const line = new Line([0, 0, componentWidth, 0], {
    left: 0,
    top: offsetY + lineY,
    stroke: '#334155',
    strokeWidth: 1.2,
    selectable: false,
    evented: false,
  });

  const name = new Textbox('{{nombre}}', {
    top: offsetY + nameY,
    width: componentWidth,
    fontSize: nameFontSize,
    fontWeight: 'bold',
    fill: '#0f172a',
    textAlign: 'center',
  });

  const role = new Textbox('{{cargo}}', {
    top: offsetY + roleY,
    width: componentWidth,
    fontSize: roleFontSize,
    fill: '#64748b',
    textAlign: 'center',
  });

  return new Group([signatureBox, signatureLabel, line, name, role], {
    ...centered,
    isDynamic: true,
    category: 'evento',
    elementType: 'signature_block',
    fieldId: 'firma_1',
    placeholder: '{{firma_1}}',
    originX: 'center',
    originY: 'center',
  });
};
