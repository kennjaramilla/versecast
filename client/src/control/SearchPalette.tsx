// ⌘K-style search overlay. Type a reference ("John 3:16", typo-tolerant) or
// keywords ("love the world") to search every version, then pick a result to
// push it to the active pane. Keyboard-first for live operation.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BookMeta, VerseRef, VersionMeta } from '../shared/types';
import { runSearch, type SearchOutcome, type SearchResult } from '../lib/search';

type Props = {
  open: boolean;
  books: BookMeta[];
  versions: VersionMeta[];
  onPick: (ref: VerseRef) => void;
  onClose: () => void;
};

export default function SearchPalette({ open, versions, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState<SearchOutcome>({ kind: 'keyword', results: [] });
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const versionIds = useMemo(() => versions.map((v) => v.id), [versions]);

  // Focus the input and reset selection whenever the palette opens.
  useEffect(() => {
    if (open) {
      setActive(0);
      // Defer so the element exists and the browser honours focus().
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced search; a request id guards against out-of-order responses.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setOutcome({ kind: 'keyword', results: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await runSearch(q, { versionIds, limit: 60 });
      if (!cancelled) {
        setOutcome(res);
        setActive(0);
        setLoading(false);
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open, versionIds]);

  // Keep the highlighted row in view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, outcome]);

  if (!open) return null;

  const results = outcome.results;

  function choose(r: SearchResult | undefined) {
    if (!r) return;
    onPick(r.ref);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  const words = outcome.kind === 'keyword' ? query.trim().split(/\s+/).filter((w) => w.length > 1) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[72vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#13151c] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-4">
          <span className="text-white/40">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search — a reference (John 3:16) or keywords (love the world)…"
            className="flex-1 bg-transparent py-4 text-base text-white outline-none placeholder:text-white/30"
          />
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">Esc</kbd>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
          {query.trim() === '' ? (
            <Hint />
          ) : loading && results.length === 0 ? (
            <Empty text="Searching…" />
          ) : results.length === 0 ? (
            <Empty text="No matches. Try other words, or a reference like “Juan 3:16”." />
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.versionId}-${r.ref.nr}-${r.ref.chapter}-${r.ref.verse}-${i}`}
                data-idx={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r)}
                className={`flex w-full flex-col gap-0.5 border-b border-white/5 px-4 py-2.5 text-left transition ${
                  i === active ? 'bg-amber-400/15' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-amber-300">{r.reference}</span>
                  <span className="text-[11px] uppercase tracking-wide text-white/40">{r.versionLabel}</span>
                </div>
                <p className="line-clamp-2 text-sm text-white/75">
                  <Highlight text={r.text} words={words} />
                </p>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[11px] text-white/40">
          <span>
            {results.length > 0
              ? `${results.length} result${results.length === 1 ? '' : 's'} · ${outcome.kind === 'reference' ? 'reference' : 'keyword'}`
              : 'Searching ' + versions.map((v) => v.nameLabel).join(' · ')}
          </span>
          <span>↑↓ navigate · ↵ show · Esc close</span>
        </div>
      </div>
    </div>
  );
}

function Hint() {
  return (
    <div className="px-4 py-8 text-center text-sm text-white/40">
      <p className="mb-2">Start typing to search both versions.</p>
      <p className="text-white/30">
        Try <span className="text-white/55">“John 3:16”</span>, <span className="text-white/55">“1 cor 13”</span>,
        or keywords like <span className="text-white/55">“love the world”</span>.
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-sm text-white/40">{text}</div>;
}

/** Bold + tint the query words inside a result's text. */
function Highlight({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  const lower = new Set(words.map((w) => w.toLowerCase()));
  return (
    <>
      {text.split(re).map((part, i) =>
        lower.has(part.toLowerCase()) ? (
          <mark key={i} className="bg-transparent font-semibold text-amber-200">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
