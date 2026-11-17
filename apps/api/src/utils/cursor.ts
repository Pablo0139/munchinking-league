export interface CursorPosition {
  createdAt: string;
  id: string;
}

export function encodeCursor(position: CursorPosition): string {
  return btoa(`${position.createdAt}\n${position.id}`)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function decodeCursor(cursor: string | undefined): CursorPosition | null {
  if (!cursor) return null;
  try {
    const normalized = cursor.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
    const separator = decoded.indexOf('\n');
    if (separator <= 0) return null;
    const createdAt = decoded.slice(0, separator);
    const id = decoded.slice(separator + 1);
    if (!Number.isFinite(Date.parse(createdAt)) || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}
