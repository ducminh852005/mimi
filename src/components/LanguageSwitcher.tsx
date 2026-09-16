import { useTranslation } from 'react-i18next';
import { setLocale } from '../i18n';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = i18n.language === 'en' ? 'en' : 'vi';

  return (
    <div className="flex items-center gap-1 text-xs" aria-label={t('common.language')}>
      {(['vi', 'en'] as const).map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => setLocale(locale)}
          className={`rounded-full px-2 py-0.5 uppercase tracking-wide ${
            current === locale
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
