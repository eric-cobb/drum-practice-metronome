import { Settings } from 'lucide-react';
import { useUiStore } from '../../state/ui';
import { Button } from '../ui';
import { ViewHeader } from './ViewHeader';

/** Settings view — app-level configuration (DESIGN-v2 §5). Built natively in
 *  Stage 7. Until then this bridges to the working v1 settings sheet so theme,
 *  practice defaults, storage, and set management stay reachable. */
export function SettingsView() {
  const openSettings = useUiStore((s) => s.openSettings);

  return (
    <div className="mx-auto max-w-[1600px]">
      <ViewHeader
        title="Settings"
        description="Appearance, practice defaults, and local storage."
      />
      <div className="px-8">
        <div className="surface-card flex h-48 flex-col items-center justify-center gap-4 rounded-[14px] text-sm text-fg-tertiary">
          <span>The full Settings view lands in Stage 7.</span>
          <Button
            variant="secondary"
            icon={<Settings size={16} strokeWidth={1.5} />}
            onClick={openSettings}
          >
            Open settings
          </Button>
        </div>
      </div>
    </div>
  );
}
