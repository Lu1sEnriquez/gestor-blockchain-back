import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuditsContent } from './audits-content';
import { UserRole } from '@/lib/types';

export const metadata = {
  title: 'Auditoria',
  description: 'Registros de auditoria y trazabilidad',
};

export default async function AuditsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Solo ADMIN y AUDITOR pueden ver auditoria
  const canViewAudits =
    session.user.roles.includes(UserRole.ADMIN) ||
    session.user.roles.includes(UserRole.AUDITOR);

  if (!canViewAudits) {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auditoria</h1>
        <p className="text-muted-foreground">
          Registros de auditoria y trazabilidad del sistema
        </p>
      </div>
      <AuditsContent userId={session.user.id} />
    </div>
  );
}
