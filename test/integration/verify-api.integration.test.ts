import express from 'express';
import request from 'supertest';

import { RevocationQueueRepository } from '@/src/modules/events/application/sagas/revocation.saga';
import {
  VerifyDocumentUseCase,
  VerifyLookupDocument,
  VerifyLookupRepository,
} from '@/src/modules/verify/application/use-cases/verify-document.use-case';
import { createVerifyRouter } from '@/src/modules/verify/presentation/http/verify.router';
import { hashCanonicalJson } from '@/src/shared/crypto/hashing';
import { buildMerkleTree, getMerkleProof } from '@/src/shared/web3/merkle';

class InMemoryVerifyRepository implements RevocationQueueRepository, VerifyLookupRepository {
  private revoked = new Set<string>();
  private readonly documents = new Map<string, VerifyLookupDocument>();
  private readonly hashesByBatch = new Map<string, string[]>();

  markRevoked(hash: string) {
    this.revoked.add(hash);
  }

  seed(document: VerifyLookupDocument, batchHashes: string[]) {
    this.documents.set(document.institutionalFolio, document);
    this.hashesByBatch.set(document.batchId, batchHashes);
  }

  async findByIdempotencyKey(): Promise<null> {
    return null;
  }

  async create(): Promise<void> {
    return;
  }

  async findProcessable(): Promise<null> {
    return null;
  }

  async save(): Promise<void> {
    return;
  }

  async isHashRevoked(hashToRevoke: string): Promise<boolean> {
    return this.revoked.has(hashToRevoke);
  }

  async findByInstitutionalFolio(institutionalFolio: string): Promise<VerifyLookupDocument | null> {
    return this.documents.get(institutionalFolio) ?? null;
  }

  async listBatchHashes(batchId: string): Promise<string[]> {
    return this.hashesByBatch.get(batchId) ?? [];
  }
}

