'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, Redo2, Save, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateBuilderSidebar } from '@/components/template-builder/sidebar';
import { TemplateBuilderPropertiesPanel } from '@/components/template-builder/properties-panel';
import { useTemplateBuilderStore } from '@/components/template-builder/store/use-template-builder-store';
import { useEditorShortcuts } from '@/hooks/use-editor-shortcuts';
import { DEFAULT_FABRIC_SCENE } from '@/components/template-builder/defaults';
import type { FabricTemplateScene } from '@/components/template-builder/types';

const FabricCanvas = dynamic(
  () =>
    import('@/components/template-builder/fabric-canvas').then((module) => ({
      default: module.FabricCanvas,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    ),
  }
);

interface TemplateBuilderShellProps {
  templateId: string;
  templateName: string;
  initialScene?: Record<string, unknown>;
  onSave: (scene: Record<string, unknown>) => Promise<void>;
}


const PLACEHOLDER_PATTERN = /^\s*\{\{\s*([a-zA-Z0-9_]+)\s*\}\}\s*$/;

function extractPlaceholderKey(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const match = value.match(PLACEHOLDER_PATTERN);
  return match?.[1];
}

function normalizeBusinessType(value: unknown): 'text' | 'image' | 'signature_block' | 'qr' | 'shape' {
  if (value === 'text' || value === 'image' || value === 'signature_block' || value === 'qr' || value === 'shape') {
    return value;
  }

  if (value === 'Textbox' || value === 'IText' || value === 'Text') {
    return 'text';
  }

  if (value === 'Image' || value === 'FabricImage') {
    return 'image';
  }

  if (value === 'Group') {
    return 'signature_block';
  }

  return 'shape';
}

function inferCategory(fieldId: string | undefined, isDynamic: boolean): 'plantilla' | 'evento' | 'titular' | 'sistema' {
  if (!isDynamic) {
    return 'plantilla';
  }

  if (!fieldId) {
    return 'titular';
  }

  if (
    fieldId.startsWith('folio') ||
    fieldId.startsWith('qr_') ||
    fieldId.startsWith('fecha_') ||
    fieldId.includes('sistema')
  ) {
    return 'sistema';
  }

  if (fieldId.startsWith('firma_') || fieldId.includes('evento')) {
    return 'evento';
  }

  return 'titular';
}

function normalizeObjectForSave(object: Record<string, unknown>, index: number): Record<string, unknown> {
  const explicitFieldId = typeof object.fieldId === 'string' ? object.fieldId : undefined;
  const placeholderFromText = extractPlaceholderKey(object.text);
  const placeholderFromProperty = extractPlaceholderKey(object.placeholder);
  const placeholderKey = explicitFieldId ?? placeholderFromProperty ?? placeholderFromText;
  const objectIsDynamic =
    object.isDynamic === true ||
    Boolean(placeholderFromText) ||
    Boolean(placeholderFromProperty);

  const elementType = normalizeBusinessType(object.elementType ?? object.type);
  const category =
    object.category === 'plantilla' ||
    object.category === 'evento' ||
    object.category === 'titular' ||
    object.category === 'sistema'
      ? object.category
      : inferCategory(placeholderKey, objectIsDynamic);

  // Signature blocks are persisted as lightweight markers: only placement + metadata.
  if (elementType === 'signature_block') {
    return {
      type: 'Rect',
      id:
        typeof object.id === 'string' && object.id.length > 0
          ? object.id
          : `obj_${index}_${Date.now()}`,
      name:
        typeof object.name === 'string' && object.name.length > 0
          ? object.name
          : placeholderKey ?? `firma_${index + 1}`,
      left: typeof object.left === 'number' ? object.left : 0,
      top: typeof object.top === 'number' ? object.top : 0,
      scaleX: typeof object.scaleX === 'number' ? object.scaleX : 1,
      scaleY: typeof object.scaleY === 'number' ? object.scaleY : 1,
      angle: typeof object.angle === 'number' ? object.angle : 0,
      originX:
        object.originX === 'left' || object.originX === 'center' || object.originX === 'right'
          ? object.originX
          : 'center',
      originY:
        object.originY === 'top' || object.originY === 'center' || object.originY === 'bottom'
          ? object.originY
          : 'center',
      width: typeof object.width === 'number' ? object.width : 200,
      height: typeof object.height === 'number' ? object.height : 130,
      category: 'evento',
      elementType: 'signature_block',
      isDynamic: true,
      fieldId: placeholderKey ?? 'firma_1',
      placeholder: `{{${placeholderKey ?? 'firma_1'}}}`,
      metadata: {
        category: 'evento',
        type: 'signature_block',
        isDynamic: true,
      },
    };
  }

  const normalizedChildren = Array.isArray(object.objects)
    ? object.objects.map((entry, childIndex) => {
        if (!entry || typeof entry !== 'object') {
          return entry;
        }
        return normalizeObjectForSave(entry as Record<string, unknown>, childIndex);
      })
    : object.objects;

  const childrenAreDynamic = Array.isArray(normalizedChildren)
    ? normalizedChildren.some(
        (entry) => Boolean((entry as { isDynamic?: boolean } | null)?.isDynamic)
      )
    : false;

  const isDynamic = objectIsDynamic || childrenAreDynamic;

  return {
    ...object,
    objects: normalizedChildren,
    id:
      typeof object.id === 'string' && object.id.length > 0
        ? object.id
        : `obj_${index}_${Date.now()}`,
    name:
      typeof object.name === 'string' && object.name.length > 0
        ? object.name
        : placeholderKey ?? `layer_${index + 1}`,
    fieldId: placeholderKey ?? `field_${index + 1}`,
    category,
    elementType,
    isDynamic,
    placeholder: placeholderKey ? `{{${placeholderKey}}}` : object.placeholder,
    metadata: {
      category,
      type: elementType,
      isDynamic,
    },
  };
}

function buildSceneSavePayload(scene: FabricTemplateScene): Record<string, unknown> {
  const objects = Array.isArray(scene.objects) ? scene.objects : [];
  const normalizedObjects = objects.map((object, index) => normalizeObjectForSave(object, index));

  return {
    ...scene,
    objects: normalizedObjects,
  };
}

export function TemplateBuilderShell({
  templateId,
  templateName,
  initialScene,
  onSave,
}: TemplateBuilderShellProps) {
  useEditorShortcuts();

  const [isSaving, setIsSaving] = useState(false);

  const mode = useTemplateBuilderStore((state) => state.mode);
  const dirty = useTemplateBuilderStore((state) => state.dirty);
  const scene = useTemplateBuilderStore((state) => state.scene);
  const setTemplateId = useTemplateBuilderStore((state) => state.setTemplateId);
  const toggleMode = useTemplateBuilderStore((state) => state.toggleMode);
  const setScene = useTemplateBuilderStore((state) => state.setScene);
  const markSaved = useTemplateBuilderStore((state) => state.markSaved);
  const undo = useTemplateBuilderStore((state) => state.undo);
  const redo = useTemplateBuilderStore((state) => state.redo);

  useEffect(() => {
    setTemplateId(templateId);
  }, [setTemplateId, templateId]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const hydratedScene = useMemo(() => {
    if (initialScene && Array.isArray((initialScene as { objects?: unknown[] }).objects)) {
      return initialScene;
    }

    return DEFAULT_FABRIC_SCENE;
  }, [initialScene]);

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = buildSceneSavePayload(scene);
      console.log('[template-builder] Saving scene with', payload.objects ? (payload.objects as unknown[]).length : 0, 'objects');
      await onSave(payload);
      markSaved();
      console.log('[template-builder] Save succeeded');
    } catch (error) {
      console.error('[template-builder] Save failed:', error);
      setSaveError(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  }, [markSaved, onSave, scene]);

  const handleSceneChange = useCallback(
    (nextScene: FabricTemplateScene) => {
      setScene(nextScene);
    },
    [setScene]
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-4">
          <h2 className="font-medium text-slate-900">{templateName}</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={undo}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={redo}>
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveError && (
            <span className="text-sm text-red-600">{saveError}</span>
          )}
          <Button variant="outline" size="sm" onClick={toggleMode}>
            <Eye className="mr-2 h-4 w-4" />
            {mode === 'preview' ? 'Editar' : 'Vista previa'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {dirty ? 'Guardar cambios' : 'Guardar'}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {mode === 'edit' && <TemplateBuilderSidebar />}
        <div className="relative flex-1">
          <FabricCanvas
            initialScene={hydratedScene as Record<string, unknown>}
            onSceneChange={handleSceneChange}
          />
        </div>
        {mode === 'edit' && <TemplateBuilderPropertiesPanel />}
      </div>
    </div>
  );
}
