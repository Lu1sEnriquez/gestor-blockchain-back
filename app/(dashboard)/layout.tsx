import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard/shell';
import { SWRProvider } from '@/components/providers/swr-provider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <SWRProvider>
      <DashboardShell user={session.user}>{children}</DashboardShell>
    </SWRProvider>
  );
}
