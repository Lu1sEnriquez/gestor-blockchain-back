export type ElementCategory = 'plantilla' | 'evento' | 'titular' | 'sistema';

export type ElementType = 'text' | 'image' | 'signature_block' | 'qr' | 'shape';

export type TemplateBuilderSidebarSection =
  | 'plantillas'
  | 'subidas'
  | 'elementos'
  | 'texto'
  | 'atributos'
  | 'codigos-qr'
  | 'capas';

export type PageFormat = 'a4' | 'letter' | 'oficio' | 'custom';

export type PageOrientation = 'portrait' | 'landscape';

export type PageUnit = 'px' | 'mm';

export interface TemplatePageSettings {
  format: PageFormat;
  orientation: PageOrientation;
  unit: PageUnit;
  width: number;
  height: number;
}

export type AlignCommand = 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom';

export type ZOrderCommand = 'front' | 'back' | 'forward' | 'backward';

export interface TextStyleChanges {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  fill?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

export interface ObjectGeometryChanges {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

export interface ObjectAppearanceChanges {
  stroke?: string;
  strokeWidth?: number;
  strokeDashArray?: number[] | null;
  opacity?: number;
  fill?: string;
}

export interface ObjectMetadataChanges {
  fieldId?: string;
}

export type CanvasCommand =
  | { type: 'align'; value: AlignCommand }
  | { type: 'z-order'; value: ZOrderCommand }
  | { type: 'toggle-lock' }
  | { type: 'apply-text-style'; value: TextStyleChanges }
  | { type: 'set-page'; value: Partial<TemplatePageSettings> }
  | { type: 'set-geometry'; value: ObjectGeometryChanges }
  | { type: 'set-appearance'; value: ObjectAppearanceChanges }
  | { type: 'set-metadata'; value: ObjectMetadataChanges }
  | { type: 'set-background-image'; value: { url: string | null } };

export interface FabricCustomMetadata {
  isDynamic: boolean;
  category: ElementCategory;
  elementType: ElementType;
  fieldId: string;
  placeholder?: string;
  assetId?: string;
}

export interface FabricTemplateObject extends FabricCustomMetadata {
  id: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
  angle?: number;
  text?: string;
  src?: string;
  fill?: string;
  fontSize?: number;
  fontWeight?: string | number;
}

export interface FabricTemplateScene {
  [key: string]: unknown;
  version?: string;
  objects: Array<Record<string, unknown>>;
  background?: string;
  backgroundColor?: string;
  page?: TemplatePageSettings;
}

export interface SelectedObjectState {
  id: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  metadata?: Partial<FabricCustomMetadata>;
  fabricType?: string;
  text?: string;
  fill?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  stroke?: string;
  strokeWidth?: number;
  strokeDashArray?: number[] | null;
  opacity?: number;
  locked?: boolean;
}

export type InsertionPreset =
  | 'plantilla-titulo'
  | 'plantilla-subtitulo'
  | 'plantilla-parrafo'
  | 'plantilla-texto'
  | 'plantilla-forma'
  | 'evento-texto'
  | 'evento-firma'
  | 'titular-texto'
  | 'titular-imagen'
  | 'sistema-qr'
  | 'sistema-folio';

export type AttributeDataType = 'text' | 'date' | 'image' | 'qr';

export interface TemplateAttribute {
  id: string;
  key: string;
  label: string;
  category: Extract<ElementCategory, 'evento' | 'titular' | 'sistema'>;
  dataType: AttributeDataType;
  inUse?: boolean;
  custom?: boolean;
}

export interface FabricSerializeOptions {
  includeSystemMetadata?: boolean;
}

export const FABRIC_METADATA_KEYS: string[] = [
  'isDynamic',
  'category',
  'elementType',
  'fieldId',
  'placeholder',
  'assetId',
  'name',
];
