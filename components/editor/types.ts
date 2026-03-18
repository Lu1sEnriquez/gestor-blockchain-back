// Craft.js editor types

export interface ContainerProps {
  background?: string;
  padding?: number;
  children?: React.ReactNode;
}

export interface TextProps {
  text: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  isVariable?: boolean;
  variableName?: string;
}

export interface ImageProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  isVariable?: boolean;
  variableName?: string;
}

export interface DividerProps {
  thickness?: number;
  color?: string;
  margin?: number;
}

export interface SpacerProps {
  height?: number;
}

export interface VariableFieldProps {
  variableName: string;
  label: string;
  defaultValue?: string;
}

// Template variable definition
export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'date' | 'image' | 'number';
  defaultValue?: string;
  required?: boolean;
}

// Craft schema type
export interface CraftSchema {
  ROOT: {
    type: { resolvedName: string };
    isCanvas: boolean;
    props: Record<string, unknown>;
    displayName: string;
    custom: Record<string, unknown>;
    nodes: string[];
  };
  [key: string]: unknown;
}
