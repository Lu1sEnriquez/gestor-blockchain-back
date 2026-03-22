import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EventsContent } from './events-content';

export const metadata = {
  title: 'Eventos',
  description: 'Gestiona eventos documentales',
};

export default async function EventsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Eventos</h1>
        <p className="text-muted-foreground">
          Crea y gestiona eventos documentales
        </p>
      </div>
      <EventsContent
        userId={session.user.id}
        userRoles={session.user.roles}
      />
    </div>
  );
}
