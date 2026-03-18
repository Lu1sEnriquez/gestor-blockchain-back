import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserRole } from '@/lib/types';
import { TemplatesContent } from './templates-content';

export const metadata = {
  title: 'Plantillas',
};

export default async function TemplatesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Check permission
  const hasAccess =
    session.user.roles.includes(UserRole.ADMIN) ||
    session.user.roles.includes(UserRole.CREATOR);

  if (!hasAccess) {
    redirect('/dashboard');
  }

  return <TemplatesContent userId={session.user.id} />;
}
