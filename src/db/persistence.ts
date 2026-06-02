// Persistent-storage request + status (SPEC §4). Asks the browser to exempt the
// app's IndexedDB from eviction under storage pressure. Best-effort: the app
// works regardless of the answer; the status is shown as a diagnostic.

const REQUESTED_KEY = 'metronome-persist-requested';

/** Request persistent storage once (the browser remembers the answer, so we
 *  don't re-prompt on later loads). Safe to call on every mount. */
export async function requestPersistentStorage(): Promise<void> {
  if (!navigator.storage?.persist) return;
  if (localStorage.getItem(REQUESTED_KEY)) return;
  localStorage.setItem(REQUESTED_KEY, '1');
  try {
    await navigator.storage.persist();
  } catch {
    // Best-effort; ignore failures.
  }
}

export type PersistenceStatus = 'persistent' | 'best-effort' | 'unknown';

/** Current persistence grant, for display in the log/settings. */
export async function getPersistenceStatus(): Promise<PersistenceStatus> {
  if (!navigator.storage?.persisted) return 'unknown';
  try {
    return (await navigator.storage.persisted()) ? 'persistent' : 'best-effort';
  } catch {
    return 'unknown';
  }
}
