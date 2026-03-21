'use client';

import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowDownToLine,
  ArrowUpToLine,
  Bold,
  ChevronDown,
  ChevronUp,
  Italic,
  ImagePlus,
  Lock,
  PanelLeft,
  Trash2,
  Underline,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTemplateBuilderStore } from '@/components/template-builder/store/use-template-builder-store';
import { loadFont } from '@/components/template-builder/font-loader';
import type { SelectedObjectState } from '@/components/template-builder/types';

const FONT_FAMILIES = [
  'Roboto',
  'Times New Roman',
  'Montserrat',
  'Marcellus',
  'Open Sans',
  'Lato',
  'Playfair Display',
  'Dancing Script',
  'Georgia',
  'Arial',
];

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  plantilla: 'bg-slate-100 text-slate-700 border-slate-200',
  evento: 'bg-blue-50 text-blue-700 border-blue-200',
  titular: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sistema: 'bg-amber-50 text-amber-700 border-amber-200',
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  text: 'bg-violet-50 text-violet-700 border-violet-200',
  image: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  signature_block: 'bg-rose-50 text-rose-700 border-rose-200',
  qr: 'bg-orange-50 text-orange-700 border-orange-200',
  shape: 'bg-slate-50 text-slate-600 border-slate-200',
};

function toColorInputValue(value: unknown): string {
  if (typeof value !== 'string') {
    return '#0f172a';
  }

  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed;
  }

  const shortHex = trimmed.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHex) {
    const [r, g, b] = shortHex[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  const rgbMatch = trimmed.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (rgbMatch) {
    const toHex = (entry: string) => {
      const bounded = Math.max(0, Math.min(255, Number(entry)));
      return bounded.toString(16).padStart(2, '0');
    };
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }

  return '#0f172a';
}

function isTextObject(obj: SelectedObjectState): boolean {
  const ft = obj.fabricType?.toLowerCase();
  return ft === 'textbox' || ft === 'i-text' || ft === 'text' || obj.text !== undefined;
}

function isNonTextObject(obj: SelectedObjectState): boolean {
  return !isTextObject(obj);
}

function scaledWidth(obj: SelectedObjectState): number {
  return Math.round((obj.width ?? 0) * (obj.scaleX ?? 1));
}

function scaledHeight(obj: SelectedObjectState): number {
  return Math.round((obj.height ?? 0) * (obj.scaleY ?? 1));
}

export function TemplateBuilderPropertiesPanel() {
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);
  const [propertiesExpanded, setPropertiesExpanded] = useState(true);
  const templateId = useTemplateBuilderStore((state) => state.templateId);
  const selectedObject = useTemplateBuilderStore((state) => state.selectedObject);
  const pageSettings = useTemplateBuilderStore((state) => state.pageSettings);
  const setPageSettings = useTemplateBuilderStore((state) => state.setPageSettings);
  const queueCanvasCommand = useTemplateBuilderStore((state) => state.queueCanvasCommand);

  const applyTextStyle = (value: Record<string, unknown>) => {
    queueCanvasCommand({ type: 'apply-text-style', value });
  };

  const setGeometry = (value: { left?: number; top?: number; width?: number; height?: number }) => {
    queueCanvasCommand({ type: 'set-geometry', value });
  };

  const setAppearance = (value: Record<string, unknown>) => {
    queueCanvasCommand({ type: 'set-appearance', value });
  };

  const setMetadata = (value: { fieldId?: string }) => {
    queueCanvasCommand({ type: 'set-metadata', value });
  };

  const category = selectedObject?.metadata?.category;
  const showFieldId = category && category !== 'plantilla';

  return (
    <div className={`${propertiesExpanded ? 'w-80' : 'w-12'} h-full shrink-0 transition-all duration-200 flex flex-col`}>
      {/* Header Fijo */}
      <div className={`${propertiesExpanded ? 'justify-between' : 'justify-center'} flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4 shrink-0`}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 border-slate-200 text-slate-700 hover:bg-slate-100"
          onClick={() => setPropertiesExpanded((current) => !current)}
        >
          <PanelLeft className="h-4 w-4" />
          <span className="sr-only">Alternar propiedades</span>
        </Button>
        <div className={propertiesExpanded ? '' : 'hidden'}>
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">Inspector</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">Propiedades</h3>
        </div>
      </div>

      {/* Contenido Desplazable */}
      <aside className="flex-1 w-full overflow-y-auto border-l border-slate-200 bg-slate-50 p-4 flex flex-col gap-4">
        <div className={propertiesExpanded ? '' : 'hidden'}>
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Hoja</p>

        <div className="space-y-2">
          <Label htmlFor="page-format">Formato</Label>
          <select
            id="page-format"
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
            value={pageSettings.format}
            onChange={(event) => {
              const format = event.target.value as 'a4' | 'letter' | 'oficio' | 'custom';
              setPageSettings({ format });
              queueCanvasCommand({ type: 'set-page', value: { format } });
            }}
          >
            <option value="a4">A4</option>
            <option value="letter">Carta</option>
            <option value="oficio">Oficio</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="page-orientation">Orientacion</Label>
          <select
            id="page-orientation"
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
            value={pageSettings.orientation}
            onChange={(event) => {
              const orientation = event.target.value as 'portrait' | 'landscape';
              setPageSettings({ orientation });
              queueCanvasCommand({ type: 'set-page', value: { orientation } });
            }}
          >
            <option value="landscape">Horizontal</option>
            <option value="portrait">Vertical</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="page-width">Ancho</Label>
            <Input id="page-width" value={Math.round(pageSettings.width)} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-height">Alto</Label>
            <Input id="page-height" value={Math.round(pageSettings.height)} readOnly />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Fondo</Label>
          <div className="flex gap-2">
            <input
              ref={bgFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (templateId) {
                  const formData = new FormData();
                  formData.set('image', file);
                  fetch(`/api/proxy/templates/${templateId}/images`, {
                    method: 'POST',
                    body: formData,
                  })
                    .then((res) => res.json())
                    .then((data: { publicUrl?: string }) => {
                      if (data.publicUrl) {
                        queueCanvasCommand({ type: 'set-background-image', value: { url: data.publicUrl } });
                      }
                    })
                    .catch(() => {});
                } else {
                  const url = URL.createObjectURL(file);
                  queueCanvasCommand({ type: 'set-background-image', value: { url } });
                }
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => bgFileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              Imagen de fondo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              title="Quitar fondo"
              onClick={() => queueCanvasCommand({ type: 'set-background-image', value: { url: null } })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {!selectedObject && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          Selecciona un elemento en el canvas para editar sus propiedades.
        </div>
      )}

      {selectedObject && (
        <>
          {/* ── GEOMETRIA Y CAPAS ── */}
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Posicion y tamano</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="obj-x">X</Label>
                <Input
                  id="obj-x"
                  type="number"
                  value={Math.round(selectedObject.left)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setGeometry({ left: v });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="obj-y">Y</Label>
                <Input
                  id="obj-y"
                  type="number"
                  value={Math.round(selectedObject.top)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setGeometry({ top: v });
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="obj-w">W</Label>
                <Input
                  id="obj-w"
                  type="number"
                  value={scaledWidth(selectedObject)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v > 0) setGeometry({ width: v });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="obj-h">H</Label>
                <Input
                  id="obj-h"
                  type="number"
                  value={scaledHeight(selectedObject)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v > 0) setGeometry({ height: v });
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-500">Alineacion</p>
              <div className="grid grid-cols-3 gap-1">
                <Button size="icon-sm" type="button" variant="outline" onClick={() => queueCanvasCommand({ type: 'align', value: 'left' })}>
                  <AlignHorizontalJustifyStart className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" type="button" variant="outline" onClick={() => queueCanvasCommand({ type: 'align', value: 'center-horizontal' })}>
                  <AlignHorizontalJustifyCenter className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" type="button" variant="outline" onClick={() => queueCanvasCommand({ type: 'align', value: 'right' })}>
                  <AlignHorizontalJustifyEnd className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" type="button" variant="outline" onClick={() => queueCanvasCommand({ type: 'align', value: 'top' })}>
                  <AlignVerticalJustifyStart className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" type="button" variant="outline" onClick={() => queueCanvasCommand({ type: 'align', value: 'center-vertical' })}>
                  <AlignVerticalJustifyCenter className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" type="button" variant="outline" onClick={() => queueCanvasCommand({ type: 'align', value: 'bottom' })}>
                  <AlignVerticalJustifyEnd className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-500">Capas (Z-Index)</p>
              <div className="grid grid-cols-5 gap-1">
                <Button size="icon-sm" type="button" variant="outline" title="Traer al frente" onClick={() => queueCanvasCommand({ type: 'z-order', value: 'front' })}>
                  <ArrowUpToLine className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" type="button" variant="outline" title="Adelante" onClick={() => queueCanvasCommand({ type: 'z-order', value: 'forward' })}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" type="button" variant="outline" title="Atras" onClick={() => queueCanvasCommand({ type: 'z-order', value: 'backward' })}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" type="button" variant="outline" title="Enviar al fondo" onClick={() => queueCanvasCommand({ type: 'z-order', value: 'back' })}>
                  <ArrowDownToLine className="h-4 w-4" />
                </Button>
                <Button
                  size="icon-sm"
                  type="button"
                  variant={selectedObject.locked ? 'secondary' : 'outline'}
                  title="Bloquear"
                  onClick={() => queueCanvasCommand({ type: 'toggle-lock' })}
                >
                  <Lock className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* ── TIPOGRAFIA (solo Textbox) ── */}
          {isTextObject(selectedObject) && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Tipografia</p>

              <div className="space-y-1">
                <Label htmlFor="font-family">Fuente</Label>
                <select
                  id="font-family"
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                  value={selectedObject.fontFamily ?? 'Roboto'}
                  onChange={(e) => {
                    const family = e.target.value;
                    loadFont(family).then(() => applyTextStyle({ fontFamily: family }));
                  }}
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="font-size">Tamano</Label>
                  <Input
                    id="font-size"
                    type="number"
                    min={8}
                    max={120}
                    value={selectedObject.fontSize ?? 16}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (Number.isFinite(value)) applyTextStyle({ fontSize: value });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="font-color">Color</Label>
                  <Input
                    id="font-color"
                    type="color"
                    value={toColorInputValue(selectedObject.fill)}
                    onChange={(e) => applyTextStyle({ fill: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                <Button
                  size="icon-sm"
                  type="button"
                  variant={selectedObject.fontWeight === '700' || selectedObject.fontWeight === 'bold' ? 'secondary' : 'outline'}
                  onClick={() =>
                    applyTextStyle({
                      fontWeight: selectedObject.fontWeight === '700' || selectedObject.fontWeight === 'bold' ? 'normal' : '700',
                    })
                  }
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  size="icon-sm"
                  type="button"
                  variant={selectedObject.fontStyle === 'italic' ? 'secondary' : 'outline'}
                  onClick={() =>
                    applyTextStyle({ fontStyle: selectedObject.fontStyle === 'italic' ? 'normal' : 'italic' })
                  }
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  size="icon-sm"
                  type="button"
                  variant={selectedObject.underline ? 'secondary' : 'outline'}
                  onClick={() => applyTextStyle({ underline: !selectedObject.underline })}
                >
                  <Underline className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-1">
                <Button size="icon-sm" type="button" variant={selectedObject.textAlign === 'left' ? 'secondary' : 'outline'} onClick={() => applyTextStyle({ textAlign: 'left' })}>
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" type="button" variant={selectedObject.textAlign === 'center' ? 'secondary' : 'outline'} onClick={() => applyTextStyle({ textAlign: 'center' })}>
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" type="button" variant={selectedObject.textAlign === 'right' ? 'secondary' : 'outline'} onClick={() => applyTextStyle({ textAlign: 'right' })}>
                  <AlignRight className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" type="button" variant={selectedObject.textAlign === 'justify' ? 'secondary' : 'outline'} onClick={() => applyTextStyle({ textAlign: 'justify' })}>
                  <AlignJustify className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── APARIENCIA (solo para Rects, Images, Shapes) ── */}
          {isNonTextObject(selectedObject) && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Apariencia</p>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="stroke-color">Borde</Label>
                  <Input
                    id="stroke-color"
                    type="color"
                    value={toColorInputValue(selectedObject.stroke ?? '#64748b')}
                    onChange={(e) => setAppearance({ stroke: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stroke-width">Grosor</Label>
                  <Input
                    id="stroke-width"
                    type="number"
                    min={0}
                    max={20}
                    value={selectedObject.strokeWidth ?? 1}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v)) setAppearance({ strokeWidth: v });
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={Array.isArray(selectedObject.strokeDashArray) && selectedObject.strokeDashArray.length > 0}
                    onChange={(e) => setAppearance({ strokeDashArray: e.target.checked ? [5, 5] : null })}
                  />
                  Linea punteada
                </label>
              </div>

              <div className="space-y-1">
                <Label htmlFor="obj-opacity">Opacidad ({Math.round((selectedObject.opacity ?? 1) * 100)}%)</Label>
                <input
                  id="obj-opacity"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((selectedObject.opacity ?? 1) * 100)}
                  onChange={(e) => setAppearance({ opacity: Number(e.target.value) / 100 })}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="fill-color">Relleno</Label>
                <Input
                  id="fill-color"
                  type="color"
                  value={toColorInputValue(selectedObject.fill ?? '#e2e8f0')}
                  onChange={(e) => setAppearance({ fill: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* ── METADATOS Y DEBUG (El Corazon Web3) ── */}
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Metadatos</p>

            <div className="flex flex-wrap gap-2">
              {category && (
                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE_COLORS[category] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </span>
              )}
              {selectedObject.metadata?.elementType && (
                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_COLORS[selectedObject.metadata.elementType] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {selectedObject.metadata.elementType}
                </span>
              )}
              {selectedObject.metadata?.isDynamic && (
                <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  Dinamico
                </span>
              )}
            </div>

            {showFieldId && (
              <div className="space-y-1">
                <Label htmlFor="field-id">Field ID (clave de mapeo)</Label>
                <Input
                  id="field-id"
                  value={selectedObject.metadata?.fieldId ?? ''}
                  onChange={(e) => setMetadata({ fieldId: e.target.value })}
                />
              </div>
            )}

            {selectedObject.metadata?.placeholder && (
              <div className="space-y-1">
                <Label>Placeholder</Label>
                <p className="rounded-md bg-slate-50 px-2 py-1.5 font-mono text-xs text-slate-600">
                  {selectedObject.metadata.placeholder}
                </p>
              </div>
            )}
          </div>
        </>
      )}
        </div>
      </aside>
    </div>
  );
}
