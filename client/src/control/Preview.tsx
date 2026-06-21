// A scaled, checkerboard-backed preview of exactly what OBS is showing.

import type { LiveState } from '../shared/types';
import { backgroundStyle } from '../display/Display';

const GRID: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 grid-rows-2',
};

export default function Preview({ state }: { state: LiveState }) {
  const { layout, blackout, panes, style } = state;
  const bg = backgroundStyle(style.background);

  return (
    <div className="vc-checker relative aspect-video w-full overflow-hidden rounded-lg border border-white/10">
      <div
        className={`absolute inset-0 transition-opacity ${bg.className}`}
        style={{ ...bg.style, opacity: blackout ? 0 : 1, fontFamily: style.fontFamily }}
      >
        <div className={`grid h-full w-full ${GRID[layout]}`}>
          {panes.slice(0, layout).map((p, i) => (
            <div key={i} className="flex min-h-0 items-center justify-center p-2 text-center">
              {p.visible && p.text ? (
                <div style={{ color: style.textColor, textAlign: style.textAlign }} className="max-h-full overflow-hidden">
                  {/* Reference heading above the verse, mirroring the display. */}
                  {(style.showReference || style.showVersionLabel) && (
                    <div className="mb-1 text-[0.8vw] font-semibold">
                      {style.showReference && (
                        <span style={{ color: style.accentColor }}>
                          {style.uppercaseReference ? p.reference.toUpperCase() : p.reference}
                        </span>
                      )}
                      {style.showVersionLabel && <span className="ml-1 opacity-60">{p.versionLabel}</span>}
                    </div>
                  )}
                  <p className="text-[1.1vw] font-medium leading-snug [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
                    {p.text}
                  </p>
                </div>
              ) : (
                <span className="text-[0.7vw] text-white/20">empty</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
