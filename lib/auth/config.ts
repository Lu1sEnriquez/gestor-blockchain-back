import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { UserRole } from '@/lib/types';

// Tipo extendido para el usuario de sesion
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  officialPosition: string;
}

// Declaracion de tipos extendidos para next-auth
declare module 'next-auth' {
  interface User extends SessionUser {}
  interface Session {
    user: SessionUser;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends SessionUser {}
}

export const authConfig: NextAuthConfig = {
  secret:
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === 'development' ? 'dev-only-secret-change-in-production' : undefined),
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnAuth = nextUrl.pathname.startsWith('/auth');
      const isPublic = nextUrl.pathname.startsWith('/verify') || nextUrl.pathname === '/';

      if (isPublic) {
        return true;
      }

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }

      if (isOnAuth) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? '';
        token.name = user.name ?? '';
        token.roles = user.roles;
        token.officialPosition = user.officialPosition;
      }
      return token;
    },
    session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        name: token.name,
        roles: token.roles,
        officialPosition: token.officialPosition,
      };
      return session;
    },
  },
  providers: [
    Credentials({
      name: 'Credenciales Institucionales',
      credentials: {
        email: { label: 'Correo institucional', type: 'email' },
        password: { label: 'Contrasena', type: 'password' },
      },
      async authorize(credentials) {
        const allowMockAuth =
          process.env.NODE_ENV !== 'production' && process.env.AUTH_ALLOW_MOCK !== 'false';

        if (!allowMockAuth) {
          return null;
        }

        // TODO: Reemplazar con validacion contra fuente institucional
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) {
          return null;
        }

        // Mock users para desarrollo - ELIMINAR EN PRODUCCION
        const mockUsers: Record<string, SessionUser & { password: string }> = {
          'admin@itson.edu.mx': {
            id: '550e8400-e29b-41d4-a716-446655440001',
            email: 'admin@itson.edu.mx',
            name: 'Administrador Sistema',
            roles: [UserRole.ADMIN],
            officialPosition: 'Administrador de Sistemas',
            password: 'admin123',
          },
          'creator@itson.edu.mx': {
            id: '550e8400-e29b-41d4-a716-446655440002',
            email: 'creator@itson.edu.mx',
            name: 'Maria Garcia Lopez',
            roles: [UserRole.CREATOR],
            officialPosition: 'Coordinadora Academica',
            password: 'creator123',
          },
          'signer@itson.edu.mx': {
            id: '550e8400-e29b-41d4-a716-446655440003',
            email: 'signer@itson.edu.mx',
            name: 'Dr. Roberto Martinez',
            roles: [UserRole.SIGNER],
            officialPosition: 'Director General',
            password: 'signer123',
          },
          'auditor@itson.edu.mx': {
            id: '550e8400-e29b-41d4-a716-446655440004',
            email: 'auditor@itson.edu.mx',
            name: 'Ana Lucia Fernandez',
            roles: [UserRole.AUDITOR],
            officialPosition: 'Auditora Interna',
            password: 'auditor123',
          },
          'multi@itson.edu.mx': {
            id: '550e8400-e29b-41d4-a716-446655440005',
            email: 'multi@itson.edu.mx',
            name: 'Carlos Multirol',
            roles: [UserRole.ADMIN, UserRole.CREATOR, UserRole.SIGNER],
            officialPosition: 'Director de Tecnologia',
            password: 'multi123',
          },
        };

        const user = mockUsers[email];
        if (!user || user.password !== password) {
          return null;
        }

        // Retornamos sin la password
        const { password: _, ...sessionUser } = user;
        return sessionUser;
      },
    }),
  ],
};
