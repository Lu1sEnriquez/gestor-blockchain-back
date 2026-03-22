'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Plus,
  Type,
  CalendarDays,
  Image as ImageIcon,
  QrCode,
  PenLine,
  LayoutTemplate,
  Upload,
  Shapes,
  Braces,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { useTemplateBuilderStore } from '@/components/template-builder/store/use-template-builder-store';
import { TEMPLATE_BUILDER_SECTIONS } from '@/components/template-builder/defaults';
import type {
  AttributeDataType,
  TemplateAttribute,
  TemplateBuilderSidebarSection,
} from '@/components/template-builder/types';
import { PanelLeft } from 'lucide-react';

const CATEGORY_ORDER: Array<'evento' | 'titular' | 'sistema'> = ['evento', 'titular', 'sistema'];

const CATEGORY_LABELS: Record<'evento' | 'titular' | 'sistema', string> = {
  evento: 'Evento',
  titular: 'Titular',
  sistema: 'Sistema',
};

function attributeIcon(dataType: AttributeDataType) {
  if (dataType === 'date') return CalendarDays;
  if (dataType === 'image') return ImageIcon;
  if (dataType === 'qr') return QrCode;
  return Type;
}

function groupByCategory(attributes: TemplateAttribute[]) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: attributes.filter((attribute) => attribute.category === category),
  }));
}

const SECTION_ICONS: Record<TemplateBuilderSidebarSection, typeof LayoutTemplate> = {
  plantillas: LayoutTemplate,
  subidas: Upload,
  elementos: Shapes,
  texto: Type,
  atributos: Braces,
  'codigos-qr': QrCode,
  capas: Layers,
};

function layerLabel(entry: Record<string, unknown>): string {
  const name = entry.name;
  const fieldId = entry.fieldId;
  const text = entry.text;
  const elementType = entry.elementType;
  const baseType = entry.type;

  if (typeof name === 'string' && name.length > 0) {
    return name;
  }

  if (typeof fieldId === 'string' && fieldId.length > 0) {
    return fieldId;
  }

  if (typeof text === 'string' && text.length > 0) {
    return text.slice(0, 32);
  }

  if (typeof elementType === 'string' && elementType.length > 0) {
    return elementType;
  }

  if (typeof baseType === 'string' && baseType.length > 0) {
    return baseType;
  }

  return 'Elemento';
}

