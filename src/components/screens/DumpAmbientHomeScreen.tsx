import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BatteryLevel, Chronotype, CompanionTone, StudentProfile } from '../../types/api';
import { ambientThemeFor } from '../../lib/theme';

const CHRONOTYPES: Chronotype[] = ['NIGHT_OWL', 'EARLY_BIRD', 'BALANCED'];
const TONES: CompanionTone[] = ['WARM', 'DIRECT', 'CHEERFUL'];

// percent -> BatteryLevel bucket, and back, for the ambient battery slider.
function percentToLevel(percent: number): BatteryLevel {
  if (percent <= 25) return 'LOW';
  if (percent <= 50) return 'OKAY';
  if (percent <= 75) return 'GOOD';
  return 'FULL';
}
const LEVEL_TO_PERCENT: Record<BatteryLevel, number> = {
  LOW: 15,
  OKAY: 40,
  GOOD: 65,
  FULL: 90,
};

interface Props {
  profile: StudentProfile;
  onProfileChange: (patch: Partial<StudentProfile>) => void;
  batteryLevel: BatteryLevel;
  availableMinutes: number;
  onBatteryChange: (level: BatteryLevel) => void;
  onMinutesChange: (minutes: number) => void;
  onExtract: (files: File[], rawText: string) => Promise<void>;
  extracting: boolean;
}

export function DumpAmbientHomeScreen({
  profile,
  onProfileChange,
  batteryLevel,
  availableMinutes,
  onBatteryChange,
  onMinutesChange,
  onExtract,
  extracting,
}: Props) {
  const { t } = useTranslation();
  const theme = ambientThemeFor(batteryLevel);
  const [percent, setPercent] = useState(LEVEL_TO_PERCENT[batteryLevel]);
  const [rawText, setRawText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [emergency, setEmergency] = useState(false);

  function handleBatteryDrag(value: number) {
    setPercent(value);
    onBatteryChange(percentToLevel(value));
  }

  async function handleExtract() {
    if (!rawText.trim() && files.length === 0) return;
    await onExtract(files, rawText.trim());
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t('screen1.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('screen1.subtitle')}</p>
      </div>

      <button
        type="button"
        onClick={() => setEmergency((v) => !v)}
        className="self-center rounded-full border border-red-300 px-4 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50"
      >
        {t('screen1.emergencyButton')}
      </button>
      {emergency && (
        <p className={`text-center text-sm ${theme.accentText}`}>
          {t('screen1.emergencyMessage')}
        </p>
      )}

      <section className={`rounded-xl border p-4 ${theme.cardBg}`}>
        <h2 className="text-sm font-semibold text-gray-700">{t('screen1.personaTitle')}</h2>

        <label className="mt-3 flex flex-col gap-1">
          <span className="text-xs text-gray-500">{t('screen1.chronotypeLabel')}</span>
          <div className="flex flex-wrap gap-2">
            {CHRONOTYPES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onProfileChange({ chronotype: c })}
                className={`rounded-full border px-3 py-1 text-xs ${
                  profile.chronotype === c
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                {t(`screen1.chronotype.${c}`)}
              </button>
            ))}
          </div>
        </label>

        <label className="mt-3 flex flex-col gap-1">
          <span className="text-xs text-gray-500">{t('screen1.toneLabel')}</span>
          <div className="flex flex-wrap gap-2">
            {TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => onProfileChange({ preferredTone: tone })}
                className={`rounded-full border px-3 py-1 text-xs ${
                  profile.preferredTone === tone
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                {t(`screen1.tone.${tone}`)}
              </button>
            ))}
          </div>
        </label>

        <label className="mt-3 flex flex-col gap-1">
          <span className="text-xs text-gray-500">
            {t('screen1.batteryLabel')} — {percent}%
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={percent}
            onChange={(e) => handleBatteryDrag(Number(e.target.value))}
            className="w-full accent-current"
          />
        </label>

        <label className="mt-3 flex flex-col gap-1">
          <span className="text-xs text-gray-500">{t('screen1.availableMinutesLabel')}</span>
          <input
            type="number"
            min={5}
            value={availableMinutes}
            onChange={(e) => onMinutesChange(Number(e.target.value))}
            className="rounded border border-gray-300 px-3 py-1.5"
          />
        </label>
      </section>

      <section className={`rounded-xl border p-4 ${theme.cardBg}`}>
        <h2 className="text-sm font-semibold text-gray-700">{t('screen1.uploadTitle')}</h2>
        <p className="mt-1 text-xs text-gray-500">{t('screen1.uploadHint')}</p>

        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="mt-3 w-full text-xs"
        />
        {files.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            {t('screen1.filesSelected', { count: files.length })}
          </p>
        )}

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={t('screen1.rawTextPlaceholder') ?? ''}
          rows={4}
          className="mt-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />

        <button
          type="button"
          onClick={handleExtract}
          disabled={extracting || (!rawText.trim() && files.length === 0)}
          className={`mt-3 w-full rounded-full px-6 py-2 text-white disabled:opacity-50 ${theme.accent}`}
        >
          {extracting ? t('screen1.extracting') : t('screen1.extractButton')}
        </button>
      </section>
    </div>
  );
}
