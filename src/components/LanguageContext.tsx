"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, dictionary } from "@/lib/dictionary";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (keyPath: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("ibrainlabs_lang") as Language;
    if (saved === "en" || saved === "te") {
      setLang(saved);
    }
  }, []);

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("ibrainlabs_lang", newLang);
  };

  const t = (keyPath: string): string => {
    const keys = keyPath.split(".");
    let current: any = dictionary[lang];
    for (const k of keys) {
      if (current && current[k] !== undefined) {
        current = current[k];
      } else {
        // Fallback to English if translation key missing in target lang
        let fallback: any = dictionary.en;
        for (const fk of keys) {
          if (fallback && fallback[fk] !== undefined) {
            fallback = fallback[fk];
          } else {
            return keyPath;
          }
        }
        return typeof fallback === "string" ? fallback : keyPath;
      }
    }
    return typeof current === "string" ? current : keyPath;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
