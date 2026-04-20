import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  return (
    <button
      onClick={() => i18n.changeLanguage(isArabic ? "en" : "ar")}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm font-semibold text-foreground transition-all duration-150 hover:bg-slate-800 hover:text-white hover:border-slate-800"
    >
      <Languages className="h-3.5 w-3.5" />
      {isArabic ? "EN" : "ع"}
    </button>
  );
}
