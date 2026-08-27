export type AccountScope = 'guest' | `user:${string}`;

export const JOURNEY_STORAGE_KEY = 'k-roadmap-storage-v2';
export const EXPERIMENT_STORAGE_KEY = 'k-roadmap-experiments-v1';
export const APPLICATION_STORAGE_KEY = 'k-roadmap-application-tracker-v1';

const ACCOUNT_STORAGE_PREFIX = 'k-roadmap-account-v1:';

let currentScope: AccountScope = 'guest';
let initialized = false;

function scopeSuffix(scope: AccountScope) {
  return scope === 'guest' ? 'guest' : scope.slice('user:'.length);
}

export function getCurrentAccountScope(): AccountScope {
  return currentScope;
}

export function getCurrentAccountUserId(): string | null {
  return currentScope.startsWith('user:') ? currentScope.slice('user:'.length) : null;
}

export function getScopedStorageKey(baseKey: string, scope: AccountScope = currentScope): string {
  return `${ACCOUNT_STORAGE_PREFIX}${scopeSuffix(scope)}:${baseKey}`;
}

function hasValue(storage: Storage, key: string) {
  return storage.getItem(key) !== null;
}

function moveKey(storage: Storage, fromKey: string, toKey: string) {
  const value = storage.getItem(fromKey);
  if (value === null || hasValue(storage, toKey)) return false;
  storage.setItem(toKey, value);
  storage.removeItem(fromKey);
  return true;
}

function moveKeys(storage: Storage, fromScope: AccountScope | 'legacy', toScope: AccountScope) {
  const baseKeys = [JOURNEY_STORAGE_KEY, EXPERIMENT_STORAGE_KEY, APPLICATION_STORAGE_KEY];
  for (const baseKey of baseKeys) {
    const fromKey = fromScope === 'legacy' ? baseKey : getScopedStorageKey(baseKey, fromScope);
    const toKey = getScopedStorageKey(baseKey, toScope);
    moveKey(storage, fromKey, toKey);
  }
}

/**
 * Switches the local persistence namespace without deleting user data.
 *
 * First-time legacy data is associated with the currently authenticated user
 * (or the guest namespace when signed out). When signing in later, guest data
 * is promoted only if that account has no existing local snapshot. Existing
 * account snapshots are never overwritten by another scope.
 */
export function activateAccountScope(userId: string | null): boolean {
  if (typeof window === 'undefined') return false;

  const nextScope: AccountScope = userId ? `user:${userId}` : 'guest';
  const storage = window.localStorage;

  if (!initialized) {
    if (nextScope === 'guest') {
      moveKeys(storage, 'legacy', 'guest');
    } else {
      const hasAccountData = [JOURNEY_STORAGE_KEY, EXPERIMENT_STORAGE_KEY, APPLICATION_STORAGE_KEY]
        .some((baseKey) => hasValue(storage, getScopedStorageKey(baseKey, nextScope)));

      if (!hasAccountData) {
        const hasGuestData = [JOURNEY_STORAGE_KEY, EXPERIMENT_STORAGE_KEY, APPLICATION_STORAGE_KEY]
          .some((baseKey) => hasValue(storage, getScopedStorageKey(baseKey, 'guest')));
        if (hasGuestData) moveKeys(storage, 'guest', nextScope);
        else moveKeys(storage, 'legacy', nextScope);
      }
    }

    currentScope = nextScope;
    initialized = true;
    return true;
  }

  if (nextScope === currentScope) return false;

  if (nextScope !== 'guest') {
    const hasAccountData = [JOURNEY_STORAGE_KEY, EXPERIMENT_STORAGE_KEY, APPLICATION_STORAGE_KEY]
      .some((baseKey) => hasValue(storage, getScopedStorageKey(baseKey, nextScope)));

    if (!hasAccountData) {
      moveKeys(storage, 'guest', nextScope);
    }
  }

  currentScope = nextScope;
  return true;
}

/**
 * Keeps the old migration reader keys as a compatibility mirror of the
 * currently active scope. This prevents migration code written for the
 * legacy keys from ever reading another account's snapshot.
 */
export function syncCurrentScopeToLegacyKeys() {
  if (typeof window === 'undefined') return;
  const storage = window.localStorage;

  for (const baseKey of [JOURNEY_STORAGE_KEY, EXPERIMENT_STORAGE_KEY, APPLICATION_STORAGE_KEY]) {
    const scopedKey = getScopedStorageKey(baseKey);
    const value = storage.getItem(scopedKey);
    if (value === null) storage.removeItem(baseKey);
    else storage.setItem(baseKey, value);
  }
}

export function createScopedStateStorage(baseKey: string) {
  return {
    getItem: (name: string) => window.localStorage.getItem(getScopedStorageKey(name || baseKey)),
    setItem: (name: string, value: string) => window.localStorage.setItem(getScopedStorageKey(name || baseKey), value),
    removeItem: (name: string) => window.localStorage.removeItem(getScopedStorageKey(name || baseKey)),
  };
}
