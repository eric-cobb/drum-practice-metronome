// Vitest global setup. Provides a fake IndexedDB so tests that touch the
// `db/schema.ts` Dexie wrapper (exercises store, progress store, etc.) work in
// the jsdom environment, which doesn't ship indexedDB.

import 'fake-indexeddb/auto';
