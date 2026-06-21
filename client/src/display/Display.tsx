// The OBS Browser Source page. Fully transparent by default so it composites
// over video. Renders 1-4 panes of verse text in an MCGI-style panel, driven
// entirely by the synced live state. Read-only.

import { useEffect } from 'react';
import { useSync } from '../lib/sync';
import type { LiveState, Pane, Style } from '../shared/types';
import './display.css';

const GRID: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 grid-rows-2',
};

// Base text size shrinks as more panes share the screen.
const TEXT_VW: Record<number, number> = { 1: 3.0, 2: 2.2, 3: 1.7, 4: 1.7 };

export default function Display() {
  const { state, connected } = useSync();

  // Mark the body transparent for OBS while this page is mounted.
  useEffect(() => {
    document.body.classList.add('display-mode');
    return () => document.body.classList.remove('display-mode');
  }, []);

  if (!state) {
    return <div className="vc-status">{connected ? '' : 'Connecting…'}</div>;
  }

  const { layout, blackout, panes, style } = state;
  const visiblePanes = panes.slice(0, layout);
  const bgClass =
    style.background === 'dark'
      ? 'bg-black/80'
      : style.background === 'gradient'
        ? 'bg-gradient-to-b from-black/85 to-black/40'
        : '';

  return (
    <div
      className={`h-screen w-screen overflow-hidden transition-opacity ${bgClass}`}
      style={{
        opacity: blackout ? 0 : 1,
        transitionDuration: `${style.transitionMs}ms`,
        fontFamily: style.fontFamily,
      }}
    >
      <div className={`grid h-full w-full ${GRID[layout]}`}>
        {visiblePanes.map((pane, i) => (
          <VersePane key={i} pane={pane} style={style} layout={layout} />
        ))}
      </div>
    </div>
  );
}

function VersePane({ pane, style, layout }: { pane: Pane; style: Style; layout: LiveState['layout'] }) {
  const has = pane.visible && pane.ref && pane.text;
  const sizeVw = (TEXT_VW[layout] ?? 2) * style.fontScale;
  const ref = style.uppercaseReference ? pane.reference.toUpperCase() : pane.reference;

  return (
    <div className="flex min-h-0 items-center justify-center p-[3vmin]">
      {has && (
        <div
          key={`${pane.reference}|${pane.versionId}`}
          className="vc-fade flex max-h-full max-w-[92%] flex-col gap-[1.4vmin]"
          style={{
            color: style.textColor,
            textAlign: style.textAlign,
            animationDuration: `${style.transitionMs}ms`,
          }}
        >
          <p
            className="vc-verse font-medium leading-[1.32]"
            style={{ fontSize: `${sizeVw}vw` }}
          >
            {pane.text}
          </p>
          {(style.showReference || style.showVersionLabel) && (
            <div
              className="vc-ref flex items-baseline gap-[1.2vmin] font-semibold tracking-wide"
              style={{
                justifyContent: style.textAlign === 'left' ? 'flex-start' : 'center',
                fontSize: `${sizeVw * 0.52}vw`,
              }}
            >
              {style.showReference && <span style={{ color: style.accentColor }}>{ref}</span>}
              {style.showVersionLabel && (
                <span className="opacity-70" style={{ fontSize: `${sizeVw * 0.4}vw` }}>
                  {pane.versionLabel}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
