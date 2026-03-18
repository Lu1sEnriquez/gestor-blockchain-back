'use client';

import { useEditor } from '@craftjs/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export function SettingsPanel() {
  const { selected, actions } = useEditor((state, query) => {
    const currentNodeId = query.getEvent('selected').last();
    let selected;

    if (currentNodeId) {
      selected = {
        id: currentNodeId,
        name: state.nodes[currentNodeId]?.data?.displayName || state.nodes[currentNodeId]?.data?.name,
        settings: state.nodes[currentNodeId]?.related?.settings,
        props: state.nodes[currentNodeId]?.data?.props,
        isDeletable: query.node(currentNodeId).isDeletable(),
      };
    }

    return { selected };
  });

  if (!selected) {
    return (
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Propiedades</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Selecciona un elemento para editar sus propiedades
          </p>
        </CardContent>
      </Card>
    );
  }

  const handlePropChange = (propName: string, value: unknown) => {
    actions.setProp(selected.id, (props: Record<string, unknown>) => {
      props[propName] = value;
    });
  };

  const handleDelete = () => {
    actions.delete(selected.id);
  };

  return (
    <Card className="h-fit">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">{selected.name}</CardTitle>
        {selected.isDeletable && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleDelete}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {selected.props && (
          <>
            {/* Text properties */}
            {'text' in selected.props && (
              <div className="space-y-2">
                <Label htmlFor="text">Texto</Label>
                <Input
                  id="text"
                  value={selected.props.text as string}
                  onChange={(e) => handlePropChange('text', e.target.value)}
                />
              </div>
            )}

            {/* Font size */}
            {'fontSize' in selected.props && (
              <div className="space-y-2">
                <Label htmlFor="fontSize">Tamano de fuente</Label>
                <Input
                  id="fontSize"
                  type="number"
                  value={selected.props.fontSize as number}
                  onChange={(e) =>
                    handlePropChange('fontSize', parseInt(e.target.value) || 16)
                  }
                />
              </div>
            )}

            {/* Color */}
            {'color' in selected.props && (
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={selected.props.color as string}
                    onChange={(e) => handlePropChange('color', e.target.value)}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={selected.props.color as string}
                    onChange={(e) => handlePropChange('color', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            )}

            {/* Text align */}
            {'textAlign' in selected.props && (
              <div className="space-y-2">
                <Label>Alineacion</Label>
                <div className="flex gap-1">
                  {['left', 'center', 'right'].map((align) => (
                    <Button
                      key={align}
                      variant={selected.props.textAlign === align ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePropChange('textAlign', align)}
                    >
                      {align === 'left' && 'Izq'}
                      {align === 'center' && 'Centro'}
                      {align === 'right' && 'Der'}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Variable toggle */}
            {'isVariable' in selected.props && (
              <>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.props.isVariable as boolean}
                      onChange={(e) =>
                        handlePropChange('isVariable', e.target.checked)
                      }
                      className="rounded border-input"
                    />
                    Es variable dinamica
                  </Label>
                </div>
                {selected.props.isVariable && (
                  <div className="space-y-2">
                    <Label htmlFor="variableName">Nombre de variable</Label>
                    <Input
                      id="variableName"
                      value={selected.props.variableName as string}
                      onChange={(e) =>
                        handlePropChange('variableName', e.target.value)
                      }
                      placeholder="Ej: nombreEstudiante"
                      className="font-mono"
                    />
                  </div>
                )}
              </>
            )}

            {/* Image properties */}
            {'src' in selected.props && !selected.props.isVariable && (
              <div className="space-y-2">
                <Label htmlFor="src">URL de imagen</Label>
                <Input
                  id="src"
                  value={selected.props.src as string}
                  onChange={(e) => handlePropChange('src', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}

            {/* Dimensions */}
            {'width' in selected.props && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="width">Ancho</Label>
                  <Input
                    id="width"
                    type="number"
                    value={selected.props.width as number}
                    onChange={(e) =>
                      handlePropChange('width', parseInt(e.target.value) || 100)
                    }
                  />
                </div>
                {'height' in selected.props && (
                  <div className="space-y-2">
                    <Label htmlFor="height">Alto</Label>
                    <Input
                      id="height"
                      type="number"
                      value={selected.props.height as number}
                      onChange={(e) =>
                        handlePropChange('height', parseInt(e.target.value) || 100)
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {/* Spacer height */}
            {'height' in selected.props && !('width' in selected.props) && (
              <div className="space-y-2">
                <Label htmlFor="height">Altura</Label>
                <Input
                  id="height"
                  type="number"
                  value={selected.props.height as number}
                  onChange={(e) =>
                    handlePropChange('height', parseInt(e.target.value) || 20)
                  }
                />
              </div>
            )}

            {/* Divider properties */}
            {'thickness' in selected.props && (
              <div className="space-y-2">
                <Label htmlFor="thickness">Grosor</Label>
                <Input
                  id="thickness"
                  type="number"
                  value={selected.props.thickness as number}
                  onChange={(e) =>
                    handlePropChange('thickness', parseInt(e.target.value) || 1)
                  }
                />
              </div>
            )}

            {/* Padding */}
            {'padding' in selected.props && (
              <div className="space-y-2">
                <Label htmlFor="padding">Padding</Label>
                <Input
                  id="padding"
                  type="number"
                  value={selected.props.padding as number}
                  onChange={(e) =>
                    handlePropChange('padding', parseInt(e.target.value) || 0)
                  }
                />
              </div>
            )}

            {/* Background */}
            {'background' in selected.props && (
              <div className="space-y-2">
                <Label htmlFor="background">Fondo</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={selected.props.background as string}
                    onChange={(e) => handlePropChange('background', e.target.value)}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={selected.props.background as string}
                    onChange={(e) => handlePropChange('background', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
