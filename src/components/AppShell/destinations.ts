import { Play, Library, Clock, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ViewId } from '../../state/ui';

export interface Destination {
  id: ViewId;
  label: string;
  icon: LucideIcon;
}

/** The four v2 destinations, in sidebar/bottom-nav order (DESIGN-v2 §5). */
export const DESTINATIONS: Destination[] = [
  { id: 'practice', label: 'Practice', icon: Play },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];
