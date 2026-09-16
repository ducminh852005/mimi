import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  AdaptPlanResponse,
  BatteryLevel,
  ObstacleReason,
  ReflectionFeedback,
} from '../../types/api';
import { ambientThemeFor } from '../../lib/theme';

const FEEDBACK_OPTIONS: ReflectionFeedback[] = ['EASY', 'OKAY', 'HARD'];
const OBSTACLE_OPTIONS: ObstacleReason[] = [
  'NONE',
  'TOO_TIRED',
  'TOOK_LONGER_THAN_EXPECTED',
  'DIDNT_UNDERSTAND',
  'DISTRACTED',
  'UNEXPECTED_INTERRUPT',
];

interface Props {
  batteryLevel: BatteryLevel;
  recommendation: AdaptPlanResponse['recommendation'] | null;
  latestLearnedPattern: string | null;
  onSubmit: (feedback: ReflectionFeedback, obstacleReason: ObstacleReason) => Promise<void>;
  onFinish: () => void;
}

export function ReflectionScreen({
  batteryLevel,
  recommendation,
  latestLearnedPattern,
  onSubmit,
  onFinish,
}: Props) {
  const { t } = useTranslation();
  const theme = ambientThemeFor(batteryLevel);
  const [feedback, setFeedback] = useState<ReflectionFeedback>('OKAY');
  const [obstacleReason, setObstacleReason] = useState<ObstacleReason>('NONE');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit(feedback, obstacleReason);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-center text-2xl font-bold">{t('screen4.title')}</h1>

      {recommendation && (
        <p className="text-center text-sm text-gray-500">{recommendation.actionStep}</p>
      )}

      {!submitted ? (
        <>
          <section className={`rounded-xl border p-4 ${theme.cardBg}`}>
            <p className="text-xs text-gray-500">{t('screen4.feedbackLabel')}</p>
            <div className="mt-2 flex gap-2">
              {FEEDBACK_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFeedback(f)}
                  className={`flex-1 rounded-full border px-3 py-1.5 text-sm ${
                    feedback === f
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {t(`screen4.feedback.${f}`)}
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs text-gray-500">{t('screen4.obstacleLabel')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {OBSTACLE_OPTIONS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setObstacleReason(o)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    obstacleReason === o
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {t(`screen4.obstacle.${o}`)}
                </button>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={`self-center rounded-full px-8 py-2 text-white disabled:opacity-50 ${theme.accent}`}
          >
            {t('screen4.submitButton')}
          </button>
        </>
      ) : (
        <>
          <section className={`rounded-xl border p-4 text-center ${theme.cardBg}`}>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              {t('screen4.studyMirrorTitle')}
            </p>
            <p className="mt-2 text-gray-700">{latestLearnedPattern}</p>
          </section>

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={onFinish}
              className={`rounded-full px-6 py-2 text-white ${theme.accent}`}
            >
              {t('screen4.continueButton')}
            </button>
            <button
              type="button"
              onClick={onFinish}
              className="rounded-full border border-gray-300 px-6 py-2 text-gray-600"
            >
              {t('screen4.restButton')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
