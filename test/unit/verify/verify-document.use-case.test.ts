import { RevocationQueueRepository } from '@/src/modules/events/application/sagas/revocation.saga';
import {
  BlockchainVerifyAdapter,
  VerifyDocumentUseCase,
  VerifyDocumentDTO,
  VerifyLookupDocument,
  VerifyLookupRepository,
} from '@/src/modules/verify/application/use-cases/verify-document.use-case';
import { hashCanonicalJson } from '@/src/shared/crypto/hashing';
import { buildMerkleTree, getMerkleProof } from '@/src/shared/web3/merkle';

class InMemoryRevocationQueueRepository implements RevocationQueueRepository {
  private revoked = new Set<string>();

  markRevoked(hash: string) {
    this.revoked.add(hash);
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
}

class InMemoryVerifyLookupRepository implements VerifyLookupRepository {
  private readonly documents = new Map<string, VerifyLookupDocument>();
  private readonly hashesByBatch = new Map<string, string[]>();

  seed(document: VerifyLookupDocument, batchHashes: string[]) {
    this.documents.set(document.institutionalFolio, document);
    this.hashesByBatch.set(document.batchId, batchHashes);
  }

  async findByInstitutionalFolio(institutionalFolio: string): Promise<VerifyLookupDocument | null> {
    return this.documents.get(institutionalFolio) ?? null;
  }

  async listBatchHashes(batchId: string): Promise<string[]> {
    return this.hashesByBatch.get(batchId) ?? [];
  }
}

class StubBlockchainVerifyAdapter implements BlockchainVerifyAdapter {
  constructor(private readonly result: { anchored: boolean; revoked: boolean }) {}

