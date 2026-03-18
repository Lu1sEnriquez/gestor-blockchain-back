import { NextRequest, NextResponse } from 'next/server';

import { DocumentFolioRepository } from '@/src/modules/documents/infrastructure/repositories/document-folio.repository';
import { TypeOrmRevocationQueueRepository } from '@/src/modules/events/infrastructure/repositories/revocation-queue.repository';
import { VerifyDocumentUseCase } from '@/src/modules/verify/application/use-cases/verify-document.use-case';
import { AppDataSource } from '@/src/shared/db/data-source';
import { EthersVerifyAdapter } from '@/src/shared/web3/ethers-verify.adapter';

async function buildVerifyUseCase(): Promise<VerifyDocumentUseCase> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const revocationRepo = new TypeOrmRevocationQueueRepository(AppDataSource);
  const folioRepository = new DocumentFolioRepository(AppDataSource);
  const verifyAdapter = new EthersVerifyAdapter();

  return new VerifyDocumentUseCase(revocationRepo, {
    async findByInstitutionalFolio(institutionalFolio: string) {
      const document = await folioRepository.findByInstitutionalFolio(institutionalFolio);
      if (!document || !document.batch) {
        return null;
      }

      return {
        id: document.id,
        institutionalFolio: document.institutionalFolio,
        rawPayloadData: document.rawPayloadData,
        originalDataHash: document.originalDataHash,
        pdfStorageUrl: document.pdfStorageUrl,
        isValid: document.isValid,
        batchId: document.batchId,
        merkleRootHash: document.batch.merkleRootHash,
      };
    },
    async listBatchHashes(batchId: string) {
      const documents = await folioRepository.listByBatchId(batchId);
      return documents.map((document) => document.originalDataHash);
    },
  }, verifyAdapter);
}

export async function GET(request: NextRequest) {
  try {
    const folio = request.nextUrl.searchParams.get('folio');
    const hash = request.nextUrl.searchParams.get('hash') ?? undefined;

    if (!folio) {
      return NextResponse.json({ error: 'folio query param is required' }, { status: 400 });
    }

    const verifyDocumentUseCase = await buildVerifyUseCase();
    const result = await verifyDocumentUseCase.executeByFolio({
      institutionalFolio: folio,
      expectedHash: hash,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payload, merkleRoot, proof, expectedHash } = body;

    if (!payload || !merkleRoot || !Array.isArray(proof)) {
      return NextResponse.json(
        { error: 'payload, merkleRoot and proof[] are required' },
        { status: 400 },
      );
    }

    const verifyDocumentUseCase = await buildVerifyUseCase();

    const result = await verifyDocumentUseCase.execute({
      payload,
      merkleRoot,
      proof,
      expectedHash,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
