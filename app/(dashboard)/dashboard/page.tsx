import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { roleLabels } from '@/lib/navigation';
import { UserRole } from '@/lib/types';
import {
  FileText,
  Calendar,
  Users,
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { user } = session;
  const isAdmin = user.roles.includes(UserRole.ADMIN);
  const isCreator = user.roles.includes(UserRole.CREATOR);
  const isSigner = user.roles.includes(UserRole.SIGNER);
  const isAuditor = user.roles.includes(UserRole.AUDITOR);

  return (
    <div>
      <PageHeader
        title={`Bienvenido, ${user.name.split(' ')[0]}`}
        description="Panel de control del Sistema Gestor Documental Institucional"
      />

      {/* Role badges */}
      <div className="mb-6 flex flex-wrap gap-2">
        {user.roles.map((role) => (
          <Badge key={role} variant="secondary">
            {roleLabels[role]}
          </Badge>
        ))}
      </div>

      {/* Quick stats - different by role */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(isAdmin || isCreator) && (
          <StatsCard
            title="Plantillas"
            value="--"
            description="Plantillas activas"
            icon={<FileText className="h-5 w-5" />}
          />
        )}
        {(isAdmin || isCreator || isSigner) && (
          <StatsCard
            title="Eventos"
            value="--"
            description="Eventos en proceso"
            icon={<Calendar className="h-5 w-5" />}
          />
        )}
        {isAdmin && (
          <StatsCard
            title="Usuarios"
            value="--"
            description="Usuarios registrados"
            icon={<Users className="h-5 w-5" />}
          />
        )}
        {(isAdmin || isAuditor) && (
          <StatsCard
            title="Auditorias"
            value="--"
            description="Registros hoy"
            icon={<Shield className="h-5 w-5" />}
          />
        )}
      </div>

      {/* Quick actions by role */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending actions */}
        {(isCreator || isSigner) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Acciones Pendientes
              </CardTitle>
              <CardDescription>
                Tareas que requieren tu atencion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isSigner && (
                  <PendingItem
                    title="Eventos por firmar"
                    count={0}
                    status="warning"
                  />
                )}
                {isCreator && (
                  <PendingItem
                    title="Eventos por autorizar"
                    count={0}
                    status="info"
                  />
                )}
                <PendingItem
                  title="Staging pendiente"
                  count={0}
                  status="info"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Actividad Reciente
            </CardTitle>
            <CardDescription>Ultimas acciones en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No hay actividad reciente para mostrar
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System status (Admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Estado del Sistema</CardTitle>
              <CardDescription>Salud de servicios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <StatusItem name="Base de datos" status="operational" />
                <StatusItem name="Blockchain (Polygon)" status="operational" />
                <StatusItem name="Almacenamiento" status="operational" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Stats card component
function StatsCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// Pending item component
function PendingItem({
  title,
  count,
  status,
}: {
  title: string;
  count: number;
  status: 'warning' | 'info';
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <span className="text-sm">{title}</span>
      <Badge variant={status === 'warning' ? 'warning' : 'secondary'}>
        {count}
      </Badge>
    </div>
  );
}

// Status item component
function StatusItem({
  name,
  status,
}: {
  name: string;
  status: 'operational' | 'degraded' | 'down';
}) {
  const statusConfig = {
    operational: { label: 'Operativo', color: 'bg-emerald-500' },
    degraded: { label: 'Degradado', color: 'bg-amber-500' },
    down: { label: 'Caido', color: 'bg-red-500' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{name}</span>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${config.color}`} />
        <span className="text-xs text-muted-foreground">{config.label}</span>
      </div>
    </div>
  );
}
