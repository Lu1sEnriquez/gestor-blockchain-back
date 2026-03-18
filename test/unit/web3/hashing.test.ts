import { canonicalizeJson, hashCanonicalJson, sha256Hex } from '@/src/shared/crypto/hashing';

describe('hashing utils', () => {
  it('canonicalizes objects with sorted keys', () => {
    const payload = { b: 2, a: 1 };
    expect(canonicalizeJson(payload)).toBe('{"a":1,"b":2}');
  });

  it('canonicalizes nested objects and arrays deterministically', () => {
    const payload = {
      meta: { z: 2, a: 1 },
      rows: [{ id: 2 }, { id: 1 }],
    };

    expect(canonicalizeJson(payload)).toBe(
      '{"meta":{"a":1,"z":2},"rows":[{"id":2},{"id":1}]}',
    );
  });

  it('produces same hash for semantically equal objects with different key order', () => {
    const payloadA = { name: 'doc', data: { y: 2, x: 1 } };
    const payloadB = { data: { x: 1, y: 2 }, name: 'doc' };

    expect(hashCanonicalJson(payloadA)).toBe(hashCanonicalJson(payloadB));
  });

  it('calculates sha256 in hex format', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('throws on unsupported values', () => {
    expect(() => canonicalizeJson(Symbol('x'))).toThrow('Unsupported type');
  });
});
