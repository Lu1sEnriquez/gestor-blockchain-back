import { keccak256, toUtf8Bytes } from 'ethers';

import { createPolygonNotaryClientFromEnv, toBytes32Hex } from '@/src/shared/web3/polygon-client';

export interface BlockchainAnchorAdapter {
  anchorMerkleRoot(input: { eventId: string; merkleRoot: string }): Promise<{ txHash: string }>;
}

export class EthersAnchorAdapter implements BlockchainAnchorAdapter {
  async anchorMerkleRoot(input: { eventId: string; merkleRoot: string }): Promise<{ txHash: string }> {
    const rootHex = toBytes32Hex(input.merkleRoot, 'merkleRoot');
    const client = createPolygonNotaryClientFromEnv();

    if (client) {
      return client.anchorMerkleRoot(rootHex);
    }

    // Fallback deterministic hash when Polygon credentials are not configured.
    const txHash = keccak256(
      toUtf8Bytes(`anchor:${input.eventId}:${rootHex}:${Date.now()}`),
    );

    return { txHash };
  }
}
