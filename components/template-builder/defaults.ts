import type {
  FabricTemplateScene,
  TemplateAttribute,
  TemplatePageSettings,
  TemplateBuilderSidebarSection,
} from '@/components/template-builder/types';

export const DEFAULT_TEMPLATE_PAGE_SETTINGS: TemplatePageSettings = {
  format: 'a4',
  orientation: 'landscape',
  unit: 'px',
  width: 1123,
  height: 794,
};

export const TEMPLATE_BUILDER_SECTIONS: Array<{
  id: TemplateBuilderSidebarSection;
  label: string;
}> = [
  { id: 'plantillas', label: 'Plantillas' },
  { id: 'subidas', label: 'Subidas' },
  { id: 'elementos', label: 'Elementos' },
  { id: 'texto', label: 'Texto' },
  { id: 'atributos', label: 'Atributos' },
  { id: 'codigos-qr', label: 'Codigos QR' },
  { id: 'capas', label: 'Capas' },
];

export const DEFAULT_TEMPLATE_ATTRIBUTES: TemplateAttribute[] = [
  // --- SISTEMA (fijos, no editables por usuario) ---
  {
    id: 'attr-folio',
    key: 'folio',
    label: 'UUID / Folio Institucional',
    category: 'sistema',
    dataType: 'text',
  },
  {
    id: 'attr-qr-web3',
    key: 'qr_web3',
    label: 'Codigo QR (Web3)',
    category: 'sistema',
    dataType: 'qr',
  },
  {
    id: 'attr-fecha-corta',
    key: 'fecha_corta',
    label: 'Fecha Corta (19/03/2026)',
    category: 'sistema',
    dataType: 'date',
  },
  {
    id: 'attr-fecha-larga',
    key: 'fecha_larga',
    label: 'Fecha Larga (19 de Marzo de 2026)',
    category: 'sistema',
    dataType: 'date',
  },
  {
    id: 'attr-fecha-timestamp',
    key: 'fecha_timestamp',
    label: 'Fecha y Hora (19/03/2026 19:28:48)',
    category: 'sistema',
    dataType: 'date',
  },
  // --- EVENTO (extensibles + firma fija) ---
  {
    id: 'attr-nombre-evento',
    key: 'nombre_evento',
    label: 'Nombre del evento',
    category: 'evento',
    dataType: 'text',
  },
  // --- TITULAR (100% extensibles) ---
  {
    id: 'attr-nombre-completo',
    key: 'nombre_completo',
    label: 'Nombre del destinatario',
    category: 'titular',
    dataType: 'text',
    inUse: true,
  },
];

export const DEFAULT_FABRIC_SCENE: FabricTemplateScene = {
  backgroundColor: '#ffffff',
  page: DEFAULT_TEMPLATE_PAGE_SETTINGS,
  objects: [
    {
      type: 'Textbox',
      left: 220,
      top: 120,
      width: 680,
      text: 'Titulo del documento',
      fontSize: 34,
      fontWeight: '700',
      fontFamily: 'sans-serif',
      fontStyle: 'normal',
      textAlign: 'center',
      fill: '#0f172a',
      styles: {},
      splitByGrapheme: false,
      isDynamic: false,
      category: 'plantilla',
      elementType: 'text',
      fieldId: 'titulo_documento',
      placeholder: '{{titulo_documento}}',
      name: 'titulo_documento',
    },
    {
      type: 'Textbox',
      left: 220,
      top: 220,
      width: 680,
      text: 'Nombre del titular',
      fontSize: 22,
      fontFamily: 'sans-serif',
      fontStyle: 'normal',
      textAlign: 'center',
      fill: '#334155',
      styles: {},
      splitByGrapheme: false,
      isDynamic: true,
      category: 'titular',
      elementType: 'text',
      fieldId: 'nombre_completo',
      placeholder: '{{nombre_completo}}',
      name: 'nombre_completo',
    },
  ],
};