  async verifyHashAndRoot(): Promise<{ anchored: boolean; revoked: boolean }> {
    return this.result;
  }
}

class FailingBlockchainVerifyAdapter implements BlockchainVerifyAdapter {
  async verifyHashAndRoot(): Promise<{ anchored: boolean; revoked: boolean }> {
    throw new Error('RPC unavailable');
  }
}

function buildRequest(payload: unknown, leaves: string[]): VerifyDocumentDTO {
  const computedHash = hashCanonicalJson(payload);
  const index = leaves.indexOf(computedHash);
  const tree = buildMerkleTree(leaves);
  const proof = getMerkleProof(leaves, index);

  return {
    payload,
    merkleRoot: tree.root,
    proof,
    expectedHash: computedHash,
  };
}

describe('VerifyDocumentUseCase', () => {
  it('returns VALID for non-revoked document with valid proof', async () => {
    const repo = new InMemoryRevocationQueueRepository();
    const useCase = new VerifyDocumentUseCase(repo);

    const payload = { studentId: 'A001', name: 'Luis' };
    const hash = hashCanonicalJson(payload);
    const leaves = [hash, hashCanonicalJson({ studentId: 'A002', name: 'Ana' })];

    const result = await useCase.execute(buildRequest(payload, leaves));

    expect(result.status).toBe('VALID');
    expect(result.revoked).toBe(false);
    expect(result.proofValid).toBe(true);
  });

  it('returns REVOKED when hash exists in revocation queue', async () => {
    const repo = new InMemoryRevocationQueueRepository();
    const useCase = new VerifyDocumentUseCase(repo);

    const payload = { studentId: 'A003', name: 'Carlos' };
    const hash = hashCanonicalJson(payload);
    const leaves = [hash, hashCanonicalJson({ studentId: 'A004', name: 'Sofia' })];
    repo.markRevoked(hash);

    const result = await useCase.execute(buildRequest(payload, leaves));

    expect(result.status).toBe('REVOKED');
    expect(result.revoked).toBe(true);
    expect(result.proofValid).toBe(true);
  });

  it('returns ALTERED when expected hash mismatches payload hash', async () => {
    const repo = new InMemoryRevocationQueueRepository();
    const useCase = new VerifyDocumentUseCase(repo);

    const payload = { studentId: 'A005', name: 'Eva' };
    const hash = hashCanonicalJson(payload);
    const leaves = [hash, hashCanonicalJson({ studentId: 'A006', name: 'Pablo' })];
    const request = buildRequest(payload, leaves);

    const result = await useCase.execute({
      ...request,
      expectedHash: 'deadbeef',
    });

    expect(result.status).toBe('ALTERED');
    expect(result.proofValid).toBe(false);
  });

  it('returns INVALID_PROOF when proof does not match root', async () => {
    const repo = new InMemoryRevocationQueueRepository();
    const useCase = new VerifyDocumentUseCase(repo);

    const payload = { studentId: 'A007', name: 'Mario' };
    const hash = hashCanonicalJson(payload);
    const leaves = [hash, hashCanonicalJson({ studentId: 'A008', name: 'Nora' })];
    const request = buildRequest(payload, leaves);

    const result = await useCase.execute({
      ...request,
      merkleRoot: hashCanonicalJson({ fake: 'root' }),
    });

    expect(result.status).toBe('INVALID_PROOF');
    expect(result.proofValid).toBe(false);
  });

  it('executeByFolio returns VALID and enables download when folio is consistent', async () => {
    const revocations = new InMemoryRevocationQueueRepository();
    const lookup = new InMemoryVerifyLookupRepository();
    const useCase = new VerifyDocumentUseCase(revocations, lookup);

    const payload = { studentId: 'A009', name: 'Elena' };
    const hash = hashCanonicalJson(payload);
    const otherHash = hashCanonicalJson({ studentId: 'A010', name: 'Rosa' });
    const batchHashes = [hash, otherHash];
    const merkleRootHash = buildMerkleTree(batchHashes).root;

    lookup.seed(
      {
        id: 'folio-1',
        institutionalFolio: 'ITSON-2026-0001',
        rawPayloadData: payload,
        originalDataHash: hash,
        pdfStorageUrl: 'https://storage.local/folio-1.pdf',
        isValid: true,
        batchId: 'batch-1',
        merkleRootHash,
      },
      batchHashes,
    );

    const result = await useCase.executeByFolio({
      institutionalFolio: 'ITSON-2026-0001',
      expectedHash: hash,
    });

    expect(result.status).toBe('VALID');
    expect(result.canDownloadPdf).toBe(true);
    expect(result.source).toBe('DATABASE');
  });

  it('executeByFolio returns REVOKED when local folio flag is invalid', async () => {
    const revocations = new InMemoryRevocationQueueRepository();
    const lookup = new InMemoryVerifyLookupRepository();
    const useCase = new VerifyDocumentUseCase(revocations, lookup);

    const payload = { studentId: 'A011', name: 'Lucia' };
    const hash = hashCanonicalJson(payload);

    lookup.seed(
      {
        id: 'folio-2',
        institutionalFolio: 'ITSON-2026-0002',
        rawPayloadData: payload,
        originalDataHash: hash,
        pdfStorageUrl: 'https://storage.local/folio-2.pdf',
        isValid: false,
        batchId: 'batch-2',
        merkleRootHash: buildMerkleTree([hash]).root,
      },
      [hash],
    );

    const result = await useCase.executeByFolio({
      institutionalFolio: 'ITSON-2026-0002',
      expectedHash: hash,
    });

    expect(result.status).toBe('REVOKED');
    expect(result.canDownloadPdf).toBe(false);
    expect(result.proofValid).toBe(false);
  });

  it('executeByFolio returns REVOKED when on-chain reports revoked hash', async () => {
    const revocations = new InMemoryRevocationQueueRepository();
    const lookup = new InMemoryVerifyLookupRepository();
    const onChain = new StubBlockchainVerifyAdapter({ anchored: true, revoked: true });
    const useCase = new VerifyDocumentUseCase(revocations, lookup, onChain);

    const payload = { studentId: 'A012', name: 'Nora' };
    const hash = hashCanonicalJson(payload);
    const otherHash = hashCanonicalJson({ studentId: 'A013', name: 'Leo' });
    const batchHashes = [hash, otherHash];

    lookup.seed(
      {
        id: 'folio-3',
        institutionalFolio: 'ITSON-2026-0003',
        rawPayloadData: payload,
        originalDataHash: hash,
        pdfStorageUrl: 'https://storage.local/folio-3.pdf',
        isValid: true,
        batchId: 'batch-3',
        merkleRootHash: buildMerkleTree(batchHashes).root,
      },
      batchHashes,
    );

    const result = await useCase.executeByFolio({
      institutionalFolio: 'ITSON-2026-0003',
      expectedHash: hash,
    });

    expect(result.status).toBe('REVOKED');
    expect(result.canDownloadPdf).toBe(false);
    expect(result.onChainRevoked).toBe(true);
  });

  it('executeByFolio returns INVALID_PROOF when on-chain root is not anchored', async () => {
    const revocations = new InMemoryRevocationQueueRepository();
    const lookup = new InMemoryVerifyLookupRepository();
    const onChain = new StubBlockchainVerifyAdapter({ anchored: false, revoked: false });
    const useCase = new VerifyDocumentUseCase(revocations, lookup, onChain);

    const payload = { studentId: 'A014', name: 'Rene' };
    const hash = hashCanonicalJson(payload);

    lookup.seed(
      {
        id: 'folio-4',
        institutionalFolio: 'ITSON-2026-0004',
        rawPayloadData: payload,
        originalDataHash: hash,
        pdfStorageUrl: 'https://storage.local/folio-4.pdf',
        isValid: true,
        batchId: 'batch-4',
        merkleRootHash: buildMerkleTree([hash]).root,
      },
      [hash],
    );

    const result = await useCase.executeByFolio({
      institutionalFolio: 'ITSON-2026-0004',
      expectedHash: hash,
    });

    expect(result.status).toBe('INVALID_PROOF');
    expect(result.proofValid).toBe(false);
    expect(result.canDownloadPdf).toBe(false);
    expect(result.onChainVerified).toBe(false);
  });

  it('executeByFolio falls back to local VALID when on-chain check fails', async () => {
    const revocations = new InMemoryRevocationQueueRepository();
    const lookup = new InMemoryVerifyLookupRepository();
    const onChain = new FailingBlockchainVerifyAdapter();
    const useCase = new VerifyDocumentUseCase(revocations, lookup, onChain);

    const payload = { studentId: 'A015', name: 'Diego' };
    const hash = hashCanonicalJson(payload);

    lookup.seed(
      {
        id: 'folio-5',
        institutionalFolio: 'ITSON-2026-0005',
        rawPayloadData: payload,
        originalDataHash: hash,
        pdfStorageUrl: 'https://storage.local/folio-5.pdf',
        isValid: true,
        batchId: 'batch-5',
        merkleRootHash: buildMerkleTree([hash]).root,
      },
      [hash],
    );

    const result = await useCase.executeByFolio({
      institutionalFolio: 'ITSON-2026-0005',
      expectedHash: hash,
    });

    expect(result.status).toBe('VALID');
    expect(result.canDownloadPdf).toBe(true);
    expect(result.onChainFallback).toBe(true);
    expect(result.onChainVerified).toBe(false);
  });
});
