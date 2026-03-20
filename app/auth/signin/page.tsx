'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileCheck, Loader2, AlertCircle, ShieldCheck, Database, ArrowRight, Lock, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/components/providers/theme-provider';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDark, toggleTheme } = useTheme();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    error ? 'Credenciales invalidas' : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setErrorMessage('Correo o contrasena incorrectos');
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setErrorMessage('Error al iniciar sesion. Intente de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        {/* Panel izquierdo - Hero (hidden en mobile) */}
        <section className="relative hidden overflow-hidden bg-slate-950 text-white lg:flex">
          <div
            className="absolute inset-0 opacity-45"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="absolute inset-0 bg-linear-to-b from-[#132a59]/20 via-transparent to-[#07162f]/65" />

          <div className="relative z-10 flex w-full max-w-2xl flex-col justify-center px-12 py-14">
            <div className="mb-14 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1f65f3] shadow-sm shadow-[#1f65f3]/40">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-2xl font-semibold tracking-tight">ITSON | Web3 Notary</p>
            </div>

            <h1 className="max-w-lg text-5xl font-semibold leading-[1.05] tracking-tight">
              Orquestacion y Notarizacion Documental Segura.
            </h1>
            <p className="mt-6 max-w-xl text-xl leading-relaxed text-blue-100/80">
              Plataforma institucional con respaldo criptografico en la red Polygon para la emision de credenciales inmutables.
            </p>

            <div className="mt-10 flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 text-blue-50">
                <Lock className="h-4 w-4" />
                AES-256 Encrypted
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 text-blue-50">
                <Database className="h-4 w-4" />
                Polygon Network
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 text-blue-50">
                <FileCheck className="h-4 w-4" />
                Registros Inmutables
              </span>
            </div>
          </div>
        </section>

        {/* Panel derecho - Formulario */}
        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="relative w-full max-w-md">
            {/* Botón de toggle tema */}
            <button
              onClick={toggleTheme}
              className="absolute -top-14 right-0 inline-flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-sm text-foreground hover:bg-muted"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="hidden xs:inline">{isDark ? 'Claro' : 'Oscuro'}</span>
            </button>

            <div className="mb-8">
              <h2 className="text-4xl font-semibold tracking-tight text-foreground">
                Bienvenido de nuevo
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Ingresa tus credenciales institucionales para acceder al orquestador.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className={`space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors ${
                isDark
                  ? 'shadow-slate-900/20'
                  : 'shadow-slate-900/5'
              }`}
            >
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errorMessage}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Correo Institucional (@itson.edu.mx)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@itson.edu.mx"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className={`h-11 border-border bg-secondary/30 text-foreground placeholder-muted-foreground ${
                    isDark ? 'bg-muted/40' : ''
                  }`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Contrasena
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className={`h-11 border-border bg-secondary/30 text-foreground placeholder-muted-foreground ${
                    isDark ? 'bg-muted/40' : ''
                  }`}
                />
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  Recordar mi sesion
                </label>
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                >
                  Olvide mi contrasena
                </button>
              </div>

              <Button
                type="submit"
                className="h-11 w-full text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Iniciar Sesion
                  </>
                )}
              </Button>

              <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                O continua con
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full border-border bg-muted/40 text-foreground hover:bg-muted/60"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Acceso Institucional (SSO)
              </Button>
            </form>

            <p className="mt-7 text-xs text-muted-foreground">
              Al iniciar sesion, aceptas las politicas de privacidad y manejo de datos LFPDPPP.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
