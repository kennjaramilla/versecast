// Shared shapes for the live state synced between the control panel and the
// OBS display. Mirrors the defaults in server/index.mjs.

export type VerseRef = { nr: number; chapter: number; verse: number };

export type Pane = {
  versionId: string;
  ref: VerseRef | null;
  // Resolved snapshot so the display needs no Bible data of its own:
  text: string;
  bookName: string;
  reference: string; // e.g. "John 3:16"
  versionLabel: string; // e.g. "KJV" / "ADB 1905"
  visible: boolean;
};

export type Layout = 1 | 2 | 3 | 4;

export type Style = {
  fontFamily: string;
  fontScale: number;
  textColor: string;
  accentColor: string;
  background: 'transparent' | 'dark' | 'gradient';
  showReference: boolean;
  showVersionLabel: boolean;
  uppercaseReference: boolean;
  transitionMs: number;
  textAlign: 'center' | 'left';
};

export type LiveState = {
  layout: Layout;
  linked: boolean;
  blackout: boolean;
  panes: Pane[]; // always length 4; render `layout` of them
  style: Style;
  rev: number;
};

// ---- Bible data shapes (from client/public/bible/*.json) ------------------

export type BookMeta = {
  nr: number;
  abbr: string;
  name_en: string;
  name_tl: string;
  chapters: number;
  versesPerChapter: number[];
  testament: 'OT' | 'NT';
};

export type VersionMeta = {
  id: string;
  name: string;
  abbreviation: string;
  lang: string;
  nameLabel: string;
};

export type VersionData = {
  id: string;
  name: string;
  abbreviation: string;
  lang: string;
  books: { nr: number; chapters: string[][] }[];
};
