import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supportedLocales, translate, type Locale } from "./translations.mjs";

type LanguageContext = {
  language: Locale;
  setLanguage: (value: Locale) => void;
  t: (text: string) => string;
};
const Context = createContext<LanguageContext>({
  language: "fr",
  setLanguage: () => {},
  t: (text) => text,
});
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Locale>("fr");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rmm-language");
      if (saved && supportedLocales.includes(saved as Locale)) setLanguage(saved as Locale);
    } catch {
      /* Browser storage may be disabled. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);
  const choose = (value: Locale) => {
    if (!supportedLocales.includes(value)) return;
    setLanguage(value);
    try {
      localStorage.setItem("rmm-language", value);
    } catch {
      /* The choice remains valid for this session. */
    }
  };
  return (
    <Context.Provider
      value={{ language, setLanguage: choose, t: (text) => translate(language, text) }}
    >
      {children}
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="inline-flex items-center gap-1.5 text-xs">
      <span className="sr-only">{t("Langue")}</span>
      <select
        aria-label={t("Langue")}
        value={language}
        onChange={(e) => setLanguage(e.target.value as Locale)}
        className="rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground"
      >
        <option value="fr">FR · Français</option>
        <option value="en">EN · English</option>
        <option value="ar">AR · العربية</option>
      </select>
    </label>
  );
}
