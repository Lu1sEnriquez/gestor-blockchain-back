'use client';

import { useMemo, useState } from 'react';
import { Plus, Users as UsersIcon } from 'lucide-react';

import { PageHeader, EmptyState, ErrorState, LoadingState } from '@/components/dashboard/shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCreateUser, useUsers } from '@/hooks/use-users';
import { UserRole } from '@/lib/types';

const roleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.CREATOR]: 'Creador',
  [UserRole.SIGNER]: 'Firmante',
  [UserRole.AUDITOR]: 'Auditor',
};

interface UsersContentProps {
  userId: string;
}

export function UsersContent({ userId }: UsersContentProps) {
  const [filterRole, setFilterRole] = useState<UserRole | undefined>();

  const [fullName, setFullName] = useState('');
  const [institutionalEmail, setInstitutionalEmail] = useState('');
  const [officialPosition, setOfficialPosition] = useState('');
  const [signaturePngUrl, setSignaturePngUrl] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.CREATOR);

  const { users, error, isLoading, mutate } = useUsers({
    requesterUserId: userId,
    role: filterRole,
  });

  const {
    createUser,
    isCreating,
    error: createError,
    clearError: clearCreateError,
  } = useCreateUser();

  const canCreate = useMemo(
    () =>
      fullName.trim() &&
      institutionalEmail.trim() &&
      officialPosition.trim() &&
      signaturePngUrl.trim(),
    [fullName, institutionalEmail, officialPosition, signaturePngUrl],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearCreateError();

    await createUser({
      requesterUserId: userId,
      fullName: fullName.trim(),
      institutionalEmail: institutionalEmail.trim(),
      rolesAssigned: [newRole],
      officialPosition: officialPosition.trim(),
      signaturePngUrl: signaturePngUrl.trim(),
    });

    setFullName('');
    setInstitutionalEmail('');
    setOfficialPosition('');
    setSignaturePngUrl('');
    setNewRole(UserRole.CREATOR);
    mutate();
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Usuarios y Roles"
          description="Administra usuarios institucionales y permisos RBAC"
        />
        <LoadingState message="Cargando usuarios..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Usuarios y Roles"
          description="Administra usuarios institucionales y permisos RBAC"
        />
        <ErrorState
          message={error.error || 'Error al cargar usuarios'}
          retry={() => mutate()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios y Roles"
        description="Administra usuarios institucionales y permisos RBAC"
      />

      <Card>
        <CardHeader>
          <CardTitle>Alta de Usuario</CardTitle>
          <CardDescription>
            Crea usuarios con un rol inicial y datos de firma institucional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {createError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error al crear usuario</AlertTitle>
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre Apellido"
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="institutionalEmail">Correo institucional</Label>
              <Input
                id="institutionalEmail"
                type="email"
                value={institutionalEmail}
                onChange={(e) => setInstitutionalEmail(e.target.value)}
                placeholder="usuario@itson.edu.mx"
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="officialPosition">Puesto oficial</Label>
              <Input
                id="officialPosition"
                value={officialPosition}
                onChange={(e) => setOfficialPosition(e.target.value)}
                placeholder="Coordinador Academico"
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signaturePngUrl">URL firma PNG</Label>
              <Input
                id="signaturePngUrl"
                value={signaturePngUrl}
                onChange={(e) => setSignaturePngUrl(e.target.value)}
                placeholder="https://.../firma.png"
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label>Rol inicial</Label>
              <Select
                value={newRole}
                onValueChange={(value) => setNewRole(value as UserRole)}
                disabled={isCreating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN}>{roleLabels[UserRole.ADMIN]}</SelectItem>
                  <SelectItem value={UserRole.CREATOR}>{roleLabels[UserRole.CREATOR]}</SelectItem>
                  <SelectItem value={UserRole.SIGNER}>{roleLabels[UserRole.SIGNER]}</SelectItem>
                  <SelectItem value={UserRole.AUDITOR}>{roleLabels[UserRole.AUDITOR]}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={!canCreate || isCreating}>
                <Plus className="mr-2 h-4 w-4" />
                {isCreating ? 'Creando...' : 'Crear Usuario'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Usuarios Registrados</CardTitle>
            <CardDescription>
              Filtra por rol para revisión operativa de acceso.
            </CardDescription>
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={filterRole ?? 'ALL'}
              onValueChange={(value) =>
                setFilterRole(value === 'ALL' ? undefined : (value as UserRole))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los roles</SelectItem>
                <SelectItem value={UserRole.ADMIN}>{roleLabels[UserRole.ADMIN]}</SelectItem>
                <SelectItem value={UserRole.CREATOR}>{roleLabels[UserRole.CREATOR]}</SelectItem>
                <SelectItem value={UserRole.SIGNER}>{roleLabels[UserRole.SIGNER]}</SelectItem>
                <SelectItem value={UserRole.AUDITOR}>{roleLabels[UserRole.AUDITOR]}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="h-8 w-8" />}
              title="No hay usuarios para el filtro actual"
              description="Crea un usuario o ajusta el filtro de rol para ver resultados."
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Alta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.institutionalEmail}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.rolesAssigned.map((role) => (
                            <Badge key={`${user.id}-${role}`} variant="secondary">
                              {roleLabels[role]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{user.officialPosition}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString('es-MX')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
