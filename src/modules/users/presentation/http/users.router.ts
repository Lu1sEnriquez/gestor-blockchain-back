import express from 'express';

import {
  CreateUserUseCase,
  ListUsersUseCase,
} from '@/src/modules/users/application/use-cases/manage-users.use-cases';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';

type UsersRouterDeps = {
  createUserUseCase: CreateUserUseCase;
  listUsersUseCase: ListUsersUseCase;
};

export function createUsersRouter(deps: UsersRouterDeps): express.Router {
  const router = express.Router();

  router.get('/users', async (req, res) => {
    try {
      const requesterUserId = String(req.query.requesterUserId ?? '');
      const roleRaw = req.query.role ? String(req.query.role) : undefined;

      if (!requesterUserId) {
        return res.status(400).json({ error: 'requesterUserId is required' });
      }

      const role = roleRaw ? (roleRaw as UserRole) : undefined;
      const users = await deps.listUsersUseCase.execute({
        requesterUserId,
        role,
      });

      return res.status(200).json(
        users.map((user) => ({
          id: user.id,
          fullName: user.fullName,
          institutionalEmail: user.institutionalEmail,
          rolesAssigned: user.rolesAssigned,
          signatureVault: user.signatureVault
            ? {
                officialPosition: user.signatureVault.officialPosition,
                signaturePngUrl: user.signatureVault.signaturePngUrl,
              }
            : null,
        })),
      );
    } catch (error) {
      return handleUsersError(error, res);
    }
  });

  router.post('/users', async (req, res) => {
    try {
      const {
        requesterUserId,
        fullName,
        institutionalEmail,
        rolesAssigned,
        officialPosition,
        signaturePngUrl,
      } = req.body;

      if (
        !requesterUserId ||
        !fullName ||
        !institutionalEmail ||
        !Array.isArray(rolesAssigned) ||
        !officialPosition ||
        !signaturePngUrl
      ) {
        return res.status(400).json({
          error:
            'requesterUserId, fullName, institutionalEmail, rolesAssigned[], officialPosition and signaturePngUrl are required',
        });
      }

      const created = await deps.createUserUseCase.execute({
        requesterUserId,
        fullName,
        institutionalEmail,
        rolesAssigned,
        officialPosition,
        signaturePngUrl,
      });

      return res.status(201).json({
        id: created.id,
        fullName: created.fullName,
        institutionalEmail: created.institutionalEmail,
        rolesAssigned: created.rolesAssigned,
      });
    } catch (error) {
      return handleUsersError(error, res);
    }
  });

  return router;
}

function handleUsersError(error: unknown, res: express.Response) {
  const message = error instanceof Error ? error.message : 'Unexpected error';

  if (message.includes('not found')) {
    return res.status(404).json({ error: message });
  }

  if (message.includes('lacks')) {
    return res.status(403).json({ error: message });
  }

  if (message.includes('already exists')) {
    return res.status(409).json({ error: message });
  }

  return res.status(400).json({ error: message });
}
