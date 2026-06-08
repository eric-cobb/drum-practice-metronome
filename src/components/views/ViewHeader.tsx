/** View title block for the non-Practice views (DESIGN-v2 §6 "View title
 *  section"): a 20px/500 title and a 12px/400 one-line description, with 28px
 *  of vertical padding. Practice has its own top bar and does not use this. */
interface ViewHeaderProps {
  title: string;
  description: string;
}

export function ViewHeader({ title, description }: ViewHeaderProps) {
  return (
    <div className="px-8 py-7">
      <h1 className="text-xl font-medium text-fg">{title}</h1>
      <p className="mt-1 text-xs text-fg-secondary">{description}</p>
    </div>
  );
}
