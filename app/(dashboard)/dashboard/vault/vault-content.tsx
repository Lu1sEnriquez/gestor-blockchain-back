'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Upload,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { UserRole } from '@/lib/types';

interface VaultContentProps {
  userId: string;
  userRoles: UserRole[];
}

export function VaultContent({ userId, userRoles }: VaultContentProps) {
  const isSigner = userRoles.includes(UserRole.SIGNER);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadDone, setUploadDone] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate PNG only
    if (!file.name.toLowerCase().endsWith('.png')) {
      setUploadError('Solo se aceptan archivos PNG con fondo transparente.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('El archivo no puede superar los 2 MB.');
      return;
    }

    setUploadError(null);
    setSignatureFile(file);
    setSignaturePreview(URL.createObjectURL(file));
    setUploadDone(false);
  };

  const handleUpload = async () => {
    if (!signatureFile) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('signature', signatureFile);
      formData.append('userId', userId);

      const res = await fetch('/api/proxy/vault/signatures', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Error al subir la firma');
      }

      setUploadDone(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setSignaturePreview(null);
    setSignatureFile(null);
    setUploadDone(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isSigner) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <ShieldCheck className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">Acceso restringido</h3>
          <p className="text-sm text-muted-foreground">
            La Bóveda Digital solo está disponible para usuarios con rol{' '}
            <Badge variant="outline">SIGNER</Badge>.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Status card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Estado de tu firma
          </CardTitle>
          <CardDescription>
            Tu firma autógrafa es requerida para poder autorizar la emisión de documentos institucionales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {uploadDone ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Firma cargada correctamente. Lista para usarse.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">No has cargado tu firma aún.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload card */}
      <Card>
        <CardHeader>
          <CardTitle>Cargar firma autógrafa</CardTitle>
          <CardDescription>
            Sube una imagen PNG con fondo transparente de tu firma manuscrita. Máximo 2 MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Requirements */}
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Formato: PNG con fondo transparente</li>
            <li>Tamaño máximo: 2 MB</li>
            <li>Resolución recomendada: 600×200 px o superior</li>
            <li>Solo tu firma manuscrita, sin texto adicional</li>
          </ul>

          {/* Dropzone */}
          {!signaturePreview ? (
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mb-3 h-10 w-10 text-slate-400" />
              <p className="text-sm font-medium">Haz clic para seleccionar tu firma</p>
              <p className="text-xs text-muted-foreground mt-1">Solo PNG — máx. 2 MB</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border bg-checkered p-4 flex items-center justify-center min-h-[120px]">
                <Image
                  src={signaturePreview}
                  alt="Vista previa de firma"
                  width={300}
                  height={100}
                  className="max-h-32 object-contain"
                  unoptimized
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar
                </Button>
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Cambiar
                </Button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".png"
            className="hidden"
            onChange={handleFileChange}
          />

          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {uploadDone && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Firma guardada correctamente en la Bóveda Digital.</AlertDescription>
            </Alert>
          )}

          {signatureFile && !uploadDone && (
            <Button
              className="w-full"
              disabled={isUploading}
              onClick={handleUpload}
            >
              {isUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando en Bóveda...</>
              ) : (
                'Guardar Firma en Bóveda Digital'
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Security notice */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="pt-4 text-sm text-slate-600 space-y-1">
          <p className="font-medium text-slate-700">Seguridad y privacidad</p>
          <p>Tu firma se almacena cifrada y solo se usa durante la compilación de documentos autorizados.</p>
          <p>Ningún usuario puede acceder a la imagen de tu firma directamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
