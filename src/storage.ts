// localStorage that never throws. Some environments — Safari "Block all
// cookies", private-mode quirks, locked-down in-app webviews, full quota —
// throw a SecurityError/QuotaExceededError on *any* localStorage access. The
// theme/view/mode stores read these synchronously at app bootstrap (before
// first paint), so an unguarded throw there white-screens the whole app for
// those users. These wrappers return null / no-op on failure instead.

export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* denied or full — best effort, nothing to do */
  }
}
