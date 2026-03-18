import express from 'express';

import { ListAuditsUseCase } from '@/src/modules/audits/application/use-cases/list-audits.use-case';
import { AuditAction } from '@/src/modules/audits/domain/enums/audit-action.enum';

type AuditsRouterDeps = {
  listAuditsUseCase: ListAuditsUseCase;
};

export function createAuditsRouter(deps: AuditsRouterDeps): express.Router {
  const router = express.Router();

  router.get('/audits', async (req, res) => {
    try {
      const requesterUserId = String(req.query.requesterUserId ?? '');
      const userId = req.query.userId ? String(req.query.userId) : undefined;
      const action = parseAuditAction(req.query.action ? String(req.query.action) : undefined);
      const affectedEntity = req.query.affectedEntity
        ? String(req.query.affectedEntity)
        : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      if (!requesterUserId) {
        return res.status(400).json({ error: 'requesterUserId is required' });
      }

      const logs = await deps.listAuditsUseCase.execute({
        requesterUserId,
        userId,
        action,
        affectedEntity,
        limit,
      });

      return res.status(200).json(
        logs.map((log) => ({
          id: log.id,
          userId: log.userId,
          action: log.action,
          affectedEntity: log.affectedEntity,
          affectedEntityId: log.affectedEntityId,
          detailSnapshot: log.detailSnapshot,
          sourceIp: log.sourceIp,
          createdAt: log.createdAt,
        })),
      );
    } catch (error) {
      return handleAuditsError(error, res);
    }
  });

  return router;
}

function handleAuditsError(error: unknown, res: express.Response) {
  const message = error instanceof Error ? error.message : 'Unexpected error';

  if (message.includes('not found')) {
    return res.status(404).json({ error: message });
  }

  if (message.includes('lacks')) {
    return res.status(403).json({ error: message });
  }

  return res.status(400).json({ error: message });
}

function parseAuditAction(value?: string): AuditAction | undefined {
  if (!value) {
    return undefined;
  }

  const maybe = value as AuditAction;
  return Object.values(AuditAction).includes(maybe) ? maybe : undefined;
}
