import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EventDetail } from './event-detail';

export const metadata = {
  title: 'Detalle de Evento',
};

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <EventDetail
      eventId={id}
      userId={session.user.id}
      userRoles={session.user.roles}
    />
  );
}
