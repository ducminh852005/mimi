import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './locales';

const LOCALE_KEY = 'mimi_locale';

const getStoredLocale = (): 'vi' | 'en' => {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    return stored === 'en' ? 'en' : 'vi';
  } catch {
    return 'vi';
  }
};

export function setLocale(locale: 'vi' | 'en') {
  i18n.changeLanguage(locale);
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch (err) {
    console.warn('Local Storage Write Error [mimi_locale]:', err);
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: getStoredLocale(),
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
});

export default i18n;
