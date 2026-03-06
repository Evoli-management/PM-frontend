import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import sl from './locales/sl.json';

const savedLang = localStorage.getItem('preferred_language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      sl: { translation: sl },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

// Listen for language changes dispatched from Preferences
window.addEventListener('languageChanged', (e) => {
  const lang = e.detail?.language;
  if (lang && i18n.language !== lang) {
    i18n.changeLanguage(lang);
    localStorage.setItem('preferred_language', lang);
  }
});

export default i18n;