export function TemplateBuilderSidebar() {
  const activeSidebarSection = useTemplateBuilderStore((state) => state.activeSidebarSection);
  const setActiveSidebarSection = useTemplateBuilderStore((state) => state.setActiveSidebarSection);
  const attributes = useTemplateBuilderStore((state) => state.attributes);
  const scene = useTemplateBuilderStore((state) => state.scene);
  const queueAttributeInsertion = useTemplateBuilderStore((state) => state.queueAttributeInsertion);
  const addCustomAttribute = useTemplateBuilderStore((state) => state.addCustomAttribute);
  const queueInsertion = useTemplateBuilderStore((state) => state.queueInsertion);

  const [newLabel, setNewLabel] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newCategory, setNewCategory] = useState<'evento' | 'titular' | 'sistema'>('titular');
  const [newDataType, setNewDataType] = useState<AttributeDataType>('text');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [uploadHint, setUploadHint] = useState('Arrastra una imagen aqui o selecciona un archivo.');
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onUploadStatus = (event: Event) => {
      const custom = event as CustomEvent<{
        status?: 'uploading' | 'success' | 'error';
        message?: string;
      }>;

      const status = custom.detail?.status;
      const message = custom.detail?.message;
      if (status === 'uploading' || status === 'success' || status === 'error') {
        setUploadState(status);
      }

      if (typeof message === 'string' && message.length > 0) {
        setUploadHint(message);
      }
    };

    window.addEventListener('template-builder:image-upload-status', onUploadStatus);
    return () => {
      window.removeEventListener('template-builder:image-upload-status', onUploadStatus);
    };
  }, []);

  const grouped = useMemo(() => groupByCategory(attributes), [attributes]);

  const onCreateAttribute = () => {
    if (!newLabel.trim()) {
      return;
    }

    addCustomAttribute({
      label: newLabel,
      key: newKey,
      category: newCategory,
      dataType: newDataType,
    });

    setNewLabel('');
    setNewKey('');
    setNewCategory('titular');
    setNewDataType('text');
  };

  const layers = useMemo(() => {
    const objects = Array.isArray(scene.objects) ? scene.objects : [];
    return [...objects].reverse();
  }, [scene.objects]);

  const emitImageForCanvas = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadHint('Solo se aceptan archivos de imagen.');
      return;
    }

    window.dispatchEvent(
      new CustomEvent('template-builder:image-upload', {
        detail: { file },
      })
    );
    setUploadState('uploading');
    setUploadHint(`Archivo preparado: ${file.name}. Sueltalo en el canvas o espera insercion automatica.`);
  };

  const onImageFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    emitImageForCanvas(file);
    event.target.value = '';
  };

  const renderPlantillasSection = () => (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold text-slate-900">Bloques de plantilla</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => queueInsertion('plantilla-texto')}>
          <Type className="h-4 w-4" />
          Texto
        </Button>
        <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => queueInsertion('plantilla-forma')}>
          <Shapes className="h-4 w-4" />
          Forma
        </Button>
      </div>
    </div>
  );

  const renderSubidasSection = () => (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold text-slate-900">Subidas</p>
      <div
        className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(event) => {
          event.preventDefault();
          const dropped = event.dataTransfer.files?.[0];
          if (!dropped) {
            return;
          }
          emitImageForCanvas(dropped);
        }}
      >
        <p className="text-xs text-slate-600">{uploadHint}</p>
        {uploadState === 'uploading' ? (
          <p className="mt-2 text-xs font-medium text-blue-700">Subiendo...</p>
        ) : null}
        {uploadState === 'success' ? (
          <p className="mt-2 text-xs font-medium text-emerald-700">Carga completada.</p>
        ) : null}
        {uploadState === 'error' ? (
          <p className="mt-2 text-xs font-medium text-rose-700">La carga fallo. Reintenta.</p>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImageFileSelected}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        Subir imagen
      </Button>
      <p className="text-xs text-slate-500">
        Tambien puedes arrastrar un archivo de imagen directamente al area del canvas.
      </p>
    </div>
  );

  const renderElementosSection = () => (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold text-slate-900">Elementos</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => queueInsertion('plantilla-forma')}>
          <Shapes className="h-4 w-4" />
          Forma
        </Button>
        <Button
          type="button"
          variant="outline"
          className="justify-start gap-2"
          onClick={() => queueInsertion('evento-firma')}
        >
          <PenLine className="h-4 w-4" />
          Firma
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Las variables dinamicas se agregan solo desde la pestana Atributos.
      </p>
    </div>
  );

  const renderTextoSection = () => (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold text-slate-900">Texto</p>
      <div className="grid grid-cols-1 gap-2">
        <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => queueInsertion('plantilla-titulo')}>
          <Type className="h-4 w-4" />
          Anadir Titulo
        </Button>
        <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => queueInsertion('plantilla-subtitulo')}>
          <Type className="h-4 w-4" />
          Anadir Subtitulo
        </Button>
        <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => queueInsertion('plantilla-parrafo')}>
          <Type className="h-4 w-4" />
          Anadir texto
        </Button>
      </div>
    </div>
  );

  const renderAtributosSection = () => (
    <>
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
        <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={onCreateAttribute}>
          <Plus className="h-4 w-4" />
          Agregar atributo personalizado
        </Button>

        <div className="space-y-2">
          <Label htmlFor="attr-label">Nombre visible</Label>
          <Input
            id="attr-label"
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            placeholder="Ej: Matricula"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="attr-key">Clave (opcional)</Label>
          <Input
            id="attr-key"
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
            placeholder="Ej: matricula"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="attr-category">Categoria</Label>
            <select
              id="attr-category"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value as 'evento' | 'titular' | 'sistema')}
            >
              <option value="titular">Titular</option>
              <option value="evento">Evento</option>
              <option value="sistema">Sistema</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="attr-type">Tipo</Label>
            <select
              id="attr-type"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
              value={newDataType}
              onChange={(event) => setNewDataType(event.target.value as AttributeDataType)}
            >
              <option value="text">Texto</option>
              <option value="date">Fecha</option>
              <option value="image">Imagen</option>
              <option value="qr">QR</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {grouped.map((group) => (
          <div key={group.category} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-900">{group.label}</p>

            {group.items.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">Sin atributos en esta categoria.</p>
            )}

            <div className="mt-2 space-y-2">
              {group.items.map((attribute) => {
                const Icon = attributeIcon(attribute.dataType);
                return (
                  <div key={attribute.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-100 px-2 py-1.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Icon className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{attribute.label}</span>
                      </div>
                      <p className="truncate text-xs text-slate-400">{attribute.key}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {attribute.inUse ? (
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                          En uso
                        </span>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => queueAttributeInsertion(attribute.id)}
                      >
                        Usar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const renderQrSection = () => (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold text-slate-900">Codigos QR</p>
      <Button type="button" variant="outline" className="w-full justify-start gap-2" disabled>
        <QrCode className="h-4 w-4" />
        QR dinamico (desde Atributos)
      </Button>
      <p className="text-xs text-slate-500">
        Todas las variables dinamicas (Evento, Titular y Sistema) nacen en Atributos.
      </p>
    </div>
  );

  const renderLayersSection = () => (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold text-slate-900">Capas</p>
      {layers.length === 0 ? (
        <p className="text-xs text-slate-500">No hay elementos en el canvas.</p>
      ) : (
        <div className="space-y-1">
          {layers.map((entry, index) => (
            <div key={`${layerLabel(entry)}-${index}`} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
              {layerLabel(entry)}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderActiveSection = () => {
    if (activeSidebarSection === 'plantillas') {
      return renderPlantillasSection();
    }
    if (activeSidebarSection === 'subidas') {
      return renderSubidasSection();
    }
    if (activeSidebarSection === 'elementos') {
      return renderElementosSection();
    }
    if (activeSidebarSection === 'texto') {
      return renderTextoSection();
    }
    if (activeSidebarSection === 'atributos') {
      return renderAtributosSection();
    }
    if (activeSidebarSection === 'codigos-qr') {
      return renderQrSection();
    }
    return renderLayersSection();
  };

  return (
    <SidebarProvider className="h-full w-auto min-h-0 min-w-0 shrink-0">
      <div className={`${sidebarExpanded ? 'w-108' : 'w-20'} h-full shrink-0 transition-all duration-200`}>
        <Sidebar collapsible="none" className="h-full w-full border-r border-slate-200">
          <SidebarHeader className="border-b border-slate-200 bg-white ">
            <div className={`flex items-center ${sidebarExpanded ? 'justify-between' : 'justify-center'}`}  >
              {sidebarExpanded ? (
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">Editor</p>
              ) : (
                <span className="sr-only">Editor</span>
              )}
              <Button
                type="button"
                variant="outline"
                className="h-9 w-10   border-slate-200 text-slate-700 hover:bg-slate-100"
                onClick={() => setSidebarExpanded((current) => !current)}
              >
                <PanelLeft className="h-10 w-10 " />
                <span className="sr-only">Alternar sidebar</span>
              </Button>
            </div>
          </SidebarHeader>

          <SidebarContent className="bg-slate-50">
            <div className="flex h-full min-h-0">
              <nav className="flex w-20 shrink-0 flex-col border-r border-slate-200 bg-white py-2 items-center">
  <SidebarMenu className="flex w-full flex-col items-center gap-2">
    {TEMPLATE_BUILDER_SECTIONS.map((section) => {
      const Icon = SECTION_ICONS[section.id];
      const active = section.id === activeSidebarSection;

      return (
        <SidebarMenuItem key={section.id} className="w-full px-2">
          <SidebarMenuButton
            type="button"
            isActive={active}
            className={`
              flex h-auto w-full flex-col items-center justify-center gap-1.5 py-3 rounded-md transition-all
              ${
                active
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-50'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }
            `}
            onClick={() => {
              setActiveSidebarSection(section.id);
              setSidebarExpanded(true);
            }}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium text-center leading-none">
              {section.label}
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    })}
  </SidebarMenu>
</nav>

              <div className={`flex-1 overflow-y-auto p-4 ${sidebarExpanded ? '' : 'hidden'}`}>
                <h3 className="text-sm font-semibold text-slate-900">
                  {TEMPLATE_BUILDER_SECTIONS.find((section) => section.id === activeSidebarSection)?.label}
                </h3>
                <div className="mt-4 space-y-4">{renderActiveSection()}</div>
              </div>
            </div>
          </SidebarContent>
        </Sidebar>
      </div>
    </SidebarProvider>
  );
}
