import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/types';

import { UsersContent } from './users-content';

export const metadata = {
  title: 'Usuarios',
};

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (!session.user.roles.includes(UserRole.ADMIN)) {
    redirect('/dashboard');
  }

  return <UsersContent userId={session.user.id} />;
}
