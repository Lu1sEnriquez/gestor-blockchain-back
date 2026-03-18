import { EthersAnchorAdapter } from '@/src/shared/web3/ethers-anchor.adapter';
import { EthersRevocationAdapter } from '@/src/shared/web3/ethers-revocation.adapter';
import { EthersVerifyAdapter } from '@/src/shared/web3/ethers-verify.adapter';
import { toBytes32Hex } from '@/src/shared/web3/polygon-client';

const ORIGINAL_ENV = process.env;

describe('polygon web3 adapters', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.POLYGON_RPC_URL;
    delete process.env.RPC_URL;
    delete process.env.POLYGON_PRIVATE_KEY;
    delete process.env.POLYGON_CONTRACT_ADDRESS;
    delete process.env.CONTRACT_ADDRESS;
    delete process.env.POLYGON_CONTRACT_ABI_JSON;
    delete process.env.POLYGON_CHAIN_ID;
    delete process.env.CHAIN_ID;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('normalizes plain 64-char hex to bytes32 with 0x prefix', () => {
    const value = 'A'.repeat(64);
    expect(toBytes32Hex(value, 'hash')).toBe(`0x${'a'.repeat(64)}`);
  });

  it('rejects malformed bytes32 values', () => {
    expect(() => toBytes32Hex('xyz', 'hash')).toThrow('must be a 32-byte hex string');
  });

  it('uses fallback tx hash for anchor when Polygon env is not configured', async () => {
    const adapter = new EthersAnchorAdapter();
    const merkleRoot = 'f'.repeat(64);

    const result = await adapter.anchorMerkleRoot({
      eventId: 'event-1',
      merkleRoot,
    });

    expect(result.txHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('uses fallback tx hash for revoke when Polygon env is not configured', async () => {
    const adapter = new EthersRevocationAdapter();
    const hashToRevoke = '1'.repeat(64);

    const result = await adapter.revokeHash(hashToRevoke);

    expect(result.txHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('uses fallback verification when Polygon read env is not configured', async () => {
    const adapter = new EthersVerifyAdapter();

    const result = await adapter.verifyHashAndRoot({
      hash: '2'.repeat(64),
      merkleRoot: '3'.repeat(64),
    });

    expect(result).toEqual({ anchored: true, revoked: false });
  });
});
