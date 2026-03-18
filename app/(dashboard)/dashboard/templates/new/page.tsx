import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserRole } from '@/lib/types';
import { NewTemplateForm } from './new-template-form';

export const metadata = {
  title: 'Nueva Plantilla',
};

export default async function NewTemplatePage() {
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

  return <NewTemplateForm userId={session.user.id} />;
}
