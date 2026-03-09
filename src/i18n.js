import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import sl from './locales/sl.json';
import pl from './locales/pl.json';
import da from './locales/da.json';
import nl from './locales/nl.json';
import it from './locales/it.json';

const savedLang = localStorage.getItem('preferred_language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      sl: { translation: sl },
      pl: { translation: pl },
      da: { translation: da },
      nl: { translation: nl },
      it: { translation: it },
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
