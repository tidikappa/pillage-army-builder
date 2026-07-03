import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language } from './translations';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tData: (type: 'factions' | 'roles' | 'equipment' | 'factionRules', id: string, defaultVal: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const LANG_KEY = 'pillage_lang_v1';

function readInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'fr' || stored === 'en') return stored;
  } catch {
    // localStorage disabled (private mode), fall through.
  }
  // Fallback to the browser preference, then FR.
  if (typeof navigator !== 'undefined' && navigator.language?.startsWith('en')) return 'en';
  return 'fr';
}

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(readInitialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // Ignore quota / private mode errors.
    }
  };

  // Reflect the choice on <html lang> so screen readers and browser tooling
  // pick up the correct locale.
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    if (language === 'fr') {
      // For French, we assume the keys in the code are often English-ish keys pointing to French text,
      // OR we just use the dictionary structure.
      // Let's use the dictionary structure.
      return translations.fr.ui[key] || key;
    }
    return translations.en.ui[key] || translations.fr.ui[key] || key;
  };

  const tData = (type: 'factions' | 'roles' | 'equipment' | 'factionRules', id: string, defaultVal: string): string => {
    if (language === 'fr') return defaultVal;
    
    const dict = translations.en.data[type];
    if (!dict) return defaultVal;

    // 1. Check if we have a translation for the specific Name (handles faction-specific renames like "Bők" vs "Huscarl")
    if (dict[defaultVal]) {
        return dict[defaultVal];
    }

    // 2. Check if we have a translation for this ID
    if (dict[id]) {
      return dict[id];
    }

    return defaultVal;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t, tData }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
