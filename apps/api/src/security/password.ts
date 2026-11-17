const HASH_ALGORITHM = 'SHA-256';
const HASH_PREFIX = 'pbkdf2_sha256';
const FALLBACK_HASH =
  'pbkdf2_sha256$100000$00112233445566778899aabbccddeeff$2e4ad1b7c8f3219c9b8d7a6e5f4c3b2a1f0e9d8c7b6a59483726150493827160';

function fromHex(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return new Uint8Array();
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let mismatch = left.length ^ right.length;
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    mismatch |=
      (left[index % Math.max(left.length, 1)] ?? 0) ^
      (right[index % Math.max(right.length, 1)] ?? 0);
  }
  return mismatch === 0;
}

async function derivePasswordKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
  length: number
): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: HASH_ALGORITHM,
      salt: new Uint8Array(salt).buffer as ArrayBuffer,
      iterations
    },
    material,
    length * 8
  );
  return new Uint8Array(derived);
}

export async function hashPassword(
  password: string,
  options: { iterations?: number; salt?: Uint8Array } = {}
): Promise<string> {
  const iterations = options.iterations ?? 210_000;
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordKey(password, salt, iterations, 32);
  return `${HASH_PREFIX}$${iterations}$${toHex(salt)}$${toHex(hash)}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, iterationsRaw, saltHex, expectedHex] = encodedHash.split('$');
  const iterations = Number(iterationsRaw);
  const salt = saltHex ? fromHex(saltHex) : new Uint8Array();
  const expected = expectedHex ? fromHex(expectedHex) : new Uint8Array();
  const validFormat =
    algorithm === HASH_PREFIX &&
    Number.isInteger(iterations) &&
    iterations >= 10_000 &&
    iterations <= 1_000_000 &&
    salt.length >= 16 &&
    expected.length === 32;

  // Do comparable work for unknown usernames/malformed hashes to reduce user enumeration.
  const effectiveSalt = validFormat ? salt : fromHex('00112233445566778899aabbccddeeff');
  const effectiveIterations = validFormat ? iterations : 100_000;
  const derived = await derivePasswordKey(password, effectiveSalt, effectiveIterations, 32);
  const comparison = validFormat ? expected : fromHex(FALLBACK_HASH.split('$')[3] ?? '00');
  return validFormat && constantTimeEqual(derived, comparison);
}

export async function sha256Hex(value: string): Promise<string> {
  return toHex(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
  );
}

export function createSessionToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}
