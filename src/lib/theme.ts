import type { BatteryLevel } from '../types/api';

// Dynamic Ambient Theme (docs/ARCHITECTURE.md §7, Screen 1): the whole app
// leans warm ("Sunset Rose") when the student's battery is low, and cool
// ("Mint") when they're fresh — a wordless cue MIMI is adapting to them.
export interface AmbientTheme {
  name: 'sunsetRose' | 'mint';
  pageBg: string;
  cardBg: string;
  accent: string;
  accentText: string;
}

const SUNSET_ROSE: AmbientTheme = {
  name: 'sunsetRose',
  pageBg: 'bg-gradient-to-b from-rose-100 via-orange-50 to-white',
  cardBg: 'bg-white/80 border-rose-200',
  accent: 'bg-rose-500 hover:bg-rose-600',
  accentText: 'text-rose-600',
};

const MINT: AmbientTheme = {
  name: 'mint',
  pageBg: 'bg-gradient-to-b from-emerald-50 via-teal-50 to-white',
  cardBg: 'bg-white/80 border-emerald-200',
  accent: 'bg-emerald-500 hover:bg-emerald-600',
  accentText: 'text-emerald-600',
};

export function ambientThemeFor(level: BatteryLevel): AmbientTheme {
  return level === 'LOW' || level === 'OKAY' ? SUNSET_ROSE : MINT;
}
