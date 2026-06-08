import type { ReactNode } from 'react';
import { Card } from './Card';
import { cn } from './cn';

interface StatProps {
  /** Small-caps label at the top (e.g. "THIS WEEK"). */
  label: string;
  /** Large numeric value; rendered tabular-nums so it doesn't twitch. */
  value: ReactNode;
  /** Optional comparison/context line below the value. */
  context?: ReactNode;
  /** Optional right-aligned visualization (sparkline, bar chart, etc.). */
  visual?: ReactNode;
  className?: string;
}

/** History-view stat card (DESIGN-v2 §6 "Stat cards"): 180×120, label / big
 *  value / context line, with an optional right-aligned visual. The visual is
 *  a slot — concrete sparkline components arrive in Stage 6. */
export function Stat({ label, value, context, visual, className }: StatProps) {
  return (
    <Card className={cn('flex h-[120px] w-[180px] flex-col justify-between p-4', className)}>
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-fg-tertiary">
        {label}
      </span>
      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[34px] font-medium leading-none tabular-nums text-fg">
            {value}
          </span>
          {context && <span className="text-[11px] text-fg-secondary">{context}</span>}
        </div>
        {visual && <div className="shrink-0 self-end">{visual}</div>}
      </div>
    </Card>
  );
}
