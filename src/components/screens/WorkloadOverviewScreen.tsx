import { useTranslation } from 'react-i18next';
import type { AdaptPlanResponse, BatteryLevel } from '../../types/api';
import { ambientThemeFor } from '../../lib/theme';

interface Props {
  batteryLevel: BatteryLevel;
  plan: AdaptPlanResponse | null;
  loading: boolean;
  onStart: () => void;
}

export function WorkloadOverviewScreen({ batteryLevel, plan, loading, onStart }: Props) {
  const { t } = useTranslation();
  const theme = ambientThemeFor(batteryLevel);

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-center text-2xl font-bold">{t('screen2.title')}</h1>

      {loading || !plan ? (
        <p className="text-center text-sm text-gray-500">{t('screen2.adapting')}</p>
      ) : (
        <>
          <section className={`rounded-xl border p-4 ${theme.cardBg}`}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{t('screen2.totalLabel')}</span>
              <span className="font-semibold">
                {plan.workloadSummary.totalIdentifiedMinutes} {t('screen2.minutesShort')}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-gray-500">{t('screen2.availableLabel')}</span>
              <span className="font-semibold">
                {plan.workloadSummary.availableMinutes} {t('screen2.minutesShort')}
              </span>
            </div>
            <p className={`mt-3 text-sm ${theme.accentText}`}>
              {plan.workloadSummary.isOverloaded ? t('screen2.overloaded') : t('screen2.onTrack')}
            </p>
          </section>

          <section className={`rounded-xl border p-4 ${theme.cardBg}`}>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              {plan.recommendation.courseCode}
            </p>
            <p className="mt-1 text-lg font-medium">{plan.recommendation.taskTitle}</p>
            <p className="mt-1 text-sm text-gray-600">{plan.recommendation.actionStep}</p>
            <p className="mt-3 text-gray-700">{plan.recommendation.companionMessage}</p>
          </section>

          <button
            type="button"
            onClick={onStart}
            className={`self-center rounded-full px-6 py-2 text-white ${theme.accent}`}
          >
            {t('screen2.startButton')}
          </button>
        </>
      )}
    </div>
  );
}
