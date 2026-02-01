/**
 * i18n Configuration with localStorage Persistence
 * Supports Thai (default) and English languages
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import th from './locales/th.json';
import en from './locales/en.json';

// LocalStorage key for language preference
const LANGUAGE_KEY = 'preferred_language';

// Get saved language preference or default to Thai
const getInitialLanguage = (): string => {
  try {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && (savedLanguage === 'th' || savedLanguage === 'en')) {
      return savedLanguage;
    }
  } catch (error) {
    console.error('Error reading language preference from localStorage:', error);
  }
  return 'th'; // Default to Thai
};

// Save language preference to localStorage
export const saveLanguagePreference = (language: string): void => {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language preference to localStorage:', error);
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      th: {
        translation: th,
      },
      en: {
        translation: en,
      },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'th',
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Language detection options
    detection: {
      // Order matters - localStorage is checked first
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Listen for language changes and persist to localStorage
i18n.on('languageChanged', (lng) => {
  saveLanguagePreference(lng);
});

export default i18n;
