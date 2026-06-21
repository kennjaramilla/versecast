// Verse selection: quick type ("jhn 3:16"), book/chapter/verse dropdowns, and
// a clickable list of the chapter's verses. Calls onPick with a resolved ref.

import { useEffect, useMemo, useState } from 'react';
import type { BookMeta, VerseRef } from '../shared/types';
import { chapterVerses, parseReference } from '../lib/bible';
import { Button, Select } from './ui';

export default function VersePicker({ books, current, previewVersionId, onPick }: {
  books: BookMeta[];
  current: VerseRef | null;
  previewVersionId: string;
  onPick: (ref: VerseRef) => void;
}) {
  const [query, setQuery] = useState('');
  const [hint, setHint] = useState('');
  const [nr, setNr] = useState(current?.nr ?? 43);
  const [chapter, setChapter] = useState(current?.chapter ?? 3);
  const [verses, setVerses] = useState<string[]>([]);

  const book = useMemo(() => books.find((b) => b.nr === nr), [books, nr]);

  // Keep dropdowns in sync when the active pane's ref changes elsewhere.
  useEffect(() => {
    if (current) {
      setNr(current.nr);
      setChapter(current.chapter);
    }
  }, [current?.nr, current?.chapter]);

  // Load the verse list for the previewed version/book/chapter.
  useEffect(() => {
    let on = true;
    chapterVerses(previewVersionId, nr, chapter).then((v) => on && setVerses(v));
    return () => {
      on = false;
    };
  }, [previewVersionId, nr, chapter]);

  async function submitQuery() {
    const parsed = await parseReference(query);
    if (!parsed) {
      setHint('No match — try "John 3:16" or "Juan 3:16"');
      return;
    }
    setHint('');
    setNr(parsed.nr);
    setChapter(parsed.chapter);
    onPick({ nr: parsed.nr, chapter: parsed.chapter, verse: parsed.verse ?? 1 });
    setQuery('');
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitQuery()}
          placeholder='Type a reference — e.g. "John 3:16" or "Juan 3:16"'
          className="flex-1 rounded-lg border border-white/10 bg-[#1a1d26] px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
        />
        <Button tone="primary" onClick={submitQuery}>Go</Button>
      </div>
      {hint && <p className="text-xs text-rose-300">{hint}</p>}

      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <Select value={nr} onChange={(v) => { setNr(Number(v)); setChapter(1); }}>
          {books.map((b) => (
            <option key={b.nr} value={b.nr}>{b.name_en} · {b.name_tl}</option>
          ))}
        </Select>
        <Select value={chapter} onChange={(v) => setChapter(Number(v))}>
          {Array.from({ length: book?.chapters ?? 1 }, (_, i) => i + 1).map((c) => (
            <option key={c} value={c}>Ch {c}</option>
          ))}
        </Select>
      </div>

      <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-white/10">
        {verses.map((text, i) => {
          const verse = i + 1;
          const isCurrent = current?.nr === nr && current?.chapter === chapter && current?.verse === verse;
          return (
            <button
              key={verse}
              onClick={() => onPick({ nr, chapter, verse })}
              className={`flex w-full gap-2 border-b border-white/5 px-2 py-1.5 text-left text-sm transition hover:bg-white/10 ${isCurrent ? 'bg-amber-400/20' : ''}`}
            >
              <span className="shrink-0 font-mono text-xs text-amber-300/80">{verse}</span>
              <span className="text-white/80">{text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
