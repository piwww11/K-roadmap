'use client';

export type SyncRow = Record<string, unknown>;

const SERVER_FIELDS = new Set([
  'revision',
  'deleted_at',
  'created_at',
  'updated_at',
  'user_id',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function equal(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) if (!equal(a[key], b[key])) return false;
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => equal(item, b[index]));
  }
  return false;
}

function mergeValue(base: unknown, local: unknown, cloud: unknown): unknown {
  const localChanged = !equal(local, base);
  const cloudChanged = !equal(cloud, base);

  if (!localChanged && !cloudChanged) return base;
  if (localChanged && !cloudChanged) return local;
  if (!localChanged && cloudChanged) return cloud;
  if (equal(local, cloud)) return local;

  if (isPlainObject(base) && isPlainObject(local) && isPlainObject(cloud)) {
    const keys = new Set([
      ...Object.keys(base),
      ...Object.keys(local),
      ...Object.keys(cloud),
    ]);
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      result[key] = mergeValue(base[key], local[key], cloud[key]);
    }
    return result;
  }

  // v1 is deterministic: when the same scalar/array field changed on both
  // devices, the current local write wins. Independent fields still merge.
  return local;
}

export interface ConflictResolutionResult {
  row: SyncRow;
  hadConflict: boolean;
  strategy: 'unchanged' | 'local' | 'cloud' | 'three-way-merge';
}

/**
 * Three-way merge used by sync writes.
 *
 * `base` is the last cloud version known to this device, `local` is the
 * current Zustand-derived row, and `cloud` is the latest server row.
 * Server-owned metadata is never copied from local state.
 */
export function resolveRowConflict(
  base: SyncRow | null,
  local: SyncRow,
  cloud: SyncRow | null,
): ConflictResolutionResult {
  if (!cloud) return { row: local, hadConflict: false, strategy: 'local' };
  if (!base) return { row: local, hadConflict: true, strategy: 'local' };

  const result: SyncRow = { ...cloud };
  const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(cloud)]);

  let localChanged = false;
  let cloudChanged = false;

  for (const key of keys) {
    if (SERVER_FIELDS.has(key)) continue;
    const value = mergeValue(base[key], local[key], cloud[key]);
    if (!equal(value, cloud[key])) localChanged = true;
    if (!equal(cloud[key], base[key])) cloudChanged = true;
    result[key] = value;
  }

  if (!localChanged && !cloudChanged) {
    return { row: result, hadConflict: false, strategy: 'unchanged' };
  }
  if (localChanged && !cloudChanged) {
    return { row: result, hadConflict: false, strategy: 'local' };
  }
  if (!localChanged && cloudChanged) {
    return { row: result, hadConflict: false, strategy: 'cloud' };
  }
  return { row: result, hadConflict: true, strategy: 'three-way-merge' };
}

export function revisionOf(row: SyncRow | null | undefined): number | null {
  if (!row || typeof row.revision !== 'number' || !Number.isInteger(row.revision)) return null;
  return row.revision;
}

export function isTombstone(row: SyncRow | null | undefined): boolean {
  return Boolean(row?.deleted_at);
}
