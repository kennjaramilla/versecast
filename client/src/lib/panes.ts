// Helpers for building resolved panes and applying reference changes,
// including the linked-mode rule (all visible panes share one reference).

import type { LiveState, Pane, VerseRef, VersionMeta } from '../shared/types';
import { resolveVerse } from './bible';

export const emptyPane = (versionId: string): Pane => ({
  versionId,
  ref: null,
  text: '',
  bookName: '',
  reference: '',
  versionLabel: '',
  visible: false,
});

/** Resolve a reference for a version into a fully-populated pane. */
export async function buildPane(
  versionId: string,
  ref: VerseRef,
  versions: VersionMeta[],
): Promise<Pane> {
  const resolved = await resolveVerse(versionId, ref.nr, ref.chapter, ref.verse);
  const label = versions.find((v) => v.id === versionId)?.nameLabel ?? versionId.toUpperCase();
  if (!resolved) return { ...emptyPane(versionId), ref };
  return {
    versionId,
    ref,
    text: resolved.text,
    bookName: resolved.bookName,
    reference: resolved.reference,
    versionLabel: label,
    visible: true,
  };
}

/** Re-resolve a pane keeping its current ref but (maybe) a new version. */
export async function repane(
  pane: Pane,
  versions: VersionMeta[],
  versionId = pane.versionId,
): Promise<Pane> {
  if (!pane.ref) return { ...emptyPane(versionId), visible: pane.visible };
  return buildPane(versionId, pane.ref, versions);
}

/**
 * Set the reference on a pane. In linked mode every visible pane adopts the
 * same reference (each resolved for its own version); otherwise only `index`.
 */
export async function setPaneRef(
  state: LiveState,
  index: number,
  ref: VerseRef,
  versions: VersionMeta[],
): Promise<LiveState> {
  const panes = state.panes.slice();
  if (state.linked) {
    for (let i = 0; i < panes.length; i++) {
      const within = i < state.layout;
      panes[i] = within ? await buildPane(panes[i].versionId, ref, versions) : panes[i];
    }
  } else {
    panes[index] = await buildPane(panes[index].versionId, ref, versions);
  }
  return { ...state, panes };
}

/** Move a pane's verse by delta, crossing chapter/book bounds is the caller's job. */
export function stepVerse(ref: VerseRef, delta: number): VerseRef {
  return { ...ref, verse: Math.max(1, ref.verse + delta) };
}
