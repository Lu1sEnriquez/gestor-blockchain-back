import express from 'express';

import { VerifyDocumentUseCase } from '@/src/modules/verify/application/use-cases/verify-document.use-case';

type VerifyRouterDeps = {
  verifyDocumentUseCase: VerifyDocumentUseCase;
};

export function createVerifyRouter(deps: VerifyRouterDeps): express.Router {
  const router = express.Router();

  router.get('/verify', async (req, res) => {
    try {
      const folio = typeof req.query.folio === 'string' ? req.query.folio : undefined;
      const hash = typeof req.query.hash === 'string' ? req.query.hash : undefined;

      if (!folio) {
        return res.status(400).json({
          error: 'folio query param is required',
        });
      }

      const result = await deps.verifyDocumentUseCase.executeByFolio({
        institutionalFolio: folio,
        expectedHash: hash,
      });

      return res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      if (message.includes('not found')) {
        return res.status(404).json({ error: message });
      }

      return res.status(400).json({ error: message });
    }
  });

  router.post('/verify', async (req, res) => {
    try {
      const { payload, merkleRoot, proof, expectedHash } = req.body;

      if (!payload || !merkleRoot || !Array.isArray(proof)) {
        return res.status(400).json({
          error: 'payload, merkleRoot and proof[] are required',
        });
      }

      const result = await deps.verifyDocumentUseCase.execute({
        payload,
        merkleRoot,
        proof,
        expectedHash,
      });

      return res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      return res.status(400).json({ error: message });
    }
  });

  return router;
}
