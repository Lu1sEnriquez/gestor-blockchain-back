import { AppDataSource } from '@/src/shared/db/data-source';
import { UserEntity } from '@/src/modules/users/infrastructure/entities/user.entity';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';

async function seedUsers() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepository = AppDataSource.getRepository(UserEntity);

    // Mock users - deben coincidir con lib/auth/config.ts
    const mockUsers: Array<{
      id: string;
      fullName: string;
      institutionalEmail: string;
      rolesAssigned: UserRole[];
      officialPosition: string;
    }> = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        fullName: 'Administrador Sistema',
        institutionalEmail: 'admin@itson.edu.mx',
        rolesAssigned: [UserRole.ADMIN],
        officialPosition: 'Administrador de Sistemas',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        fullName: 'Maria Garcia Lopez',
        institutionalEmail: 'creator@itson.edu.mx',
        rolesAssigned: [UserRole.CREATOR],
        officialPosition: 'Coordinadora Academica',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        fullName: 'Dr. Roberto Martinez',
        institutionalEmail: 'signer@itson.edu.mx',
        rolesAssigned: [UserRole.SIGNER],
        officialPosition: 'Director General',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        fullName: 'Ana Lucia Fernandez',
        institutionalEmail: 'auditor@itson.edu.mx',
        rolesAssigned: [UserRole.AUDITOR],
        officialPosition: 'Auditora Interna',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        fullName: 'Carlos Multirol',
        institutionalEmail: 'multi@itson.edu.mx',
        rolesAssigned: [UserRole.ADMIN, UserRole.CREATOR, UserRole.SIGNER],
        officialPosition: 'Director de Tecnologia',
      },
    ];

    for (const user of mockUsers) {
      const existing = await userRepository.findOne({
        where: { id: user.id },
      });

      if (!existing) {
        const newUser = userRepository.create(user);
        await userRepository.save(newUser);
        console.log(`✓ Usuario creado: ${user.institutionalEmail}`);
      } else {
        console.log(`⊘ Usuario ya existe: ${user.institutionalEmail}`);
      }
    }

    console.log('\n✓ Seed de usuarios completado');
    process.exit(0);
  } catch (error) {
    console.error('Error en seed:', error);
    process.exit(1);
  }
}

seedUsers();
