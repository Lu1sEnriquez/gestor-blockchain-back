'use client';

import { useEditor, Element } from '@craftjs/core';
import {
  Type,
  Heading1,
  Image,
  Minus,
  Square,
  SeparatorHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text, Heading, ImageBlock, Divider, Spacer, Container } from './components';

interface ToolboxItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function ToolboxItem({ icon, label, onClick }: ToolboxItemProps) {
  return (
    <Button
      variant="outline"
      className="flex h-auto flex-col gap-1 py-3"
      onClick={onClick}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );
}

export function Toolbox() {
  const { connectors } = useEditor();

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Componentes</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        <div
          ref={(ref) =>
            ref &&
            connectors.create(ref, <Text text="Texto de ejemplo" />)
          }
        >
          <ToolboxItem
            icon={<Type className="h-5 w-5" />}
            label="Texto"
            onClick={() => {}}
          />
        </div>

        <div
          ref={(ref) =>
            ref && connectors.create(ref, <Heading text="Titulo" />)
          }
        >
          <ToolboxItem
            icon={<Heading1 className="h-5 w-5" />}
            label="Titulo"
            onClick={() => {}}
          />
        </div>

        <div
          ref={(ref) =>
            ref && connectors.create(ref, <ImageBlock />)
          }
        >
          <ToolboxItem
            icon={<Image className="h-5 w-5" />}
            label="Imagen"
            onClick={() => {}}
          />
        </div>

        <div
          ref={(ref) => ref && connectors.create(ref, <Divider />)}
        >
          <ToolboxItem
            icon={<Minus className="h-5 w-5" />}
            label="Separador"
            onClick={() => {}}
          />
        </div>

        <div
          ref={(ref) => ref && connectors.create(ref, <Spacer />)}
        >
          <ToolboxItem
            icon={<SeparatorHorizontal className="h-5 w-5" />}
            label="Espaciador"
            onClick={() => {}}
          />
        </div>

        <div
          ref={(ref) =>
            ref &&
            connectors.create(
              ref,
              <Element canvas is={Container}>
                <Text text="Contenedor" />
              </Element>
            )
          }
        >
          <ToolboxItem
            icon={<Square className="h-5 w-5" />}
            label="Contenedor"
            onClick={() => {}}
          />
        </div>
      </CardContent>
    </Card>
  );
}
