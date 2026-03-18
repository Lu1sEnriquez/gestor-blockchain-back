import { auth } from '@/lib/auth';

export default auth;

export const config = {
  matcher: [
    // Match all paths except static files and api routes that don't need auth
    '/((?!_next/static|_next/image|favicon.ico|public/|api/verify|api/health).*)',
  ],
};
