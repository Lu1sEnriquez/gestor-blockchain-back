'use client';

import { useState, useCallback } from 'react';
import { Editor, Frame, Element } from '@craftjs/core';
import { Save, Undo, Redo, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toolbox } from './toolbox';
import { SettingsPanel } from './settings-panel';
import {
  Text,
  Heading,
  ImageBlock,
  Divider,
  Spacer,
  Container,
  Canvas,
} from './components';

interface TemplateEditorProps {
  templateId: string;
  templateName: string;
  initialSchema?: Record<string, unknown>;
  onSave: (schema: Record<string, unknown>) => Promise<void>;
}

export function TemplateEditor({
  templateId,
  templateName,
  initialSchema,
  onSave,
}: TemplateEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [editorState, setEditorState] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!editorState) return;

    setIsSaving(true);
    try {
      const schema = JSON.parse(editorState);
      await onSave(schema);
    } catch (error) {
      console.error('[v0] Error saving template:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editorState, onSave]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-2">
        <div className="flex items-center gap-4">
          <h2 className="font-medium">{templateName}</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" disabled>
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" disabled>
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
          >
            <Eye className="mr-2 h-4 w-4" />
            {isPreview ? 'Editar' : 'Vista previa'}
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
                Guardar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex flex-1 overflow-hidden">
        <Editor
          resolver={{
            Text,
            Heading,
            ImageBlock,
            Divider,
            Spacer,
            Container,
            Canvas,
          }}
          enabled={!isPreview}
          onNodesChange={(query) => {
            const json = query.serialize();
            setEditorState(json);
          }}
        >
          {/* Left sidebar - Toolbox */}
          {!isPreview && (
            <div className="w-52 shrink-0 overflow-y-auto border-r bg-muted/30 p-4">
              <Toolbox />
            </div>
          )}

          {/* Main canvas area */}
          <div className="flex-1 overflow-auto bg-muted/50 p-8">
            <div className="flex justify-center">
              <Frame>
                <Element
                  canvas
                  is={Canvas}
                  background="#ffffff"
                  padding={40}
                >
                  <Heading text={templateName} fontSize={28} textAlign="center" />
                  <Spacer height={20} />
                  <Text
                    text="Arrastra componentes aqui para disenar tu plantilla"
                    textAlign="center"
                    color="#6b7280"
                  />
                </Element>
              </Frame>
            </div>
          </div>

          {/* Right sidebar - Settings */}
          {!isPreview && (
            <div className="w-64 shrink-0 overflow-y-auto border-l bg-muted/30 p-4">
              <SettingsPanel />
            </div>
          )}
        </Editor>
      </div>
    </div>
  );
}
