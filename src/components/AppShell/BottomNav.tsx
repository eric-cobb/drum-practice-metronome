import { useUiStore } from '../../state/ui';
import { cn } from '../ui/cn';
import { DESTINATIONS } from './destinations';

/** Mobile bottom nav (DESIGN-v2 §5): the same four destinations as horizontal
 *  icons. Shown below the 768px breakpoint; the sidebar takes over above it.
 *  The active destination shows a top accent bar plus the nav-active color. */
export function BottomNav() {
  const activeView = useUiStore((s) => s.activeView);
  const setView = useUiStore((s) => s.setView);

  return (
    <nav
      aria-label="Primary"
      className="flex shrink-0 border-t md:hidden"
      style={{
        background: 'var(--sidebar-bg)',
        borderColor: 'var(--sidebar-border)',
      }}
    >
      {DESTINATIONS.map(({ id, label, icon: Icon }) => {
        const active = activeView === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex h-14 flex-1 flex-col items-center justify-center gap-1',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
              active ? 'text-[color:var(--color-nav-active)]' : 'text-fg-muted',
            )}
          >
            {active && (
              <span
                className="bg-accent-gradient absolute inset-x-0 top-0 h-[3px]"
                aria-hidden
              />
            )}
            <Icon size={20} strokeWidth={1.5} aria-hidden />
            <span className="text-[9px] font-medium tracking-[0.02em]">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
