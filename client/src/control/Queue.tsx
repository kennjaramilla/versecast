// A simple prepared-verse playlist, persisted in localStorage. The operator
// builds slides ahead of a service and pushes them live with one click.

import { useEffect, useState } from 'react';
import type { Layout, Pane } from '../shared/types';
import { Button } from './ui';

export type Slide = {
  id: string;
  label: string;
  layout: Layout;
  linked: boolean;
  panes: Pane[];
};

const KEY = 'versecast.queue.v1';

function load(): Slide[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export default function Queue({ makeSlide, onLoad }: {
  makeSlide: () => Omit<Slide, 'id' | 'label'> & { label?: string };
  onLoad: (slide: Slide) => void;
}) {
  const [slides, setSlides] = useState<Slide[]>(load);
  const [liveId, setLiveId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(slides));
  }, [slides]);

  function save() {
    const s = makeSlide();
    const label = s.label || labelFor(s.panes) || `Slide ${slides.length + 1}`;
    const id = `${slides.length}-${label}-${Math.round(performance.now())}`;
    setSlides((prev) => [...prev, { ...s, id, label }]);
  }

  function push(slide: Slide) {
    setLiveId(slide.id);
    onLoad(slide);
  }

  function remove(id: string) {
    setSlides((prev) => prev.filter((s) => s.id !== id));
  }

  const liveIdx = slides.findIndex((s) => s.id === liveId);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button onClick={save} className="flex-1">+ Save current as slide</Button>
        <Button
          tone="ghost"
          disabled={liveIdx < 0 || liveIdx >= slides.length - 1}
          onClick={() => push(slides[liveIdx + 1])}
          title="Push next slide live"
        >
          Next ▸
        </Button>
      </div>

      {slides.length === 0 && (
        <p className="px-1 py-3 text-center text-xs text-white/40">
          No slides yet. Set up the panes, then “Save current as slide”.
        </p>
      )}

      <ul className="flex flex-col gap-1">
        {slides.map((s) => (
          <li
            key={s.id}
            className={`group flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm transition ${
              s.id === liveId ? 'border-amber-400 bg-amber-400/15' : 'border-white/10 bg-white/[0.02] hover:bg-white/10'
            }`}
          >
            <button className="flex-1 truncate text-left text-white/85" onClick={() => push(s)}>
              <span className="mr-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/50">
                {s.layout}-up{s.linked ? ' · linked' : ''}
              </span>
              {s.label}
            </button>
            <button
              onClick={() => remove(s.id)}
              className="opacity-0 transition group-hover:opacity-100 text-white/40 hover:text-rose-300"
              title="Delete slide"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function labelFor(panes: Pane[]): string {
  const refs = panes.filter((p) => p.reference).map((p) => p.reference);
  return [...new Set(refs)].join('  •  ');
}
