// Stage 1 preview entry (DESIGN-v2). Separate Vite entry so the primitive
// gallery can be opened at /preview.html without touching App.tsx or the main
// bundle. Removed in Stage 9. The default `.dark` matches v2's dark-primary
// language; the Gallery's theme button toggles it.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Gallery } from './components/ui/Gallery';

document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
);
