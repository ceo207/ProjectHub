import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

const routeTitleMap: Record<string, string> = {
  "/dashboard":      "nav.dashboard",
  "/projects/":      "projectDetails.title",
  "/projects":       "nav.projects",
  "/employees":      "nav.employees",
  "/work-logs":      "nav.workLogs",
  "/hardware-costs": "nav.hardwareCosts",
};

export default function TopBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const titleKey =
    Object.entries(routeTitleMap).find(([path]) => pathname.startsWith(path))?.[1] ??
    "app.name";

  return (
    <header className="h-16 border-b bg-background flex-shrink-0 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="w-1 h-6 rounded-full bg-primary block" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t(titleKey)}</h1>
      </div>
      <LanguageSwitcher />
    </header>
  );
}
