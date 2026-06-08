import { useEffect, useState } from 'react';

/** Subscribe to a CSS media query. Used to branch layout between the desktop
 *  anchored popover and the mobile bottom sheet (DESIGN-v2 §5 responsive). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia?.(query).matches ?? false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
