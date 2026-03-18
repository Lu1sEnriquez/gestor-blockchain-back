import { hashCanonicalJson } from '@/src/shared/crypto/hashing';
import { buildMerkleTree, getMerkleProof, verifyMerkleProof } from '@/src/shared/web3/merkle';

describe('merkle utils', () => {
  const leaves = [
    hashCanonicalJson({ id: 1, name: 'a' }),
    hashCanonicalJson({ id: 2, name: 'b' }),
    hashCanonicalJson({ id: 3, name: 'c' }),
    hashCanonicalJson({ id: 4, name: 'd' }),
  ];

  it('builds a deterministic root', () => {
    const tree1 = buildMerkleTree(leaves);
    const tree2 = buildMerkleTree(leaves);

    expect(tree1.root).toBe(tree2.root);
    expect(tree1.layers.length).toBeGreaterThan(1);
  });

  it('creates and verifies proof for each leaf', () => {
    const tree = buildMerkleTree(leaves);

    for (let i = 0; i < leaves.length; i += 1) {
      const proof = getMerkleProof(leaves, i);
      const valid = verifyMerkleProof(leaves[i], proof, tree.root);
      expect(valid).toBe(true);
    }
  });

  it('fails verification with tampered leaf', () => {
    const tree = buildMerkleTree(leaves);
    const proof = getMerkleProof(leaves, 0);

    const tamperedLeaf = hashCanonicalJson({ id: 999, name: 'x' });

    expect(verifyMerkleProof(tamperedLeaf, proof, tree.root)).toBe(false);
  });

  it('supports odd number of leaves by duplicating last node', () => {
    const oddLeaves = leaves.slice(0, 3);
    const tree = buildMerkleTree(oddLeaves);
    const proof = getMerkleProof(oddLeaves, 2);

    expect(verifyMerkleProof(oddLeaves[2], proof, tree.root)).toBe(true);
  });

  it('throws with empty leaves', () => {
    expect(() => buildMerkleTree([])).toThrow('empty leaves');
  });
});
