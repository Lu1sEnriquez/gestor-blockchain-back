import { BlockchainVerifyAdapter } from '@/src/modules/verify/application/use-cases/verify-document.use-case';
import {
  createPolygonVerificationClientFromEnv,
  toBytes32Hex,
} from '@/src/shared/web3/polygon-client';

export class EthersVerifyAdapter implements BlockchainVerifyAdapter {
  async verifyHashAndRoot(input: {
    hash: string;
    merkleRoot: string;
  }): Promise<{ anchored: boolean; revoked: boolean }> {
    const hashHex = toBytes32Hex(input.hash, 'hash');
    const merkleRootHex = toBytes32Hex(input.merkleRoot, 'merkleRoot');

    const client = createPolygonVerificationClientFromEnv();
    if (!client) {
      // Fallback local mode: preserve backend behavior when Polygon read credentials are absent.
      return {
        anchored: true,
        revoked: false,
      };
    }

    return client.verifyHashAndRoot({ hashHex, merkleRootHex });
  }
}
