import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import kn from "@/locales/kn.json";

const SAVED_LANG_KEY = "festival_lang";

const initialLang = (typeof window !== "undefined" && localStorage.getItem(SAVED_LANG_KEY)) || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    kn: { translation: kn },
  },
  lng: initialLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(SAVED_LANG_KEY, lng);
  }
});

export const changeAppLanguage = (lang: "en" | "kn") => {
  i18n.changeLanguage(lang);
};

export default i18n;
