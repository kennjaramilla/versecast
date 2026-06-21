// Normalizes getBible v2 raw JSON (kjv + tagalog/ADB 1905) into a compact shared
// schema the app can load. Output goes to client/public/bible/.
//
//   books.json   -> canonical book metadata (id/nr, English + Tagalog names,
//                   chapter count, verses-per-chapter). Shared across versions.
//   <id>.json    -> per-version text: { id, name, lang, books: [{ nr, chapters: [[verse,...],...] }] }
//
// Both versions come from getBible so they share the same 1..66 book numbering
// and chapter/verse versification, which is what lets split panes line up.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const rawDir = join(root, 'data', 'raw');
const outDir = join(root, 'client', 'public', 'bible');
mkdirSync(outDir, { recursive: true });

/** Read a getBible raw file and shape it into our per-version structure. */
function loadVersion(file, id) {
  const raw = JSON.parse(readFileSync(join(rawDir, file), 'utf8'));
  const books = raw.books
    .slice()
    .sort((a, b) => a.nr - b.nr)
    .map((b) => ({
      nr: b.nr,
      name: b.name,
      chapters: b.chapters
        .slice()
        .sort((a, c) => a.chapter - c.chapter)
        .map((c) =>
          c.verses
            .slice()
            .sort((a, v) => a.verse - v.verse)
            .map((v) => v.text.trim()),
        ),
    }));
  return {
    id,
    name: raw.translation,
    abbreviation: raw.abbreviation || id.toUpperCase(),
    lang: raw.lang,
    books,
  };
}

const kjv = loadVersion('kjv.json', 'kjv');
const adb = loadVersion('tagalog.json', 'adb');

// Sanity: both must have 66 books with matching chapter/verse counts so panes align.
function shape(v) {
  return v.books.map((b) => b.chapters.map((c) => c.length));
}
const ks = shape(kjv);
const as = shape(adb);
let mismatches = 0;
for (let bi = 0; bi < 66; bi++) {
  const kc = ks[bi] || [];
  const ac = as[bi] || [];
  const maxCh = Math.max(kc.length, ac.length);
  for (let ci = 0; ci < maxCh; ci++) {
    if (kc[ci] !== ac[ci]) mismatches++;
  }
}
console.log(`KJV books: ${kjv.books.length}, ADB books: ${adb.books.length}`);
console.log(`Chapter/verse-count mismatches between versions: ${mismatches}`);

// Canonical book metadata: English names from KJV, Tagalog names from ADB.
const STANDARD_ABBR = [
  'Gen','Exo','Lev','Num','Deu','Jos','Jdg','Rut','1Sa','2Sa','1Ki','2Ki','1Ch','2Ch','Ezr','Neh','Est','Job','Psa','Pro','Ecc','Sng','Isa','Jer','Lam','Eze','Dan','Hos','Joe','Amo','Oba','Jon','Mic','Nah','Hab','Zep','Hag','Zec','Mal',
  'Mat','Mar','Luk','Joh','Act','Rom','1Co','2Co','Gal','Eph','Php','Col','1Th','2Th','1Ti','2Ti','Tit','Phm','Heb','Jas','1Pe','2Pe','1Jo','2Jo','3Jo','Jud','Rev',
];

const books = kjv.books.map((b, i) => {
  const adbBook = adb.books.find((x) => x.nr === b.nr);
  return {
    nr: b.nr,
    abbr: STANDARD_ABBR[i] || String(b.nr),
    name_en: b.name,
    name_tl: adbBook ? adbBook.name : b.name,
    chapters: b.chapters.length,
    versesPerChapter: b.chapters.map((c) => c.length),
    testament: b.nr <= 39 ? 'OT' : 'NT',
  };
});

// Strip book names from per-version files (metadata file holds them) to save space.
function slim(v) {
  return {
    id: v.id,
    name: v.name,
    abbreviation: v.abbreviation,
    lang: v.lang,
    books: v.books.map((b) => ({ nr: b.nr, chapters: b.chapters })),
  };
}

writeFileSync(join(outDir, 'books.json'), JSON.stringify(books));
writeFileSync(join(outDir, 'kjv.json'), JSON.stringify(slim(kjv)));
writeFileSync(join(outDir, 'adb.json'), JSON.stringify(slim(adb)));

// Manifest the client reads to know which versions exist (extensible).
const versions = [
  { id: 'kjv', name: kjv.name, abbreviation: kjv.abbreviation, lang: kjv.lang, nameLabel: 'KJV' },
  { id: 'adb', name: adb.name, abbreviation: 'ADB', lang: adb.lang, nameLabel: 'ADB 1905' },
];
writeFileSync(join(outDir, 'versions.json'), JSON.stringify(versions));

console.log('Wrote books.json, kjv.json, adb.json, versions.json to', outDir);
