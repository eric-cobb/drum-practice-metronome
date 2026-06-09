import { useEffect, useState } from 'react';
import { useModeStore } from '../../state/mode';
import {
  useTourStore,
  shouldShowWelcome,
  bannerEligible,
  type TourId,
} from '../../state/tour';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { TourSpotlight } from './TourSpotlight';
import { WelcomeDialog } from './WelcomeDialog';
import { TourBanner } from './TourBanner';

/** Wires the guided tour's three entry points (SPEC §13): the first-ever welcome
 *  dialog, the first-entry-per-mode banner, and the running spotlight. The
 *  on-demand entry lives in Settings. Tours are desktop-only. */
export function TourHost() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const active = useTourStore((s) => s.active);
  const seen = useTourStore((s) => s.seen);
  const shownBanners = useTourStore((s) => s.shownBanners);
  const markBannerShown = useTourStore((s) => s.markBannerShown);
  const mode = useModeStore((s) => s.mode);

  const [welcomeOpen, setWelcomeOpen] = useState(() =>
    shouldShowWelcome(useTourStore.getState().seen),
  );
  const [bannerTour, setBannerTour] = useState<TourId | null>(null);

  // First-entry banner when switching to a mode whose tour hasn't been seen.
  useEffect(() => {
    if (!isDesktop || welcomeOpen || active) {
      setBannerTour(null);
      return;
    }
    const tour: TourId = mode === 'free' ? 'free' : 'practice';
    if (bannerEligible(seen, tour, shownBanners, Date.now())) {
      markBannerShown(tour);
      setBannerTour(tour);
    }
  }, [isDesktop, welcomeOpen, active, mode, seen, shownBanners, markBannerShown]);

  if (!isDesktop) return null;

  return (
    <>
      <TourSpotlight />
      {welcomeOpen && <WelcomeDialog onClose={() => setWelcomeOpen(false)} />}
      {bannerTour && !active && (
        <TourBanner tour={bannerTour} onClose={() => setBannerTour(null)} />
      )}
    </>
  );
}
