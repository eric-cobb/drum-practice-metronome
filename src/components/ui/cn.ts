/** Minimal className joiner for the v2 primitives. Drops falsy parts so callers
 *  can write `cn('base', active && 'is-active')`. Intentionally tiny — no
 *  Tailwind-merge dependency; primitives keep their variant maps unambiguous. */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(' ');
}
