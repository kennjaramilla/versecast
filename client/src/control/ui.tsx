// Small shared UI primitives for the control panel (dark, broadcast-booth feel).

import type { ReactNode } from 'react';

export function Panel({ title, right, children, className = '' }: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-white/10 bg-white/[0.03] ${className}`}>
      {title && (
        <header className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">{title}</h2>
          {right}
        </header>
      )}
      <div className="p-3">{children}</div>
    </section>
  );
}

export function Button({ children, onClick, active, disabled, tone = 'default', className = '', title }: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  tone?: 'default' | 'primary' | 'danger' | 'ghost';
  className?: string;
  title?: string;
}) {
  const tones: Record<string, string> = {
    default: 'bg-white/10 hover:bg-white/20 text-white',
    primary: 'bg-amber-400 hover:bg-amber-300 text-black font-semibold',
    danger: 'bg-rose-500/90 hover:bg-rose-500 text-white',
    ghost: 'bg-transparent hover:bg-white/10 text-white/70',
  };
  const activeRing = active ? 'ring-2 ring-amber-400 bg-amber-400/20' : '';
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-sm transition disabled:opacity-40 ${tones[tone]} ${activeRing} ${className}`}
    >
      {children}
    </button>
  );
}

export function Toggle({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1 text-sm text-white/80">
      <span>{label}</span>
      <span
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-amber-400' : 'bg-white/20'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
        />
      </span>
    </label>
  );
}

export function Select({ value, onChange, children, className = '' }: {
  value: string | number;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-white/10 bg-[#1a1d26] px-2 py-1.5 text-sm text-white outline-none focus:border-amber-400 ${className}`}
    >
      {children}
    </select>
  );
}
