'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { bffClient } from '@/lib/bff/client';
import type { VerifyResponse, VerifyStatus, BffError } from '@/lib/types';

type VerifyMode = 'folio' | 'proof';

const statusConfig: Record<
  VerifyStatus,
  {
    label: string;
    icon: React.ElementType;
    variant: 'success' | 'destructive' | 'warning' | 'default';
  }
> = {
  VALID: {
    label: 'Documento Valido',
    icon: CheckCircle2,
    variant: 'success',
  },
  REVOKED: {
    label: 'Documento Revocado',
    icon: XCircle,
    variant: 'destructive',
  },
  ALTERED: {
    label: 'Documento Alterado',
    icon: AlertTriangle,
    variant: 'warning',
  },
  NOT_FOUND: {
    label: 'No Encontrado',
    icon: Search,
    variant: 'default',
  },
};

export default function VerifyPage() {
  const [mode, setMode] = useState<VerifyMode>('folio');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResponse | null>(null);

  // Folio mode
  const [folio, setFolio] = useState('');
  const [hash, setHash] = useState('');

  // Proof mode
  const [payload, setPayload] = useState('');
  const [merkleRoot, setMerkleRoot] = useState('');
  const [proof, setProof] = useState('');

  const handleVerifyByFolio = async () => {
    if (!folio.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await bffClient.verify.byFolio({
        folio: folio.trim(),
        hash: hash.trim() || undefined,
      });
      setResult(response);
    } catch (err) {
      const bffError = err as BffError;
      setError(bffError.error || 'Error al verificar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyByProof = async () => {
    if (!payload.trim() || !merkleRoot.trim() || !proof.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsedPayload = JSON.parse(payload);
      const parsedProof = JSON.parse(proof);

      const response = await bffClient.verify.byProof({
        payload: parsedPayload,
        merkleRoot: merkleRoot.trim(),
        proof: parsedProof,
      });
      setResult(response);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('JSON invalido en payload o proof');
      } else {
        const bffError = err as BffError;
        setError(bffError.error || 'Error al verificar');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setError(null);
    setFolio('');
    setHash('');
    setPayload('');
    setMerkleRoot('');
    setProof('');
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" />
            <span className="font-semibold">Verificacion ITSON</span>
          </Link>
          <Button variant="outline" asChild>
            <Link href="/auth/signin">Iniciar Sesion</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Portal de Verificacion de Documentos
          </h1>
          <p className="mt-2 text-muted-foreground">
            Verifica la autenticidad de documentos emitidos por el ITSON
          </p>
        </div>

        {!result ? (
          <Card className="mx-auto max-w-xl">
            <CardHeader>
              <CardTitle>Verificar Documento</CardTitle>
              <CardDescription>
                Selecciona el metodo de verificacion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode selector */}
              <div className="flex gap-2">
                <Button
                  variant={mode === 'folio' ? 'default' : 'outline'}
                  onClick={() => {
                    setMode('folio');
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Por Folio
                </Button>
                <Button
                  variant={mode === 'proof' ? 'default' : 'outline'}
                  onClick={() => {
                    setMode('proof');
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Por Prueba Merkle
                </Button>
              </div>

              {mode === 'folio' ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="folio">Folio Institucional *</Label>
                    <Input
                      id="folio"
                      placeholder="ej. CERT-2025-001234"
                      value={folio}
                      onChange={(e) => setFolio(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hash">Hash del Documento (opcional)</Label>
                    <Input
                      id="hash"
                      placeholder="0x..."
                      value={hash}
                      onChange={(e) => setHash(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Si tienes el hash, la verificacion sera mas precisa.
                    </p>
                  </div>
                  <Button
                    onClick={handleVerifyByFolio}
                    disabled={isLoading || !folio.trim()}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Verificar por Folio
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="payload">Payload (JSON) *</Label>
                    <Textarea
                      id="payload"
                      placeholder='{"nombre": "Juan Perez", ...}'
                      value={payload}
                      onChange={(e) => setPayload(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="merkleRoot">Merkle Root *</Label>
                    <Input
                      id="merkleRoot"
                      placeholder="0x..."
                      value={merkleRoot}
                      onChange={(e) => setMerkleRoot(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="proof">Prueba Merkle (JSON Array) *</Label>
                    <Textarea
                      id="proof"
                      placeholder='["0x...", "0x..."]'
                      value={proof}
                      onChange={(e) => setProof(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleVerifyByProof}
                    disabled={
                      isLoading ||
                      !payload.trim() ||
                      !merkleRoot.trim() ||
                      !proof.trim()
                    }
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Verificar por Prueba
                      </>
                    )}
                  </Button>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="mx-auto max-w-xl space-y-6">
            {/* Result card */}
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  {(() => {
                    const config = statusConfig[result.status];
                    const Icon = config.icon;
                    return (
                      <div
                        className={`inline-flex h-16 w-16 items-center justify-center rounded-full ${
                          result.status === 'VALID'
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : result.status === 'REVOKED'
                              ? 'bg-destructive/10 text-destructive'
                              : result.status === 'ALTERED'
                                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-8 w-8" />
                      </div>
                    );
                  })()}
                </div>
                <CardTitle className="text-2xl">
                  {statusConfig[result.status].label}
                </CardTitle>
                <CardDescription>{result.message}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.institutionalFolio && (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">
                      Folio Institucional
                    </span>
                    <span className="font-mono font-medium">
                      {result.institutionalFolio}
                    </span>
                  </div>
                )}
                {result.documentHash && (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">
                      Hash del Documento
                    </span>
                    <span className="max-w-[200px] truncate font-mono text-xs">
                      {result.documentHash}
                    </span>
                  </div>
                )}
                {result.merkleRoot && (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">
                      Merkle Root
                    </span>
                    <span className="max-w-[200px] truncate font-mono text-xs">
                      {result.merkleRoot}
                    </span>
                  </div>
                )}
                {result.isOnChain !== undefined && (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">
                      Anclado en Blockchain
                    </span>
                    <Badge variant={result.isOnChain ? 'success' : 'secondary'}>
                      {result.isOnChain ? 'Si' : 'No'}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              variant="outline"
              onClick={resetForm}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Nueva Verificacion
            </Button>
          </div>
        )}

        {/* Info section */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verificacion por Folio</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Ingresa el folio institucional que aparece en tu documento para
              verificar su autenticidad.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prueba Criptografica</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Verifica usando la prueba Merkle incluida en el QR de tu documento
              para validacion completa.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Blockchain</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Los documentos estan anclados en Polygon para garantizar
              inmutabilidad y trazabilidad.
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-muted-foreground">
          <p>Instituto Tecnologico de Sonora - Gestor Documental Institucional</p>
        </div>
      </footer>
    </div>
  );
}