describe('Verify API integration', () => {
  it('returns VALID for valid proof and non-revoked hash', async () => {
    const repo = new InMemoryVerifyRepository();
    const useCase = new VerifyDocumentUseCase(repo, repo);

    const app = express();
    app.use(express.json());
    app.use(createVerifyRouter({ verifyDocumentUseCase: useCase }));

    const payload = { studentId: 'IT-001', fullName: 'Luis Lara' };
    const hash = hashCanonicalJson(payload);
    const other = hashCanonicalJson({ studentId: 'IT-002', fullName: 'Ana Ruiz' });
    const leaves = [hash, other];
    const tree = buildMerkleTree(leaves);
    const proof = getMerkleProof(leaves, 0);

    const response = await request(app).post('/verify').send({
      payload,
      merkleRoot: tree.root,
      proof,
      expectedHash: hash,
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('VALID');
  });

  it('returns REVOKED when hash is marked revoked', async () => {
    const repo = new InMemoryVerifyRepository();
    const useCase = new VerifyDocumentUseCase(repo, repo);

    const app = express();
    app.use(express.json());
    app.use(createVerifyRouter({ verifyDocumentUseCase: useCase }));

    const payload = { studentId: 'IT-003', fullName: 'Carlos Diaz' };
    const hash = hashCanonicalJson(payload);
    const other = hashCanonicalJson({ studentId: 'IT-004', fullName: 'Nora Solis' });
    const leaves = [hash, other];
    const tree = buildMerkleTree(leaves);
    const proof = getMerkleProof(leaves, 0);

    repo.markRevoked(hash);

    const response = await request(app).post('/verify').send({
      payload,
      merkleRoot: tree.root,
      proof,
      expectedHash: hash,
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('REVOKED');
  });

  it('returns ALTERED when payload hash differs from expectedHash', async () => {
    const repo = new InMemoryVerifyRepository();
    const useCase = new VerifyDocumentUseCase(repo, repo);

    const app = express();
    app.use(express.json());
    app.use(createVerifyRouter({ verifyDocumentUseCase: useCase }));

    const payload = { studentId: 'IT-005', fullName: 'Maria Lopez' };
    const hash = hashCanonicalJson(payload);
    const other = hashCanonicalJson({ studentId: 'IT-006', fullName: 'Juan Perez' });
    const leaves = [hash, other];
    const tree = buildMerkleTree(leaves);
    const proof = getMerkleProof(leaves, 0);

    const response = await request(app).post('/verify').send({
      payload,
      merkleRoot: tree.root,
      proof,
      expectedHash: '0xdeadbeef',
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ALTERED');
    expect(response.body.proofValid).toBe(false);
  });

  it('returns INVALID_PROOF when proof does not belong to provided root', async () => {
    const repo = new InMemoryVerifyRepository();
    const useCase = new VerifyDocumentUseCase(repo, repo);

    const app = express();
    app.use(express.json());
    app.use(createVerifyRouter({ verifyDocumentUseCase: useCase }));

    const payload = { studentId: 'IT-007', fullName: 'Sofia Mora' };
    const hash = hashCanonicalJson(payload);
    const other = hashCanonicalJson({ studentId: 'IT-008', fullName: 'Diego Luna' });
    const leaves = [hash, other];
    const tree = buildMerkleTree(leaves);
    const proof = getMerkleProof(leaves, 0);
    const invalidRoot = hashCanonicalJson({ fake: 'root' });

    const response = await request(app).post('/verify').send({
      payload,
      merkleRoot: invalidRoot,
      proof,
      expectedHash: hash,
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('INVALID_PROOF');
    expect(response.body.proofValid).toBe(false);
    expect(response.body.computedHash).not.toBe(tree.root);
  });

  it('returns VALID on GET /verify with folio+hash using payload from repository', async () => {
    const repo = new InMemoryVerifyRepository();
    const useCase = new VerifyDocumentUseCase(repo, repo);

    const app = express();
    app.use(express.json());
    app.use(createVerifyRouter({ verifyDocumentUseCase: useCase }));

    const payload = { studentId: 'IT-100', fullName: 'Alma Vera' };
    const hash = hashCanonicalJson(payload);
    const otherHash = hashCanonicalJson({ studentId: 'IT-101', fullName: 'Bruno Rey' });
    const batchHashes = [hash, otherHash];

    repo.seed(
      {
        id: 'folio-100',
        institutionalFolio: 'ITSON-2026-0100',
        rawPayloadData: payload,
        originalDataHash: hash,
        pdfStorageUrl: 'https://storage.local/ITSON-2026-0100.pdf',
        isValid: true,
        batchId: 'batch-100',
        merkleRootHash: buildMerkleTree(batchHashes).root,
      },
      batchHashes,
    );

    const response = await request(app).get('/verify').query({
      folio: 'ITSON-2026-0100',
      hash,
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('VALID');
    expect(response.body.canDownloadPdf).toBe(true);
    expect(response.body.institutionalFolio).toBe('ITSON-2026-0100');
  });

  it('returns REVOKED on GET /verify when local folio is invalid', async () => {
    const repo = new InMemoryVerifyRepository();
    const useCase = new VerifyDocumentUseCase(repo, repo);

    const app = express();
    app.use(express.json());
    app.use(createVerifyRouter({ verifyDocumentUseCase: useCase }));

    const payload = { studentId: 'IT-102', fullName: 'Nadia Solis' };
    const hash = hashCanonicalJson(payload);

    repo.seed(
      {
        id: 'folio-102',
        institutionalFolio: 'ITSON-2026-0102',
        rawPayloadData: payload,
        originalDataHash: hash,
        pdfStorageUrl: 'https://storage.local/ITSON-2026-0102.pdf',
        isValid: false,
        batchId: 'batch-102',
        merkleRootHash: buildMerkleTree([hash]).root,
      },
      [hash],
    );

    const response = await request(app).get('/verify').query({
      folio: 'ITSON-2026-0102',
      hash,
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('REVOKED');
    expect(response.body.canDownloadPdf).toBe(false);
  });
});
