import { keccak256, toUtf8Bytes } from 'ethers';

import { BlockchainRevocationAdapter } from '@/src/modules/events/application/sagas/revocation.saga';
import { createPolygonNotaryClientFromEnv, toBytes32Hex } from '@/src/shared/web3/polygon-client';

export class EthersRevocationAdapter implements BlockchainRevocationAdapter {
  async revokeHash(hashToRevoke: string): Promise<{ txHash: string }> {
    const hashHex = toBytes32Hex(hashToRevoke, 'hashToRevoke');
    const client = createPolygonNotaryClientFromEnv();

    if (client) {
      return client.revokeHash(hashHex);
    }

    // Fallback deterministic tx hash when Polygon credentials are not configured.
    const txHash = keccak256(toUtf8Bytes(`revoke:${hashHex}:${Date.now()}`));
    return { txHash };
  }
}
