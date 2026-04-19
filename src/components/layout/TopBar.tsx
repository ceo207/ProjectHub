import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

const routeTitleMap: Record<string, string> = {
  "/dashboard":      "nav.dashboard",
  "/employees":      "nav.employees",
  "/projects":       "nav.projects",
  "/work-logs":      "nav.workLogs",
  "/hardware-costs": "nav.hardwareCosts",
  "/smart-search":   "nav.smartSearch",
};

export default function TopBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const titleKey = Object.entries(routeTitleMap).find(([path]) =>
    pathname.startsWith(path)
  )?.[1] ?? "app.name";

  return (
    <header className="h-16 border-b bg-background px-6 flex items-center justify-between flex-shrink-0">
      <h1 className="text-lg font-semibold text-foreground">{t(titleKey)}</h1>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
      </div>
    </header>
  );
}
