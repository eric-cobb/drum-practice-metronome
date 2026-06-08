import { useState } from 'react';
import { Upload, Download, Search } from 'lucide-react';
import {
  Card,
  Tile,
  Button,
  PlayButton,
  Input,
  Toggle,
  Stat,
} from './index';
import type { TileState } from './index';

/** Stage 1 verification harness (not part of the app). Renders every v2
 *  primitive on the real canvas so we can confirm the visual language in both
 *  themes before wiring it into views. Mounted by src/preview.tsx → preview.html.
 *  Removed/ignored before Stage 9. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-fg-tertiary">
        {title}
      </h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

const TILE_STATES: TileState[] = [
  'default',
  'attempted',
  'completed',
  'mastered',
  'current',
];

export function Gallery() {
  const [dark, setDark] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [toggleA, setToggleA] = useState(true);
  const [toggleB, setToggleB] = useState(false);

  function applyTheme(next: boolean) {
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  }

  return (
    <div className="canvas-bg min-h-screen px-10 py-8 text-fg">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-medium">Design v2 — primitives</h1>
            <p className="text-xs text-fg-secondary">
              Stage 1 verification harness. Not part of the app.
            </p>
          </div>
          <Button variant="secondary" onClick={() => applyTheme(!dark)}>
            {dark ? 'Switch to light' : 'Switch to dark'}
          </Button>
        </header>

        <Section title="Buttons">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Reset progress</Button>
          <Button variant="primary" icon={<Upload size={16} strokeWidth={1.5} />}>
            Import set
          </Button>
          <Button variant="ghost" icon={<Download size={16} strokeWidth={1.5} />}>
            Export
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </Section>

        <Section title="Play button">
          <PlayButton playing={playing} onClick={() => setPlaying((p) => !p)} size="free" />
          <PlayButton
            playing={playing}
            onClick={() => setPlaying((p) => !p)}
            size="exercise"
          />
        </Section>

        <Section title="Cards / surfaces">
          <Card className="w-56 p-5">
            <h3 className="text-[15px] font-medium">Standard card</h3>
            <p className="mt-1 text-xs text-fg-secondary">
              Surface gradient, layered shadow, inner top highlight.
            </p>
          </Card>
          <Card surface="deep" className="w-56 p-5">
            <h3 className="text-[15px] font-medium">Deep card</h3>
            <p className="mt-1 text-xs text-fg-secondary">Session card / top-bar pills.</p>
          </Card>
          <Card surface="popover" className="w-56 rounded-2xl p-5">
            <h3 className="text-[15px] font-medium">Popover</h3>
            <p className="mt-1 text-xs text-fg-secondary">Heavier floating shadow.</p>
          </Card>
        </Section>

        <Section title="Tiles">
          {TILE_STATES.map((state, i) => (
            <Tile
              key={state}
              number={i + 1}
              name={state}
              state={state}
              progress={state === 'current' ? 0.6 : undefined}
            />
          ))}
        </Section>

        <Section title="Stat cards">
          <Stat label="This week" value="3h 42m" context="+38m vs last week" />
          <Stat label="Exercises" value="14" context="of 72 complete" />
          <Stat label="Streak" value="6" context="days" />
        </Section>

        <Section title="Inputs / toggles">
          <div className="flex w-72 flex-col gap-4">
            <Input label="Session name" placeholder="Untitled" />
            <Input placeholder="Filter exercises…" aria-label="Filter exercises" />
            <div className="surface-card rounded-[14px] p-4">
              <Toggle label="Count-in between exercises" checked={toggleA} onChange={setToggleA} />
            </div>
            <div className="surface-card rounded-[14px] p-4">
              <Toggle label="Dropout" checked={toggleB} onChange={setToggleB} />
            </div>
            <Button variant="secondary" icon={<Search size={16} strokeWidth={1.5} />}>
              Search
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
