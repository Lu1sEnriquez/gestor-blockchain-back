jest.mock('ethers', () => {
  const mockAnchorMerkleRoot = jest.fn();
  const mockRevokeHash = jest.fn();
  const isAddress = jest.fn(() => true);

  const JsonRpcProvider = jest.fn(() => ({ mocked: 'provider' }));
  const Wallet = jest.fn(() => ({ mocked: 'signer' }));
  const Contract = jest.fn(() => ({
    anchorMerkleRoot: mockAnchorMerkleRoot,
    revokeHash: mockRevokeHash,
  }));

  return {
    Contract,
    JsonRpcProvider,
    Wallet,
    isAddress,
    __mocks: {
      mockAnchorMerkleRoot,
      mockRevokeHash,
      Contract,
      JsonRpcProvider,
      Wallet,
      isAddress,
    },
  };
});

import { createPolygonNotaryClientFromEnv } from '@/src/shared/web3/polygon-client';
import * as ethers from 'ethers';

type EthersMockModule = {
  __mocks: {
    mockAnchorMerkleRoot: jest.Mock;
    mockRevokeHash: jest.Mock;
    Contract: jest.Mock;
    JsonRpcProvider: jest.Mock;
    Wallet: jest.Mock;
    isAddress: jest.Mock;
  };
};

const ORIGINAL_ENV = process.env;
const ethersMock = ethers as unknown as EthersMockModule;

describe('polygon client contract tests (provider mock)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    process.env = {
      ...ORIGINAL_ENV,
      POLYGON_RPC_URL: 'https://rpc-amoy.example',
      POLYGON_PRIVATE_KEY: '0x0123456789012345678901234567890123456789012345678901234567890123',
      POLYGON_CONTRACT_ADDRESS: '0x1111111111111111111111111111111111111111',
      POLYGON_CHAIN_ID: '80002',
    };

    ethersMock.__mocks.isAddress.mockReturnValue(true);
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('creates client and anchors merkle root through mocked provider/contract', async () => {
    ethersMock.__mocks.mockAnchorMerkleRoot.mockResolvedValue({
      hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      wait: jest.fn().mockResolvedValue({ status: 1 }),
    });

    const client = createPolygonNotaryClientFromEnv();
    expect(client).not.toBeNull();

    const result = await client!.anchorMerkleRoot(`0x${'f'.repeat(64)}`);

    expect(ethersMock.__mocks.JsonRpcProvider).toHaveBeenCalledWith('https://rpc-amoy.example', 80002);
    expect(ethersMock.__mocks.Wallet).toHaveBeenCalled();
    expect(ethersMock.__mocks.Contract).toHaveBeenCalled();
    expect(ethersMock.__mocks.mockAnchorMerkleRoot).toHaveBeenCalledWith(`0x${'f'.repeat(64)}`);
    expect(result.txHash).toBe('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('rethrows provider/contract error when rpc call fails', async () => {
    ethersMock.__mocks.mockAnchorMerkleRoot.mockRejectedValue(new Error('RPC down'));

    const client = createPolygonNotaryClientFromEnv();
    expect(client).not.toBeNull();

    await expect(client!.anchorMerkleRoot(`0x${'1'.repeat(64)}`)).rejects.toThrow('RPC down');
  });

  it('rethrows transaction wait error when confirmation fails', async () => {
    ethersMock.__mocks.mockRevokeHash.mockResolvedValue({
      hash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      wait: jest.fn().mockRejectedValue(new Error('timeout while waiting receipt')),
    });

    const client = createPolygonNotaryClientFromEnv();
    expect(client).not.toBeNull();

    await expect(client!.revokeHash(`0x${'2'.repeat(64)}`)).rejects.toThrow(
      'timeout while waiting receipt',
    );
  });

  it('returns null when Polygon env is incomplete', () => {
    delete process.env.POLYGON_PRIVATE_KEY;

    const client = createPolygonNotaryClientFromEnv();

    expect(client).toBeNull();
  });

  it('fails fast when contract address is invalid', () => {
    ethersMock.__mocks.isAddress.mockReturnValue(false);

    expect(() => createPolygonNotaryClientFromEnv()).toThrow(
      'POLYGON_CONTRACT_ADDRESS must be a valid EVM address',
    );
  });
});
