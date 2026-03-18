import { Contract, isAddress, JsonRpcProvider, type InterfaceAbi, Wallet } from 'ethers';

type ContractWriteResponse = {
  hash: string;
  wait: () => Promise<unknown>;
};

type NotaryContractBindings = {
  anchorMerkleRoot: (root: string) => Promise<ContractWriteResponse>;
  revokeHash: (hashToRevoke: string) => Promise<ContractWriteResponse>;
};

type NotaryReadContractBindings = Record<string, (...args: unknown[]) => Promise<unknown>>;

export type PolygonNotaryClient = {
  anchorMerkleRoot: (rootHex: string) => Promise<{ txHash: string }>;
  revokeHash: (hashHex: string) => Promise<{ txHash: string }>;
};

export type PolygonVerificationClient = {
  verifyHashAndRoot: (input: {
    hashHex: string;
    merkleRootHex: string;
  }) => Promise<{ anchored: boolean; revoked: boolean }>;
};

const DEFAULT_POLYGON_NOTARY_ABI: InterfaceAbi = [
  'function anchorMerkleRoot(bytes32 merkleRoot) external returns (bool)',
  'function revokeHash(bytes32 hashToRevoke) external returns (bool)',
];

export function toBytes32Hex(value: string, label: string): string {
  const trimmed = value.trim();

  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) {
    return `0x${trimmed.slice(2).toLowerCase()}`;
  }

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return `0x${trimmed.toLowerCase()}`;
  }

  throw new Error(`${label} must be a 32-byte hex string`);
}

export function createPolygonNotaryClientFromEnv(): PolygonNotaryClient | null {
  const rpcUrl = process.env.POLYGON_RPC_URL ?? process.env.RPC_URL;
  const privateKey = process.env.POLYGON_PRIVATE_KEY;
  const contractAddress = process.env.POLYGON_CONTRACT_ADDRESS ?? process.env.CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    return null;
  }

  if (!isAddress(contractAddress)) {
    throw new Error('POLYGON_CONTRACT_ADDRESS must be a valid EVM address');
  }

  const chainIdRaw = process.env.POLYGON_CHAIN_ID ?? process.env.CHAIN_ID;
  const chainId = chainIdRaw ? Number(chainIdRaw) : undefined;

  if (chainIdRaw && (!Number.isInteger(chainId) || Number(chainId) <= 0)) {
    throw new Error('POLYGON_CHAIN_ID must be a positive integer');
  }

  const abi = parseContractAbiFromEnv();
  const provider = chainId ? new JsonRpcProvider(rpcUrl, chainId) : new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(privateKey, provider);
  const contract = new Contract(contractAddress, abi, signer) as unknown as NotaryContractBindings;

  return {
    async anchorMerkleRoot(rootHex: string): Promise<{ txHash: string }> {
      const tx = await contract.anchorMerkleRoot(rootHex);
      await tx.wait();
      return { txHash: tx.hash };
    },
    async revokeHash(hashHex: string): Promise<{ txHash: string }> {
      const tx = await contract.revokeHash(hashHex);
      await tx.wait();
      return { txHash: tx.hash };
    },
  };
}

export function createPolygonVerificationClientFromEnv(): PolygonVerificationClient | null {
  const rpcUrl = process.env.POLYGON_RPC_URL ?? process.env.RPC_URL;
  const contractAddress = process.env.POLYGON_CONTRACT_ADDRESS ?? process.env.CONTRACT_ADDRESS;

  if (!rpcUrl || !contractAddress) {
    return null;
  }

  if (!isAddress(contractAddress)) {
    throw new Error('POLYGON_CONTRACT_ADDRESS must be a valid EVM address');
  }

  const chainIdRaw = process.env.POLYGON_CHAIN_ID ?? process.env.CHAIN_ID;
  const chainId = chainIdRaw ? Number(chainIdRaw) : undefined;

  if (chainIdRaw && (!Number.isInteger(chainId) || Number(chainId) <= 0)) {
    throw new Error('POLYGON_CHAIN_ID must be a positive integer');
  }

  const abi = parseContractAbiFromEnv();
  const provider = chainId ? new JsonRpcProvider(rpcUrl, chainId) : new JsonRpcProvider(rpcUrl);
  const contract = new Contract(contractAddress, abi, provider) as unknown as NotaryReadContractBindings;

  return {
    async verifyHashAndRoot(input: {
      hashHex: string;
      merkleRootHex: string;
    }): Promise<{ anchored: boolean; revoked: boolean }> {
      const revoked = await callFirstBooleanMethod(
        contract,
        ['isHashRevoked', 'revokedHashes', 'revocations'],
        [input.hashHex],
      );

      const anchored = await callFirstBooleanMethod(
        contract,
        ['isMerkleRootAnchored', 'isRootAnchored', 'anchoredRoots', 'merkleRoots'],
        [input.merkleRootHex],
      );

      return { anchored, revoked };
    },
  };
}

async function callFirstBooleanMethod(
  contract: NotaryReadContractBindings,
  methodNames: string[],
  args: unknown[],
): Promise<boolean> {
  for (const methodName of methodNames) {
    const maybeMethod = contract[methodName];

    if (typeof maybeMethod !== 'function') {
      continue;
    }

    const result = await maybeMethod(...args);
    return normalizeBoolResult(result);
  }

  throw new Error(`Polygon contract ABI does not expose any of: ${methodNames.join(', ')}`);
}

function normalizeBoolResult(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'bigint') {
    return value !== 0n;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }

    if (/^0x[0-9a-f]+$/.test(normalized)) {
      return normalized !== '0x0' && normalized !== '0x00';
    }
  }

  throw new Error('Polygon contract read method did not return a boolean-compatible value');
}

function parseContractAbiFromEnv(): InterfaceAbi {
  const abiJson = process.env.POLYGON_CONTRACT_ABI_JSON;

  if (!abiJson) {
    return DEFAULT_POLYGON_NOTARY_ABI;
  }

  try {
    const parsed = JSON.parse(abiJson) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('POLYGON_CONTRACT_ABI_JSON must be a JSON array');
    }

    return parsed as InterfaceAbi;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid ABI JSON';
    throw new Error(`Invalid POLYGON_CONTRACT_ABI_JSON: ${message}`);
  }
}
