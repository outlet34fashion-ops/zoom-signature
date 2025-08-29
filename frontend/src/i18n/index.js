import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import de from './locales/de.json';
import en from './locales/en.json';
import tr from './locales/tr.json';
import fr from './locales/fr.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: {
        translation: de
      },
      en: {
        translation: en
      },
      tr: {
        translation: tr
      },
      fr: {
        translation: fr
      }
    },
    fallbackLng: 'de',
    debug: process.env.NODE_ENV === 'development',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    },

    interpolation: {
      escapeValue: false // not needed for react as it escapes by default
    }
  });

export default i18n;