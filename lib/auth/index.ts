import NextAuth from 'next-auth';
import { authConfig } from './config';

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Re-export types and config
export { authConfig } from './config';
export type { SessionUser } from './config';
