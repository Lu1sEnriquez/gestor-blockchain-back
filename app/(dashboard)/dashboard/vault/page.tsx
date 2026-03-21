import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { VaultContent } from './vault-content';

export const metadata = {
  title: 'Bóveda Digital — Firma',
};

export default async function VaultPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bóveda Digital</h1>
        <p className="text-muted-foreground">
          Carga y gestiona tu firma autógrafa para la emisión de documentos institucionales.
        </p>
      </div>
      <VaultContent userId={session.user.id} userRoles={session.user.roles} />
    </div>
  );
}
