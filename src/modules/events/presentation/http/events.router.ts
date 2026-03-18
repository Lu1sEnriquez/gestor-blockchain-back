import express from 'express';

import {
  AuthorizeEventUseCase,
  CreateEventUseCase,
  SignEventUseCase,
} from '@/src/modules/events/application/use-cases/event.use-cases';
import { GenerateDocumentsUseCase } from '@/src/modules/documents/application/use-cases/generate-documents.use-case';
import { ReconcileStagingUseCase } from '@/src/modules/staging/application/use-cases/reconcile-staging.use-case';
import {
  ProcessRevocationQueueUseCase,
  RevokeEventUseCase,
} from '@/src/modules/events/application/use-cases/revoke-event.use-case';

type EventRouterDeps = {
  createEventUseCase: CreateEventUseCase;
  authorizeEventUseCase: AuthorizeEventUseCase;
  signEventUseCase: SignEventUseCase;
  revokeEventUseCase: RevokeEventUseCase;
  processRevocationQueueUseCase: ProcessRevocationQueueUseCase;
  generateDocumentsUseCase: GenerateDocumentsUseCase;
  reconcileStagingUseCase: ReconcileStagingUseCase;
};

export function createEventsRouter(deps: EventRouterDeps): express.Router {
  const router = express.Router();

  router.post('/events', async (req, res) => {
    try {
      const { templateId, eventName, creatorUserId, globalContextInjected } = req.body;

      if (!templateId || !eventName || !creatorUserId) {
        return res.status(400).json({
          error: 'templateId, eventName and creatorUserId are required',
        });
      }

      const created = await deps.createEventUseCase.execute({
        templateId,
        eventName,
        creatorUserId,
        globalContextInjected,
      });

      return res.status(201).json({
        id: created.id,
        eventName: created.eventName,
        templateId: created.templateId,
        creatorId: created.creatorId,
        consensusStatus: created.consensusStatus,
      });
    } catch (error) {
      return handleUseCaseError(error, res);
    }
  });

  router.post('/events/:id/authorize', async (req, res) => {
    try {
      const { authorizerUserId } = req.body;

      if (!authorizerUserId) {
        return res.status(400).json({
          error: 'authorizerUserId is required',
        });
      }

      const updated = await deps.authorizeEventUseCase.execute({
        eventId: req.params.id,
        authorizerUserId,
      });

      return res.status(200).json({
        id: updated.id,
        consensusStatus: updated.consensusStatus,
      });
    } catch (error) {
      return handleUseCaseError(error, res);
    }
  });

  router.post('/events/:id/sign', async (req, res) => {
    try {
      const { signerUserId, documentHashes } = req.body;

      if (!signerUserId || !Array.isArray(documentHashes)) {
        return res.status(400).json({
          error: 'signerUserId and documentHashes[] are required',
        });
      }

      const updated = await deps.signEventUseCase.execute({
        eventId: req.params.id,
        signerUserId,
        documentHashes,
      });

      return res.status(200).json({
        id: updated.id,
        consensusStatus: updated.consensusStatus,
      });
    } catch (error) {
      return handleUseCaseError(error, res);
    }
  });

  router.post('/events/:id/revoke', async (req, res) => {
    try {
      const { requesterUserId, hashToRevoke, idempotencyKey } = req.body;

      if (!requesterUserId || !hashToRevoke || !idempotencyKey) {
        return res.status(400).json({
          error: 'requesterUserId, hashToRevoke and idempotencyKey are required',
        });
      }

      const job = await deps.revokeEventUseCase.execute({
        eventId: req.params.id,
        requesterUserId,
        hashToRevoke,
        idempotencyKey,
      });

      return res.status(202).json({
        id: job.id,
        eventId: job.eventId,
        status: job.status,
        txHash: job.txHash,
        attemptCount: job.attemptCount,
      });
    } catch (error) {
      return handleUseCaseError(error, res);
    }
  });

  router.post('/events/revocations/process', async (req, res) => {
    try {
      const requesterUserId = String(req.body?.requesterUserId ?? '');
      const maxJobs = Number(req.body?.maxJobs);

      if (!requesterUserId) {
        return res.status(400).json({
          error: 'requesterUserId is required',
        });
      }

      const result = await deps.processRevocationQueueUseCase.execute({
        requesterUserId,
        maxJobs: Number.isFinite(maxJobs) ? maxJobs : undefined,
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleUseCaseError(error, res);
    }
  });

  router.post('/events/:id/generate', async (req, res) => {
    try {
      const { generatorUserId, rows, batchType, revokedHashToReplace } = req.body;

      if (!generatorUserId || !Array.isArray(rows)) {
        return res.status(400).json({
          error: 'generatorUserId and rows[] are required',
        });
      }

      const result = await deps.generateDocumentsUseCase.execute({
        eventId: req.params.id,
        generatorUserId,
        rows,
        batchType,
        revokedHashToReplace,
      });

      return res.status(201).json(result);
    } catch (error) {
      return handleUseCaseError(error, res);
    }
  });

  router.post('/events/:id/staging/reconcile', async (req, res) => {
    try {
      const { operatorUserId, declaredZones, rows, zipBundles } = req.body;

      if (!operatorUserId || !Array.isArray(declaredZones) || !Array.isArray(rows)) {
        return res.status(400).json({
          error: 'operatorUserId, declaredZones[] and rows[] are required',
        });
      }

      const result = await deps.reconcileStagingUseCase.execute({
        eventId: req.params.id,
        operatorUserId,
        declaredZones,
        rows,
        zipBundles: Array.isArray(zipBundles) ? zipBundles : [],
      });

      return res.status(200).json(result);
    } catch (error) {
      return handleUseCaseError(error, res);
    }
  });

  return router;
}

function handleUseCaseError(error: unknown, res: express.Response) {
  const message = error instanceof Error ? error.message : 'Unexpected error';

  if (message.includes('not found')) {
    return res.status(404).json({ error: message });
  }

  if (message.includes('lacks')) {
    return res.status(403).json({ error: message });
  }

  if (message.includes('Cannot transition')) {
    return res.status(409).json({ error: message });
  }

  if (message.includes('cannot be revoked')) {
    return res.status(409).json({ error: message });
  }

  if (message.includes('required SIGNED')) {
    return res.status(409).json({ error: message });
  }

  if (message.includes('required SIGNED or COMPLETED')) {
    return res.status(409).json({ error: message });
  }

  if (message.includes('requires a previously revoked hash')) {
    return res.status(409).json({ error: message });
  }

  if (message.includes('cannot be empty')) {
    return res.status(400).json({ error: message });
  }

  return res.status(400).json({ error: message });
}
