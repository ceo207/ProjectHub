import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  const toggle = () => {
    i18n.changeLanguage(isArabic ? "en" : "ar");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className="gap-2 font-medium min-w-[90px]"
      title={t("language.switch")}
    >
      <Languages className="h-4 w-4" />
      {isArabic ? t("language.switchTo") : t("language.switchTo")}
    </Button>
  );
}
