'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/dashboard/shell';
import { TemplateBuilderShell } from '@/components/template-builder/template-builder-shell';
import { bffClient } from '@/lib/bff/client';
import type { Template, BffError } from '@/lib/types';

interface TemplateEditorWrapperProps {
  templateId: string;
  userId: string;
}

export function TemplateEditorWrapper({
  templateId,
  userId,
}: TemplateEditorWrapperProps) {
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadTemplate() {
      try {
        // Fetch templates and find the one we need
        const templates = await bffClient.templates.list({
          requesterUserId: userId,
        });
        const found = templates.find((t) => t.id === templateId);

        if (!found) {
          setError('Plantilla no encontrada');
        } else {
          setTemplate(found);
        }
      } catch (err) {
        const bffError = err as BffError;
        setError(bffError.error || 'Error al cargar la plantilla');
      } finally {
        setIsLoading(false);
      }
    }

    loadTemplate();
  }, [templateId, userId]);

  const handleSave = async (scene: Record<string, unknown>) => {
    try {
      await bffClient.templates.update({
        requesterUserId: userId,
        templateId,
        fabricSchemaJson: scene,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('[template-builder] Error saving schema:', err);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/templates">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>
        <LoadingState message="Cargando plantilla..." />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/templates">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>
        <ErrorState
          message={error || 'Plantilla no encontrada'}
          retry={() => router.refresh()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/dashboard/templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a plantillas
          </Link>
        </Button>
        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Cambios guardados
          </div>
        )}
      </div>
      <TemplateBuilderShell
        templateId={templateId}
        templateName={template.templateName}
        initialScene={template.fabricSchemaJson ?? template.craftSchemaJson}
        onSave={handleSave}
      />
    </div>
  );
}
