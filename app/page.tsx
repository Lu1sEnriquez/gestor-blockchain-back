import Link from "next/link";
import { FileCheck, Shield, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" />
            <span className="font-semibold">Gestor Documental ITSON</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/verify"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Verificar
            </Link>
            <Button asChild size="sm">
              <Link href="/auth/signin">Iniciar Sesion</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 py-20 text-center">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Sistema Gestor Documental Institucional
            </h1>
            <p className="mt-6 text-pretty text-lg text-muted-foreground">
              Plataforma de orquestacion documental hibrida Web2/Web3 para
              emision, validacion y trazabilidad de credenciales academicas del
              Instituto Tecnologico de Sonora.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/auth/signin">
                  Acceder al Sistema
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/verify">
                  <Search className="mr-2 h-4 w-4" />
                  Verificar Documento
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30 py-20">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-center text-2xl font-bold">
              Caracteristicas Principales
            </h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <FeatureCard
                icon={<FileCheck className="h-6 w-6" />}
                title="Gestion Documental"
                description="Crea y administra plantillas de documentos con un editor visual intuitivo."
              />
              <FeatureCard
                icon={<Shield className="h-6 w-6" />}
                title="Trazabilidad Blockchain"
                description="Ancla documentos en Polygon para garantizar inmutabilidad y verificabilidad."
              />
              <FeatureCard
                icon={<Search className="h-6 w-6" />}
                title="Verificacion Publica"
                description="Permite a terceros verificar la autenticidad de documentos emitidos."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          <p>Instituto Tecnologico de Sonora - Gestor Documental Institucional</p>
          <p className="mt-1">Sistema de gestion documental con trazabilidad blockchain</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
