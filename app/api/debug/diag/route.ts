import { NextResponse } from 'next/server';
import { AppDataSource } from '@/src/shared/db/data-source';
import { UserRepository } from '@/src/modules/users/infrastructure/repositories/user.repository';
import { DocumentTemplateRepository } from '@/src/modules/templates/infrastructure/repositories/document-template.repository';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const diagnostics: Record<string, unknown> = {};

    // 1. Check session
    const session = await auth();
    diagnostics.hasSession = !!session;
    diagnostics.sessionUser = session?.user?.email;

    // 2. Check database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    diagnostics.dbInitialized = AppDataSource.isInitialized;

    // 3. Check users in database
    const userRepo = new UserRepository(AppDataSource);
    const users = await userRepo.findAll();
    diagnostics.usersInDb = users.length;
    diagnostics.userEmails = users.map(u => u.institutionalEmail);

    // 4. Check templates in database
    const templateRepo = new DocumentTemplateRepository(AppDataSource);
    const templates = await templateRepo.findAll();
    diagnostics.templatesInDb = templates.length;

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
