import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserRole } from '@/lib/types';
import { TemplateEditorWrapper } from './editor-wrapper';

interface EditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Editar Plantilla',
};

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const session = await auth();
  const { id } = await params;

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

  return <TemplateEditorWrapper templateId={id} userId={session.user.id} />;
}
