import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdaptPlanResponse, BatteryLevel } from '../../types/api';
import { ambientThemeFor } from '../../lib/theme';

interface Props {
  batteryLevel: BatteryLevel;
  recommendation: AdaptPlanResponse['recommendation'] | null;
  startedAt: number | null;
  onDone: () => void;
}

export function FocusActionScreen({ batteryLevel, recommendation, startedAt, onDone }: Props) {
  const { t } = useTranslation();
  const theme = ambientThemeFor(batteryLevel);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!recommendation) {
    return <p className="py-8 text-center text-gray-500">{t('screen3.noTask')}</p>;
  }

  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const seconds = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <h1 className="text-2xl font-bold">{t('screen3.title')}</h1>
      <p className="text-sm text-gray-600">{t('screen3.subtitle')}</p>

      <div
        className={`h-24 w-24 rounded-full ${theme.accent} animate-pulse`}
        style={{ animationDuration: '3s' }}
        aria-hidden
      />

      <section className={`w-full rounded-xl border p-4 ${theme.cardBg}`}>
        <p className="text-xs uppercase tracking-wide text-gray-400">
          {recommendation.courseCode}
        </p>
        <p className="mt-1 text-lg font-medium">{recommendation.actionStep}</p>
        <div className="mt-3 flex items-center justify-center gap-6 text-sm text-gray-500">
          <span>
            {t('screen3.elapsedLabel')}: {minutes}:{seconds}
          </span>
          <span>
            {t('screen3.allocatedLabel')}: {recommendation.allocatedMinutes}{' '}
            {t('screen2.minutesShort')}
          </span>
        </div>
      </section>

      <button
        type="button"
        onClick={onDone}
        className={`rounded-full px-8 py-2 text-white ${theme.accent}`}
      >
        {t('screen3.doneButton')}
      </button>
    </div>
  );
}
