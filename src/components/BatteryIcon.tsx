import type { BatteryLevel } from '../types/api';

const LEVEL_COLOR: Record<BatteryLevel, string> = {
  LOW: 'bg-red-400',
  OKAY: 'bg-yellow-400',
  GOOD: 'bg-lime-500',
  FULL: 'bg-green-500',
};

export function BatteryIcon({ level }: { level: BatteryLevel }) {
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full ${LEVEL_COLOR[level]}`}
      title={`Battery: ${level}`}
    />
  );
}
