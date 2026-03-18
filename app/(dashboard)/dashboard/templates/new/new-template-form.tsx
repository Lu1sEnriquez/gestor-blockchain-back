'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, Save } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCreateTemplate } from '@/hooks/use-templates';

interface NewTemplateFormProps {
  userId: string;
}

// Default Craft.js schema for a blank template
const DEFAULT_CRAFT_SCHEMA = {
  ROOT: {
    type: { resolvedName: 'Container' },
    isCanvas: true,
    props: {
      width: '210mm',
      height: '297mm',
      padding: 20,
      background: '#ffffff',
    },
    displayName: 'Documento',
    custom: {},
    nodes: [],
  },
};

export function NewTemplateForm({ userId }: NewTemplateFormProps) {
  const router = useRouter();
  const { createTemplate, isCreating, error, clearError } = useCreateTemplate();

  const [templateName, setTemplateName] = useState('');
  const [folioPrefix, setFolioPrefix] = useState('');
  const [description, setDescription] = useState('');

  // Validation
  const [validationErrors, setValidationErrors] = useState<{
    templateName?: string;
    folioPrefix?: string;
  }>({});

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    if (!templateName.trim()) {
      errors.templateName = 'El nombre es requerido';
    } else if (templateName.length < 3) {
      errors.templateName = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!folioPrefix.trim()) {
      errors.folioPrefix = 'El prefijo es requerido';
    } else if (!/^[A-Z]{2,6}$/.test(folioPrefix.toUpperCase())) {
      errors.folioPrefix = 'El prefijo debe ser de 2-6 letras mayusculas';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    const craftSchema = {
      ...DEFAULT_CRAFT_SCHEMA,
      ROOT: {
        ...DEFAULT_CRAFT_SCHEMA.ROOT,
        props: {
          ...DEFAULT_CRAFT_SCHEMA.ROOT.props,
          templateName,
          description,
        },
      },
    };

    const result = await createTemplate({
      requesterUserId: userId,
      templateName: templateName.trim(),
      folioPrefix: folioPrefix.toUpperCase().trim(),
      craftSchemaJson: craftSchema,
    });

    if (result) {
      // Redirect to editor for the new template
      router.push(`/dashboard/templates/${result.id}/edit`);
    }
  };

  return (
    <div>
      <PageHeader title="Nueva Plantilla" description="Crea una nueva plantilla de documento">
        <Button variant="outline" asChild>
          <Link href="/dashboard/templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Informacion de la Plantilla</CardTitle>
            <CardDescription>
              Define los datos basicos de la plantilla. Podras editar el diseno
              visual despues de crearla.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error.isConflict
                  ? 'Ya existe una plantilla con ese prefijo'
                  : error.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="templateName">
                Nombre de la plantilla <span className="text-destructive">*</span>
              </Label>
              <Input
                id="templateName"
                placeholder="Ej: Constancia de Estudios"
                value={templateName}
                onChange={(e) => {
                  setTemplateName(e.target.value);
                  if (validationErrors.templateName) {
                    setValidationErrors((prev) => ({ ...prev, templateName: undefined }));
                  }
                }}
                disabled={isCreating}
                aria-invalid={!!validationErrors.templateName}
              />
              {validationErrors.templateName && (
                <p className="text-sm text-destructive">{validationErrors.templateName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="folioPrefix">
                Prefijo de folio <span className="text-destructive">*</span>
              </Label>
              <Input
                id="folioPrefix"
                placeholder="Ej: CONST"
                value={folioPrefix}
                onChange={(e) => {
                  setFolioPrefix(e.target.value.toUpperCase());
                  if (validationErrors.folioPrefix) {
                    setValidationErrors((prev) => ({ ...prev, folioPrefix: undefined }));
                  }
                }}
                disabled={isCreating}
                maxLength={6}
                className="font-mono uppercase"
                aria-invalid={!!validationErrors.folioPrefix}
              />
              {validationErrors.folioPrefix ? (
                <p className="text-sm text-destructive">{validationErrors.folioPrefix}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este prefijo se usara para generar folios unicos (ej: CONST-2026-00001)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripcion (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Describe el proposito de esta plantilla..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isCreating}
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" asChild disabled={isCreating}>
              <Link href="/dashboard/templates">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Crear y Continuar al Editor
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
