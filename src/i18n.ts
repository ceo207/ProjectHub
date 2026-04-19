import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

const applyDirection = (lng: string) => {
  const dir = lng === "ar" ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "projecthub_lang",
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Apply direction on init
applyDirection(i18n.language);

// Apply direction on language change
i18n.on("languageChanged", (lng) => {
  applyDirection(lng);
  localStorage.setItem("projecthub_lang", lng);
});

export { applyDirection };
export default i18n;
