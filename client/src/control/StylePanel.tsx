// Live appearance controls for the display output.

import type { Style } from '../shared/types';
import { Select, Toggle } from './ui';

export default function StylePanel({ style, onChange }: {
  style: Style;
  onChange: (patch: Partial<Style>) => void;
}) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <Row label="Text size">
        <input
          type="range" min={0.6} max={1.8} step={0.05}
          value={style.fontScale}
          onChange={(e) => onChange({ fontScale: Number(e.target.value) })}
          className="w-full accent-amber-400"
        />
        <span className="w-10 text-right text-white/50">{Math.round(style.fontScale * 100)}%</span>
      </Row>

      <Row label="Background">
        <Select value={style.background} onChange={(v) => onChange({ background: v as Style['background'] })} className="w-full">
          <option value="blue">Relaxing blue</option>
          <option value="transparent">Transparent (over video)</option>
          <option value="dark">Dark panel</option>
          <option value="gradient">Gradient</option>
        </Select>
      </Row>

      <Row label="Font">
        <Select value={style.fontFamily} onChange={(v) => onChange({ fontFamily: v })} className="w-full">
          <option value="Inter">Inter (sans)</option>
          <option value="Georgia">Georgia (serif)</option>
          <option value="'Times New Roman'">Times (serif)</option>
          <option value="system-ui">System</option>
        </Select>
      </Row>

      <Row label="Align">
        <Select value={style.textAlign} onChange={(v) => onChange({ textAlign: v as Style['textAlign'] })} className="w-full">
          <option value="center">Center</option>
          <option value="left">Left</option>
        </Select>
      </Row>

      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Text" value={style.textColor} onChange={(v) => onChange({ textColor: v })} />
        <ColorField label="Reference" value={style.accentColor} onChange={(v) => onChange({ accentColor: v })} />
      </div>

      <div className="border-t border-white/10 pt-2">
        <Toggle label="Show reference" checked={style.showReference} onChange={(v) => onChange({ showReference: v })} />
        <Toggle label="Show version label" checked={style.showVersionLabel} onChange={(v) => onChange({ showVersionLabel: v })} />
        <Toggle label="Uppercase reference" checked={style.uppercaseReference} onChange={(v) => onChange({ uppercaseReference: v })} />
      </div>

      <Row label="Fade">
        <input
          type="range" min={0} max={1200} step={50}
          value={style.transitionMs}
          onChange={(e) => onChange({ transitionMs: Number(e.target.value) })}
          className="w-full accent-amber-400"
        />
        <span className="w-12 text-right text-white/50">{style.transitionMs}ms</span>
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-white/60">{label}</span>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-white/60">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 cursor-pointer rounded border border-white/20 bg-transparent"
      />
      {label}
    </label>
  );
}
