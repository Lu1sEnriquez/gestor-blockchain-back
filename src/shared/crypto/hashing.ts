import { createHash } from 'crypto';

export function canonicalizeJson(value: unknown): string {
  return canonicalizeValue(value);
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function hashCanonicalJson(payload: unknown): string {
  return sha256Hex(canonicalizeJson(payload));
}

function canonicalizeValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  const valueType = typeof value;

  if (valueType === 'string') {
    return JSON.stringify(value);
  }

  if (valueType === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new Error('Cannot canonicalize non-finite number');
    }
    return JSON.stringify(value);
  }

  if (valueType === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeValue(item)).join(',')}]`;
  }

  if (valueType === 'object') {
    const objectValue = value as Record<string, unknown>;
    const keys = Object.keys(objectValue).sort();

    const entries = keys
      .filter((key) => objectValue[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalizeValue(objectValue[key])}`);

    return `{${entries.join(',')}}`;
  }

  throw new Error(`Unsupported type for canonicalization: ${valueType}`);
}
