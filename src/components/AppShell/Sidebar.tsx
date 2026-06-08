import { useUiStore } from '../../state/ui';
import { cn } from '../ui/cn';
import { DESTINATIONS } from './destinations';

/** Desktop left sidebar (DESIGN-v2 §6 "Sidebar"): 64px wide, darkest surface,
 *  a 6px accent strip at the very top, a logo mark, then the four destinations.
 *  The active destination gets a 3px accent bar on its left edge, an accent
 *  tint, and the nav-active text/icon color. */
export function Sidebar() {
  const activeView = useUiStore((s) => s.activeView);
  const setView = useUiStore((s) => s.setView);

  return (
    <nav
      aria-label="Primary"
      className="hidden w-16 shrink-0 flex-col border-r md:flex"
      style={{
        background: 'var(--sidebar-bg)',
        borderColor: 'var(--sidebar-border)',
      }}
    >
      {/* Accent strip — full width, 6px, gradient at 0.6 opacity. */}
      <div className="bg-accent-gradient h-1.5 w-full opacity-60" aria-hidden />

      {/* Logo mark (placeholder). */}
      <div className="flex h-16 items-center justify-center">
        <div className="bg-accent-gradient flex h-8 w-8 items-center justify-center rounded-[9px] text-[11px] font-semibold text-white">
          pm
        </div>
      </div>

      <ul className="flex flex-col">
        {DESTINATIONS.map(({ id, label, icon: Icon }) => {
          const active = activeView === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setView(id)}
                aria-current={active ? 'page' : undefined}
                title={label}
                className={cn(
                  'relative flex h-16 w-16 flex-col items-center justify-center gap-1',
                  'transition-[background-color] duration-[120ms]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
                  active
                    ? 'text-[color:var(--color-nav-active)]'
                    : 'text-fg-muted hover:bg-fg/5 hover:text-fg-secondary',
                )}
                style={active ? { backgroundColor: 'rgba(139, 92, 246, 0.18)' } : undefined}
              >
                {active && (
                  <span
                    className="bg-accent-gradient absolute left-0 top-0 h-full w-[3px]"
                    aria-hidden
                  />
                )}
                <Icon size={20} strokeWidth={1.5} aria-hidden />
                <span className="text-[9px] font-medium tracking-[0.02em]">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
