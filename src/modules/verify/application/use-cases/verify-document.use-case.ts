import { MerkleProofItem, getMerkleProof, verifyMerkleProof } from '@/src/shared/web3/merkle';
import { hashCanonicalJson } from '@/src/shared/crypto/hashing';
import { RevocationQueueRepository } from '@/src/modules/events/application/sagas/revocation.saga';

export type VerifyStatus = 'VALID' | 'REVOKED' | 'ALTERED' | 'INVALID_PROOF';

export interface VerifyDocumentDTO {
  payload: unknown;
  merkleRoot: string;
  proof: MerkleProofItem[];
  expectedHash?: string;
}

export interface VerifyDocumentResult {
  status: VerifyStatus;
  computedHash: string;
  revoked: boolean;
  proofValid: boolean;
  institutionalFolio?: string;
  pdfStorageUrl?: string;
  canDownloadPdf?: boolean;
  payload?: unknown;
  source?: 'REQUEST' | 'DATABASE';
  onChainVerified?: boolean;
  onChainRevoked?: boolean;
  onChainFallback?: boolean;
}

export interface VerifyByFolioDTO {
  institutionalFolio: string;
  expectedHash?: string;
}

export interface VerifyLookupDocument {
  id: string;
  institutionalFolio: string;
  rawPayloadData: Record<string, unknown>;
  originalDataHash: string;
  pdfStorageUrl: string;
  isValid: boolean;
  batchId: string;
  merkleRootHash: string;
}

export interface VerifyLookupRepository {
  findByInstitutionalFolio(institutionalFolio: string): Promise<VerifyLookupDocument | null>;
  listBatchHashes(batchId: string): Promise<string[]>;
}

export interface BlockchainVerifyAdapter {
  verifyHashAndRoot(input: {
    hash: string;
    merkleRoot: string;
  }): Promise<{ anchored: boolean; revoked: boolean }>;
}

export class VerifyDocumentUseCase {
  constructor(
    private readonly revocationQueueRepository: RevocationQueueRepository,
    private readonly verifyLookupRepository?: VerifyLookupRepository,
    private readonly blockchainVerifyAdapter?: BlockchainVerifyAdapter,
  ) {}

  async execute(dto: VerifyDocumentDTO): Promise<VerifyDocumentResult> {
    const computedHash = hashCanonicalJson(dto.payload);

    if (dto.expectedHash && dto.expectedHash !== computedHash) {
      return {
        status: 'ALTERED',
        computedHash,
        revoked: false,
        proofValid: false,
      };
    }

    const proofValid = verifyMerkleProof(computedHash, dto.proof, dto.merkleRoot);
    if (!proofValid) {
      return {
        status: 'INVALID_PROOF',
        computedHash,
        revoked: false,
        proofValid: false,
      };
    }

    const revoked = await this.revocationQueueRepository.isHashRevoked(computedHash);
    if (revoked) {
      return {
        status: 'REVOKED',
        computedHash,
        revoked: true,
        proofValid: true,
      };
    }

    return {
      status: 'VALID',
      computedHash,
      revoked: false,
      proofValid: true,
      source: 'REQUEST',
    };
  }

