'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLang, TRANSLATIONS, LANGUAGES } from './translations';
import { getTelegram, triggerHaptic } from '@/lib/telegram';

interface I18nContextType {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  t: (key: string, fallback?: string) => string;
  languages: typeof LANGUAGES;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLang>('ru');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Проверяем сохраненный язык в localStorage
    const saved = localStorage.getItem('ice_lang') as SupportedLang | null;
    if (saved && (saved === 'ru' || saved === 'be' || saved === 'en')) {
      setLangState(saved);
      return;
    }

    // 2. Проверяем язык пользователя из Telegram WebApp
    const tg = getTelegram();
    const tgLang = tg?.initDataUnsafe?.user?.language_code;
    if (tgLang) {
      if (tgLang.startsWith('be')) setLangState('be');
      else if (tgLang.startsWith('en')) setLangState('en');
      else setLangState('ru');
    }
  }, []);

  const setLang = (newLang: SupportedLang) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ice_lang', newLang);
    }
    triggerHaptic('light');
  };

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.ru;
    return dict[key] || fallback || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    // Безопасный fallback для SSR или компонентов вне провайдера
    return {
      lang: 'ru' as SupportedLang,
      setLang: () => {},
      t: (key: string, fallback?: string) => TRANSLATIONS.ru[key] || fallback || key,
      languages: LANGUAGES,
    };
  }
  return context;
}
