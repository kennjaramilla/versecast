// Search over the bundled Bible data: typo-tolerant reference lookup plus
// full-text keyword search across every version. The keyword index is built
// lazily on first use and cached module-level (~31k verses/version), so a plain
// linear scan stays comfortably under a frame.

import type { BookMeta, VerseRef, VersionData, VersionMeta } from '../shared/types';
import { bookName, loadBooks, loadVersionData, loadVersions } from './bible';

export type SearchResult = {
  versionId: string;
  versionLabel: string;
  ref: VerseRef;
  reference: string; // "John 3:16" / "Juan 3:16" in that version's language
  text: string;
};

export type SearchOutcome = { kind: 'reference' | 'keyword'; results: SearchResult[] };

export type FuzzyRef = { nr: number; chapter: number; verse: number | null };

// ---- normalization --------------------------------------------------------

/** Lowercase + strip diacritics so Tagalog accents ("Sapagka't") match plainly. */
function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Collapse to bare alphanumerics for book-name matching ("1 John" -> "1john"). */
function squash(s: string): string {
  return fold(s).replace(/[^a-z0-9]/g, '');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---- shared, cached lookup context ----------------------------------------

type Ctx = {
  versions: VersionMeta[];
  dataById: Map<string, VersionData>;
  bookByNr: Map<number, BookMeta>;
  versionById: Map<string, VersionMeta>;
};

let ctxCache: Ctx | null = null;
let ctxBuilding: Promise<Ctx> | null = null;

async function getContext(): Promise<Ctx> {
  if (ctxCache) return ctxCache;
  if (!ctxBuilding) {
    ctxBuilding = (async () => {
      const [versions, books] = await Promise.all([loadVersions(), loadBooks()]);
      const dataById = new Map<string, VersionData>();
      await Promise.all(
        versions.map(async (v) => dataById.set(v.id, await loadVersionData(v.id))),
      );
      ctxCache = {
        versions,
        dataById,
        bookByNr: new Map(books.map((b) => [b.nr, b])),
        versionById: new Map(versions.map((v) => [v.id, v])),
      };
      return ctxCache;
    })();
  }
  return ctxBuilding;
}

function makeResult(
  ctx: Ctx,
  versionId: string,
  nr: number,
  chapter: number,
  verse: number,
): SearchResult | null {
  const data = ctx.dataById.get(versionId);
  const meta = ctx.bookByNr.get(nr);
  const version = ctx.versionById.get(versionId);
  if (!data || !meta || !version) return null;
  const text = data.books.find((b) => b.nr === nr)?.chapters[chapter - 1]?.[verse - 1];
  if (text == null) return null;
  const name = bookName(meta, version.lang);
  return {
    versionId,
    versionLabel: version.nameLabel,
    ref: { nr, chapter, verse },
    reference: `${name} ${chapter}:${verse}`,
    text,
  };
}

// ---- keyword index --------------------------------------------------------

type IndexEntry = { versionId: string; nr: number; chapter: number; verse: number; lower: string };

let indexCache: IndexEntry[] | null = null;
let indexBuilding: Promise<IndexEntry[]> | null = null;

async function getIndex(): Promise<IndexEntry[]> {
  if (indexCache) return indexCache;
  if (!indexBuilding) {
    indexBuilding = (async () => {
      const ctx = await getContext();
      const entries: IndexEntry[] = [];
      for (const [versionId, data] of ctx.dataById) {
        for (const b of data.books) {
          for (let ci = 0; ci < b.chapters.length; ci++) {
            const verses = b.chapters[ci];
            for (let vi = 0; vi < verses.length; vi++) {
              entries.push({ versionId, nr: b.nr, chapter: ci + 1, verse: vi + 1, lower: fold(verses[vi]) });
            }
          }
        }
      }
      indexCache = entries;
      return entries;
    })();
  }
  return indexBuilding;
}

async function keywordResults(query: string, versionIds: string[], limit: number): Promise<SearchResult[]> {
  const phrase = fold(query).trim();
  const words = phrase.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const [index, ctx] = await Promise.all([getIndex(), getContext()]);
  const want = new Set(versionIds);
  const wordRes = words.map((w) => new RegExp(`\\b${escapeRegExp(w)}`));

  const scored: { e: IndexEntry; score: number }[] = [];
  for (const e of index) {
    if (!want.has(e.versionId)) continue;
    const t = e.lower;
    let ok = true;
    for (const w of words) {
      if (!t.includes(w)) { ok = false; break; }
    }
    if (!ok) continue;

    let score = 0;
    if (words.length > 1 && t.includes(phrase)) score += 1000; // exact phrase
    for (const re of wordRes) if (re.test(t)) score += 10; // word-start matches
    score += Math.max(0, 60 - Math.floor(t.length / 18)); // denser (shorter) verses first
    score -= e.nr * 0.001; // tiny stable tie-break toward Genesis→Revelation order
    scored.push({ e, score });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.e.nr - b.e.nr ||
      a.e.chapter - b.e.chapter ||
      a.e.verse - b.e.verse,
  );

  const out: SearchResult[] = [];
  for (const { e } of scored) {
    const r = makeResult(ctx, e.versionId, e.nr, e.chapter, e.verse);
    if (r) out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

// ---- fuzzy reference parsing ----------------------------------------------

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

type BookMatch = { book: BookMeta; strong: boolean };

/** Is `q` a subsequence of `s`? ("jhn" ⊂ "john", but not "jonah".) */
function isSubsequence(q: string, s: string): boolean {
  let i = 0;
  for (let j = 0; j < s.length && i < q.length; j++) if (s[j] === q[i]) i++;
  return i === q.length;
}

/** Match a book by abbr / English / Tagalog name, with typo tolerance. */
function matchBook(books: BookMeta[], namePart: string): BookMatch | null {
  const n = squash(namePart);
  if (!n) return null;

  const names = (b: BookMeta) => [squash(b.abbr), squash(b.name_en), squash(b.name_tl)];

  // Exact abbr/name — strongest signal.
  for (const b of books) if (names(b).includes(n)) return { book: b, strong: true };
  // Prefix (>= 3 chars), e.g. "corinth" / "gen".
  if (n.length >= 3) {
    const pre = books.find((b) => names(b).some((x) => x.startsWith(n)));
    if (pre) return { book: pre, strong: true };
  }
  // Dropped-vowels abbreviations ("jhn" -> John, "genis" -> Genesis): the query
  // is an in-order subsequence of a name. Pick the tightest (closest length).
  if (n.length >= 3) {
    let sub: { book: BookMeta; gap: number } | null = null;
    for (const b of books) {
      for (const x of names(b)) {
        if (x.length < n.length || !isSubsequence(n, x)) continue;
        const gap = x.length - n.length;
        if (sub == null || gap < sub.gap) sub = { book: b, gap };
      }
    }
    if (sub) return { book: sub.book, strong: true };
  }
  // Typo tolerance: nearest book name within a small edit distance.
  let best: { book: BookMeta; dist: number } | null = null;
  for (const b of books) {
    for (const x of names(b)) {
      if (Math.abs(x.length - n.length) > 2) continue;
      const d = levenshtein(n, x);
      if (best == null || d < best.dist) best = { book: b, dist: d };
    }
  }
  if (best) {
    const tol = n.length <= 4 ? 1 : 2;
    if (best.dist <= tol) return { book: best.book, strong: best.dist <= 1 };
  }
  // Last resort: substring (only when long enough to be intentional).
  if (n.length >= 4) {
    const c = books.find((b) => names(b).some((x) => x.includes(n)));
    if (c) return { book: c, strong: false };
  }
  return null;
}

function splitRef(s: string): { namePart: string; chapter: number | null; verse: number | null } {
  const m = s.trim().match(/^(.*?)[\s.]*?(\d+)(?:\s*[:. ]\s*(\d+))?\s*$/);
  if (m && m[1].trim()) {
    return { namePart: m[1].trim(), chapter: Number(m[2]), verse: m[3] ? Number(m[3]) : null };
  }
  return { namePart: s.trim(), chapter: null, verse: null };
}

export async function parseReferenceFuzzy(query: string): Promise<FuzzyRef | null> {
  const s = query.trim();
  if (!s) return null;
  const books = await loadBooks();
  const { namePart, chapter, verse } = splitRef(s);
  const hit = matchBook(books, namePart);
  if (!hit) return null;
  const ch = chapter == null ? 1 : Math.min(Math.max(1, chapter), hit.book.chapters);
  return { nr: hit.book.nr, chapter: ch, verse };
}

/**
 * Decide whether the query reads as a reference (vs keywords). A trailing
 * chapter/verse number is a clear signal; a bare word only counts when it
 * strongly matches a book name, so "love" stays a keyword search.
 */
async function referenceIntent(query: string): Promise<FuzzyRef | null> {
  const books = await loadBooks();
  const { namePart, chapter, verse } = splitRef(query);
  const hit = matchBook(books, namePart);
  if (!hit) return null;
  if (chapter == null && !hit.strong) return null;
  const ch = chapter == null ? 1 : Math.min(Math.max(1, chapter), hit.book.chapters);
  return { nr: hit.book.nr, chapter: ch, verse };
}

async function referenceResults(ref: FuzzyRef, versionIds: string[]): Promise<SearchResult[]> {
  const ctx = await getContext();
  const meta = ctx.bookByNr.get(ref.nr);
  const max = meta?.versesPerChapter[ref.chapter - 1] ?? 1;
  const verse = Math.min(Math.max(1, ref.verse ?? 1), max);
  const out: SearchResult[] = [];
  for (const vid of versionIds) {
    const r = makeResult(ctx, vid, ref.nr, ref.chapter, verse);
    if (r) out.push(r);
  }
  return out;
}

// ---- public entry point ---------------------------------------------------

export async function runSearch(
  query: string,
  opts?: { versionIds?: string[]; limit?: number },
): Promise<SearchOutcome> {
  const q = query.trim();
  if (!q) return { kind: 'keyword', results: [] };
  const versionIds = opts?.versionIds ?? (await loadVersions()).map((v) => v.id);
  const limit = opts?.limit ?? 60;

  const ref = await referenceIntent(q);
  if (ref) {
    const results = await referenceResults(ref, versionIds);
    if (results.length) return { kind: 'reference', results };
  }
  return { kind: 'keyword', results: await keywordResults(q, versionIds, limit) };
}
