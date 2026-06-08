import { ViewHeader } from './ViewHeader';

/** Library view — exercise sets, browsing, import/export, schema reference
 *  (DESIGN-v2 §5). Built in Stage 5. Placeholder for now; the Library is new
 *  in v2 (v1 had no equivalent), so nothing is lost by stubbing it. */
export function LibraryView() {
  return (
    <div className="mx-auto max-w-[1600px]">
      <ViewHeader
        title="Library"
        description="Browse exercise sets, import your own, and jump into any exercise."
      />
      <div className="px-8">
        <div className="surface-card flex h-48 items-center justify-center rounded-[14px] text-sm text-fg-tertiary">
          Library lands in Stage 5.
        </div>
      </div>
    </div>
  );
}
