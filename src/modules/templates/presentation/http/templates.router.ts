import express from 'express';

import {
  CreateTemplateUseCase,
  ListTemplatesUseCase,
} from '@/src/modules/templates/application/use-cases/manage-templates.use-cases';

type TemplatesRouterDeps = {
  createTemplateUseCase: CreateTemplateUseCase;
  listTemplatesUseCase: ListTemplatesUseCase;
};

export function createTemplatesRouter(deps: TemplatesRouterDeps): express.Router {
  const router = express.Router();

  router.get('/templates', async (req, res) => {
    try {
      const requesterUserId = String(req.query.requesterUserId ?? '');

      if (!requesterUserId) {
        return res.status(400).json({ error: 'requesterUserId is required' });
      }

      const templates = await deps.listTemplatesUseCase.execute({ requesterUserId });

      return res.status(200).json(
        templates.map((template) => ({
          id: template.id,
          templateName: template.templateName,
          folioPrefix: template.folioPrefix,
          creatorId: template.creatorId,
          craftSchemaJson: template.craftSchemaJson,
        })),
      );
    } catch (error) {
      return handleTemplatesError(error, res);
    }
  });

  router.post('/templates', async (req, res) => {
    try {
      const { requesterUserId, templateName, folioPrefix, craftSchemaJson } = req.body;

      if (!requesterUserId || !templateName || !folioPrefix || !craftSchemaJson) {
        return res.status(400).json({
          error: 'requesterUserId, templateName, folioPrefix and craftSchemaJson are required',
        });
      }

      const created = await deps.createTemplateUseCase.execute({
        requesterUserId,
        templateName,
        folioPrefix,
        craftSchemaJson,
      });

      return res.status(201).json({
        id: created.id,
        templateName: created.templateName,
        folioPrefix: created.folioPrefix,
        creatorId: created.creatorId,
      });
    } catch (error) {
      return handleTemplatesError(error, res);
    }
  });

  return router;
}

function handleTemplatesError(error: unknown, res: express.Response) {
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
