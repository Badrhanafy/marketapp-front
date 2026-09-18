import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en/translation.json';
import fr from './locales/fr/translation.json';
import ar from './locales/ar/translation.json';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ar: { translation: ar },
};

// Determine initial language from device settings
const supportedLanguages = ['en', 'fr', 'ar'];
const locales = Localization.getLocales();
const deviceLanguage = locales && locales[0]?.languageCode ? locales[0].languageCode.toLowerCase() : 'en';
const initialLng = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';

// Initialize i18next synchronously
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLng,
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

// Check if user previously saved a language preference and apply it
AsyncStorage.getItem('language')
  .then((savedLanguage) => {
    if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
      i18n.changeLanguage(savedLanguage);
    }
  })
  .catch((err) => {
    console.warn('Error reading saved language:', err);
  });

// Helper function to change and persist application language
export const changeAppLanguage = async (lng) => {
  if (supportedLanguages.includes(lng)) {
    try {
      await i18n.changeLanguage(lng);
      await AsyncStorage.setItem('language', lng);
    } catch (err) {
      console.warn('Error saving language:', err);
    }
  }
};

export default i18n;