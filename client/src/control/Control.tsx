// The operator console. Loads the Bible index, manages the active pane, and
// publishes live state to the display over the sync server.

import { useCallback, useEffect, useState } from 'react';
import { useSync } from '../lib/sync';
import { loadBooks, loadVersions } from '../lib/bible';
import { repane, setPaneRef } from '../lib/panes';
import type { BookMeta, Layout, LiveState, VerseRef, VersionMeta } from '../shared/types';
import { Button, Panel, Select, Toggle } from './ui';
import VersePicker from './VersePicker';
import StylePanel from './StylePanel';
import Queue, { type Slide } from './Queue';
import Preview from './Preview';

export default function Control() {
  const { state, connected, publish, update } = useSync();
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadBooks().then(setBooks);
    loadVersions().then(setVersions);
  }, []);

  const displayUrl = `${window.location.origin}/display`;

  const setStyle = useCallback(
    (patch: Partial<LiveState['style']>) => update((s) => ({ ...s, style: { ...s.style, ...patch } })),
    [update],
  );

  // Apply a reference to the active pane (or all visible panes in linked mode).
  const pick = useCallback(
    async (ref: VerseRef) => {
      if (!state) return;
      publish(await setPaneRef(state, active, ref, versions));
    },
    [state, active, versions, publish],
  );

  // Change a pane's version, re-resolving its current verse.
  const changeVersion = useCallback(
    async (index: number, versionId: string) => {
      if (!state) return;
      const panes = state.panes.slice();
      panes[index] = await repane(panes[index], versions, versionId);
      publish({ ...state, panes });
    },
    [state, versions, publish],
  );

  // Step the active pane's verse, crossing chapter boundaries via book meta.
  const navVerse = useCallback(
    async (delta: number) => {
      if (!state) return;
      const pane = state.panes[active];
      if (!pane.ref) return;
      let { nr, chapter, verse } = pane.ref;
      const book = books.find((b) => b.nr === nr);
      if (!book) return;
      verse += delta;
      if (verse < 1) {
        if (chapter > 1) {
          chapter -= 1;
          verse = book.versesPerChapter[chapter - 1];
        } else verse = 1;
      } else if (verse > book.versesPerChapter[chapter - 1]) {
        if (chapter < book.chapters) {
          chapter += 1;
          verse = 1;
        } else verse = book.versesPerChapter[chapter - 1];
      }
      publish(await setPaneRef(state, active, { nr, chapter, verse }, versions));
    },
    [state, active, books, versions, publish],
  );

  const loadSlide = useCallback(
    (slide: Slide) => {
      if (!state) return;
      publish({ ...state, layout: slide.layout, linked: slide.linked, panes: slide.panes, blackout: false });
    },
    [state, publish],
  );

  const copyUrl = () => {
    navigator.clipboard?.writeText(displayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!state || versions.length === 0) {
    return (
      <div className="grid h-screen place-items-center text-white/50">
        {connected ? 'Loading Bible…' : 'Connecting to server…'}
      </div>
    );
  }

  const activePane = state.panes[active];

  return (
    <div className="flex h-screen flex-col bg-[#0b0d12] text-white">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">Verse<span className="text-amber-400">Cast</span></span>
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} title={connected ? 'Connected' : 'Disconnected'} />
        </div>

        <div className="flex items-center gap-1 text-xs text-white/50">
          <span className="rounded bg-white/5 px-2 py-1">OBS Browser Source URL:</span>
          <code className="rounded bg-white/10 px-2 py-1 text-white/80">{displayUrl}</code>
          <Button tone="ghost" onClick={copyUrl}>{copied ? 'Copied!' : 'Copy'}</Button>
          <Button tone="ghost" onClick={() => window.open(displayUrl, '_blank')}>Open</Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {state.blackout ? (
            <Button tone="primary" onClick={() => update((s) => ({ ...s, blackout: false }))}>● SHOW</Button>
          ) : (
            <Button tone="danger" onClick={() => update((s) => ({ ...s, blackout: true }))}>■ CLEAR SCREEN</Button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr_300px] gap-3 p-3">
        {/* Left: layout, mode, panes */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <Panel title="Layout">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-2">
                {([1, 2, 3, 4] as Layout[]).map((n) => (
                  <Button key={n} active={state.layout === n} onClick={() => update((s) => ({ ...s, layout: n }))}>
                    {n}
                  </Button>
                ))}
              </div>
              <Toggle
                label="Linked (same verse, all panes)"
                checked={state.linked}
                onChange={(v) => update((s) => ({ ...s, linked: v }))}
              />
              <p className="text-xs text-white/40">
                {state.linked
                  ? 'Picking a verse fills every pane with that reference in its own version.'
                  : 'Each pane holds its own independent verse.'}
              </p>
            </div>
          </Panel>

          <Panel title="Panes">
            <div className="flex flex-col gap-2">
              {state.panes.slice(0, state.layout).map((pane, i) => (
                <div
                  key={i}
                  onClick={() => setActive(i)}
                  className={`cursor-pointer rounded-lg border p-2 transition ${
                    active === i ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white/50">Pane {i + 1}{active === i ? ' • editing' : ''}</span>
                    <Select value={pane.versionId} onChange={(v) => changeVersion(i, v)}>
                      {versions.map((vv) => (
                        <option key={vv.id} value={vv.id}>{vv.nameLabel}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="mt-1 truncate text-sm">
                    {pane.reference ? (
                      <span className="text-amber-300">{pane.reference}</span>
                    ) : (
                      <span className="text-white/30">— empty —</span>
                    )}
                  </div>
                  {pane.text && <p className="mt-0.5 line-clamp-2 text-xs text-white/50">{pane.text}</p>}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Center: preview + nav + picker */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <Preview state={state} />
          <div className="flex items-center justify-center gap-2">
            <Button onClick={() => navVerse(-1)} disabled={!activePane.ref}>◀ Prev verse</Button>
            <span className="min-w-[10rem] text-center text-sm text-white/60">
              {activePane.reference || 'Pick a verse'}
            </span>
            <Button onClick={() => navVerse(1)} disabled={!activePane.ref}>Next verse ▶</Button>
          </div>
          <Panel title={`Select verse → ${state.linked ? 'all panes' : `pane ${active + 1}`}`}>
            <VersePicker
              books={books}
              current={activePane.ref}
              previewVersionId={activePane.versionId}
              onPick={pick}
            />
          </Panel>
        </div>

        {/* Right: queue + style */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <Panel title="Queue">
            <Queue
              makeSlide={() => ({ layout: state.layout, linked: state.linked, panes: state.panes })}
              onLoad={loadSlide}
            />
          </Panel>
          <Panel title="Appearance">
            <StylePanel style={state.style} onChange={setStyle} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
