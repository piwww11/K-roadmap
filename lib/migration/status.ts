import type { MigrationVerificationResult } from './verifier';
import type { NormalizedMigrationData } from './normalizer';

export const MIGRATION_STATUS_VERSION = 1;
const STATUS_KEY_PREFIX = 'k-roadmap-migration-status-v1:';

export interface VerifiedMigrationStatus {
  version: number;
  userId: string;
  snapshotFingerprint: string;
  verifiedAt: string;
  verification: Pick<MigrationVerificationResult, 'expected' | 'actual'>;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

function statusKey(userId: string) {
  return `${STATUS_KEY_PREFIX}${userId}`;
}

export async function fingerprintMigrationSnapshot(data: NormalizedMigrationData): Promise<string> {
  const content = JSON.stringify(canonicalize({
    journey: data.journey,
    experiments: data.experiments,
    applications: data.applications,
  }));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function readVerifiedMigrationStatus(storage: Storage, userId: string): VerifiedMigrationStatus | null {
  try {
    const raw = storage.getItem(statusKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VerifiedMigrationStatus>;
    if (
      parsed.version !== MIGRATION_STATUS_VERSION ||
      parsed.userId !== userId ||
      typeof parsed.snapshotFingerprint !== 'string' ||
      typeof parsed.verifiedAt !== 'string' ||
      !parsed.verification
    ) return null;
    return parsed as VerifiedMigrationStatus;
  } catch {
    return null;
  }
}

export function saveVerifiedMigrationStatus(storage: Storage, status: VerifiedMigrationStatus) {
  storage.setItem(statusKey(status.userId), JSON.stringify(status));
}

export function clearVerifiedMigrationStatus(storage: Storage, userId: string) {
  storage.removeItem(statusKey(userId));
}
