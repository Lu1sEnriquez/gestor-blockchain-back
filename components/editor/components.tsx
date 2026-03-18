'use client';

import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { cn } from '@/lib/utils';
import type {
  ContainerProps,
  TextProps,
  ImageProps,
  DividerProps,
  SpacerProps,
} from './types';

// ============================================
// CONTAINER COMPONENT
// ============================================

export function Container({
  background = '#ffffff',
  padding = 20,
  children,
}: ContainerProps) {
  const {
    connectors: { connect, drag },
    selected,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        background,
        padding,
        minHeight: '100px',
      }}
      className={cn(
        'relative transition-all',
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {children}
    </div>
  );
}

Container.craft = {
  displayName: 'Contenedor',
  props: {
    background: '#ffffff',
    padding: 20,
  },
  rules: {
    canDrag: () => true,
  },
};

// ============================================
// TEXT COMPONENT
// ============================================

export function Text({
  text = 'Texto de ejemplo',
  fontSize = 16,
  fontWeight = 'normal',
  textAlign = 'left',
  color = '#000000',
  isVariable = false,
  variableName = '',
}: TextProps) {
  const {
    connectors: { connect, drag },
    selected,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const displayText = isVariable && variableName ? `{{${variableName}}}` : text;

  return (
    <p
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        fontSize,
        fontWeight,
        textAlign,
        color: isVariable ? '#6366f1' : color,
      }}
      className={cn(
        'cursor-move transition-all',
        selected && 'ring-2 ring-primary ring-offset-2',
        isVariable && 'font-mono'
      )}
    >
      {displayText}
    </p>
  );
}

Text.craft = {
  displayName: 'Texto',
  props: {
    text: 'Texto de ejemplo',
    fontSize: 16,
    fontWeight: 'normal',
    textAlign: 'left',
    color: '#000000',
    isVariable: false,
    variableName: '',
  },
  rules: {
    canDrag: () => true,
  },
};

// ============================================
// HEADING COMPONENT
// ============================================

export function Heading({
  text = 'Titulo',
  fontSize = 24,
  fontWeight = 'bold',
  textAlign = 'center',
  color = '#000000',
  isVariable = false,
  variableName = '',
}: TextProps) {
  const {
    connectors: { connect, drag },
    selected,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const displayText = isVariable && variableName ? `{{${variableName}}}` : text;

  return (
    <h2
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        fontSize,
        fontWeight,
        textAlign,
        color: isVariable ? '#6366f1' : color,
      }}
      className={cn(
        'cursor-move transition-all',
        selected && 'ring-2 ring-primary ring-offset-2',
        isVariable && 'font-mono'
      )}
    >
      {displayText}
    </h2>
  );
}

Heading.craft = {
  displayName: 'Titulo',
  props: {
    text: 'Titulo',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000000',
    isVariable: false,
    variableName: '',
  },
  rules: {
    canDrag: () => true,
  },
};

// ============================================
// IMAGE COMPONENT
// ============================================

export function ImageBlock({
  src = '/placeholder.svg?height=150&width=200',
  alt = 'Imagen',
  width = 200,
  height = 150,
  isVariable = false,
  variableName = '',
}: ImageProps) {
  const {
    connectors: { connect, drag },
    selected,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      className={cn(
        'inline-block cursor-move transition-all',
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {isVariable ? (
        <div
          style={{ width, height }}
          className="flex items-center justify-center border-2 border-dashed border-indigo-400 bg-indigo-50 font-mono text-indigo-600"
        >
          {`{{${variableName || 'imagen'}}}`}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="object-contain"
          crossOrigin="anonymous"
        />
      )}
    </div>
  );
}

ImageBlock.craft = {
  displayName: 'Imagen',
  props: {
    src: '/placeholder.svg?height=150&width=200',
    alt: 'Imagen',
    width: 200,
    height: 150,
    isVariable: false,
    variableName: '',
  },
  rules: {
    canDrag: () => true,
  },
};

// ============================================
// DIVIDER COMPONENT
// ============================================

export function Divider({
  thickness = 1,
  color = '#e5e7eb',
  margin = 16,
}: DividerProps) {
  const {
    connectors: { connect, drag },
    selected,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  return (
    <hr
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        borderTopWidth: thickness,
        borderColor: color,
        marginTop: margin,
        marginBottom: margin,
      }}
      className={cn(
        'cursor-move transition-all',
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    />
  );
}

Divider.craft = {
  displayName: 'Separador',
  props: {
    thickness: 1,
    color: '#e5e7eb',
    margin: 16,
  },
  rules: {
    canDrag: () => true,
  },
};

// ============================================
// SPACER COMPONENT
// ============================================

export function Spacer({ height = 20 }: SpacerProps) {
  const {
    connectors: { connect, drag },
    selected,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{ height }}
      className={cn(
        'cursor-move bg-muted/30 transition-all',
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    />
  );
}

Spacer.craft = {
  displayName: 'Espaciador',
  props: {
    height: 20,
  },
  rules: {
    canDrag: () => true,
  },
};

// ============================================
// CANVAS (ROOT) COMPONENT
// ============================================

interface CanvasProps {
  children?: React.ReactNode;
  background?: string;
  padding?: number;
}

export function Canvas({
  children,
  background = '#ffffff',
  padding = 40,
}: CanvasProps) {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => ref && connect(ref)}
      style={{
        background,
        padding,
        minHeight: '842px', // A4 height in pixels at 72dpi
        width: '595px', // A4 width in pixels at 72dpi
      }}
      className="mx-auto shadow-lg"
    >
      {children}
    </div>
  );
}

Canvas.craft = {
  displayName: 'Documento',
  props: {
    background: '#ffffff',
    padding: 40,
  },
  rules: {
    canDrag: () => false,
  },
};
