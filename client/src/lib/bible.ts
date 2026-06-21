// Loads and indexes the bundled Bible data, and resolves references to verse
// text. Version files are ~4-5MB each, so we lazy-load them on first use and
// cache. The display never imports this — it only renders text from state.

import type { BookMeta, VersionData, VersionMeta } from '../shared/types';

const cache = {
  versions: null as VersionMeta[] | null,
  books: null as BookMeta[] | null,
  data: new Map<string, VersionData>(),
};

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

export async function loadVersions(): Promise<VersionMeta[]> {
  if (!cache.versions) cache.versions = await getJSON<VersionMeta[]>('/bible/versions.json');
  return cache.versions as VersionMeta[];
}

export async function loadBooks(): Promise<BookMeta[]> {
  if (!cache.books) cache.books = await getJSON<BookMeta[]>('/bible/books.json');
  return cache.books as BookMeta[];
}

export async function loadVersionData(id: string): Promise<VersionData> {
  let d = cache.data.get(id);
  if (!d) {
    d = await getJSON<VersionData>(`/bible/${id}.json`);
    cache.data.set(id, d);
  }
  return d;
}

/** Book name in the right language for a version ('tl' -> Tagalog name). */
export function bookName(book: BookMeta, lang: string): string {
  return lang === 'tl' ? book.name_tl : book.name_en;
}

export type ResolvedVerse = {
  text: string;
  bookName: string;
  reference: string;
};

/** Resolve one verse's text + a human reference for a given version. */
export async function resolveVerse(
  versionId: string,
  nr: number,
  chapter: number,
  verse: number,
): Promise<ResolvedVerse | null> {
  const [data, books, versions] = await Promise.all([
    loadVersionData(versionId),
    loadBooks(),
    loadVersions(),
  ]);
  const book = books.find((b) => b.nr === nr);
  const vdata = data.books.find((b) => b.nr === nr);
  if (!book || !vdata) return null;
  const text = vdata.chapters[chapter - 1]?.[verse - 1];
  if (text == null) return null;
  const version = versions.find((v) => v.id === versionId);
  const name = bookName(book, version?.lang || 'en');
  return { text, bookName: name, reference: `${name} ${chapter}:${verse}` };
}

/** All verse texts of a chapter (for the preview list / range selection). */
export async function chapterVerses(versionId: string, nr: number, chapter: number): Promise<string[]> {
  const data = await loadVersionData(versionId);
  const vdata = data.books.find((b) => b.nr === nr);
  return vdata?.chapters[chapter - 1] ?? [];
}

// ---- Reference parsing ("jhn 3:16", "1 cor 13:4", "gen 1") ----------------

export type ParsedRef = { nr: number; chapter: number; verse: number | null };

export async function parseReference(input: string): Promise<ParsedRef | null> {
  const books = await loadBooks();
  const s = input.trim().toLowerCase();
  if (!s) return null;
  // Split a trailing "chapter:verse" / "chapter" off the book name.
  const m = s.match(/^(.*?)[\s.]*?(\d+)(?:\s*[:.]\s*(\d+))?\s*$/);
  if (!m) {
    // Just a book name — default to chapter 1.
    const book = matchBook(books, s);
    return book ? { nr: book.nr, chapter: 1, verse: null } : null;
  }
  const [, namePart, chapStr, verseStr] = m;
  const book = matchBook(books, namePart.trim());
  if (!book) return null;
  const chapter = Math.min(Math.max(1, Number(chapStr)), book.chapters);
  return { nr: book.nr, chapter, verse: verseStr ? Number(verseStr) : null };
}

function normalize(s: string): string {
  return s.replace(/[^a-z0-9]/g, '');
}

function matchBook(books: BookMeta[], q: string): BookMeta | null {
  const n = normalize(q);
  if (!n) return null;
  // Try: exact abbr, exact name, then prefix on English or Tagalog name.
  const byAbbr = books.find((b) => normalize(b.abbr) === n);
  if (byAbbr) return byAbbr;
  const exact = books.find(
    (b) => normalize(b.name_en) === n || normalize(b.name_tl) === n,
  );
  if (exact) return exact;
  const prefix = books.find(
    (b) => normalize(b.name_en).startsWith(n) || normalize(b.name_tl).startsWith(n),
  );
  if (prefix) return prefix;
  // Loose contains (helps "corinth" -> 1 Corinthians, picks the first).
  return (
    books.find(
      (b) => normalize(b.name_en).includes(n) || normalize(b.name_tl).includes(n),
    ) ?? null
  );
}
