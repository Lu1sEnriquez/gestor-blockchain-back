import { sha256Hex } from '@/src/shared/crypto/hashing';

export type MerkleProofItem = {
  hash: string;
  position: 'left' | 'right';
};

export type MerkleTree = {
  root: string;
  layers: string[][];
};

export function buildMerkleTree(leaves: string[]): MerkleTree {
  if (leaves.length === 0) {
    throw new Error('Cannot build Merkle tree with empty leaves');
  }

  if (leaves.some((leaf) => leaf.length === 0)) {
    throw new Error('Leaf hash cannot be empty');
  }

  const layers: string[][] = [leaves.slice()];

  while (layers[layers.length - 1].length > 1) {
    const currentLayer = layers[layers.length - 1];
    const nextLayer: string[] = [];

    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = currentLayer[i + 1] ?? currentLayer[i];
      nextLayer.push(hashPair(left, right));
    }

    layers.push(nextLayer);
  }

  return {
    root: layers[layers.length - 1][0],
    layers,
  };
}

export function getMerkleProof(leaves: string[], targetIndex: number): MerkleProofItem[] {
  if (targetIndex < 0 || targetIndex >= leaves.length) {
    throw new Error('Target index out of bounds');
  }

  const tree = buildMerkleTree(leaves);
  const proof: MerkleProofItem[] = [];

  let currentIndex = targetIndex;

  for (let layerIndex = 0; layerIndex < tree.layers.length - 1; layerIndex += 1) {
    const layer = tree.layers[layerIndex];
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

    if (siblingIndex < layer.length) {
      proof.push({
        hash: layer[siblingIndex],
        position: isRightNode ? 'left' : 'right',
      });
    } else {
      proof.push({
        hash: layer[currentIndex],
        position: 'right',
      });
    }

    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
}

export function verifyMerkleProof(
  leaf: string,
  proof: MerkleProofItem[],
  expectedRoot: string,
): boolean {
  let computedHash = leaf;

  for (const item of proof) {
    computedHash =
      item.position === 'left'
        ? hashPair(item.hash, computedHash)
        : hashPair(computedHash, item.hash);
  }

  return computedHash === expectedRoot;
}

function hashPair(left: string, right: string): string {
  return sha256Hex(`${left}:${right}`);
}