  async executeByFolio(dto: VerifyByFolioDTO): Promise<VerifyDocumentResult> {
    if (!this.verifyLookupRepository) {
      throw new Error('Verify lookup repository is required for folio-based verification');
    }

    const document = await this.verifyLookupRepository.findByInstitutionalFolio(dto.institutionalFolio);
    if (!document) {
      throw new Error(`Document with folio ${dto.institutionalFolio} not found`);
    }

    const computedHash = hashCanonicalJson(document.rawPayloadData);

    if (dto.expectedHash && dto.expectedHash !== computedHash) {
      return {
        status: 'ALTERED',
        computedHash,
        revoked: false,
        proofValid: false,
        institutionalFolio: document.institutionalFolio,
        pdfStorageUrl: document.pdfStorageUrl,
        canDownloadPdf: false,
        payload: document.rawPayloadData,
        source: 'DATABASE',
      };
    }

    if (document.originalDataHash !== computedHash) {
      return {
        status: 'ALTERED',
        computedHash,
        revoked: false,
        proofValid: false,
        institutionalFolio: document.institutionalFolio,
        pdfStorageUrl: document.pdfStorageUrl,
        canDownloadPdf: false,
        payload: document.rawPayloadData,
        source: 'DATABASE',
      };
    }

    if (!document.isValid) {
      return {
        status: 'REVOKED',
        computedHash,
        revoked: true,
        proofValid: false,
        institutionalFolio: document.institutionalFolio,
        pdfStorageUrl: document.pdfStorageUrl,
        canDownloadPdf: false,
        payload: document.rawPayloadData,
        source: 'DATABASE',
      };
    }

    const revoked = await this.revocationQueueRepository.isHashRevoked(computedHash);
    if (revoked) {
      return {
        status: 'REVOKED',
        computedHash,
        revoked: true,
        proofValid: false,
        institutionalFolio: document.institutionalFolio,
        pdfStorageUrl: document.pdfStorageUrl,
        canDownloadPdf: false,
        payload: document.rawPayloadData,
        source: 'DATABASE',
      };
    }

    const batchHashes = await this.verifyLookupRepository.listBatchHashes(document.batchId);
    if (batchHashes.length === 0) {
      return {
        status: 'INVALID_PROOF',
        computedHash,
        revoked: false,
        proofValid: false,
        institutionalFolio: document.institutionalFolio,
        pdfStorageUrl: document.pdfStorageUrl,
        canDownloadPdf: false,
        payload: document.rawPayloadData,
        source: 'DATABASE',
      };
    }

    const targetIndex = batchHashes.findIndex((hash) => hash === computedHash);
    if (targetIndex < 0) {
      return {
        status: 'INVALID_PROOF',
        computedHash,
        revoked: false,
        proofValid: false,
        institutionalFolio: document.institutionalFolio,
        pdfStorageUrl: document.pdfStorageUrl,
        canDownloadPdf: false,
        payload: document.rawPayloadData,
        source: 'DATABASE',
      };
    }

    const proof = getMerkleProof(batchHashes, targetIndex);
    const proofValid = verifyMerkleProof(computedHash, proof, document.merkleRootHash);

    if (!proofValid) {
      return {
        status: 'INVALID_PROOF',
        computedHash,
        revoked: false,
        proofValid: false,
        institutionalFolio: document.institutionalFolio,
        pdfStorageUrl: document.pdfStorageUrl,
        canDownloadPdf: false,
        payload: document.rawPayloadData,
        source: 'DATABASE',
      };
    }

    if (this.blockchainVerifyAdapter) {
      let onChain: { anchored: boolean; revoked: boolean };
      try {
        onChain = await this.blockchainVerifyAdapter.verifyHashAndRoot({
          hash: computedHash,
          merkleRoot: document.merkleRootHash,
        });
      } catch {
        // Fallback to local verification when RPC/contract reads are unavailable.
        return {
          status: 'VALID',
          computedHash,
          revoked: false,
          proofValid: true,
          institutionalFolio: document.institutionalFolio,
          pdfStorageUrl: document.pdfStorageUrl,
          canDownloadPdf: true,
          payload: document.rawPayloadData,
          source: 'DATABASE',
          onChainVerified: false,
          onChainRevoked: false,
          onChainFallback: true,
        };
      }

      if (onChain.revoked) {
        return {
          status: 'REVOKED',
          computedHash,
          revoked: true,
          proofValid: true,
          institutionalFolio: document.institutionalFolio,
          pdfStorageUrl: document.pdfStorageUrl,
          canDownloadPdf: false,
          payload: document.rawPayloadData,
          source: 'DATABASE',
          onChainVerified: onChain.anchored,
          onChainRevoked: onChain.revoked,
        };
      }

      if (!onChain.anchored) {
        return {
          status: 'INVALID_PROOF',
          computedHash,
          revoked: false,
          proofValid: false,
          institutionalFolio: document.institutionalFolio,
          pdfStorageUrl: document.pdfStorageUrl,
          canDownloadPdf: false,
          payload: document.rawPayloadData,
          source: 'DATABASE',
          onChainVerified: onChain.anchored,
          onChainRevoked: onChain.revoked,
        };
      }
    }

    return {
      status: 'VALID',
      computedHash,
      revoked: false,
      proofValid: true,
      institutionalFolio: document.institutionalFolio,
      pdfStorageUrl: document.pdfStorageUrl,
      canDownloadPdf: true,
      payload: document.rawPayloadData,
      source: 'DATABASE',
      onChainVerified: this.blockchainVerifyAdapter ? true : undefined,
      onChainRevoked: this.blockchainVerifyAdapter ? false : undefined,
      onChainFallback: false,
    };
  }
}
