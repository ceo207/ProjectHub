import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ClipboardList,
  HardDrive,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

const groups = [
  {
    labelKey: "nav.groups.overview",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, key: "nav.dashboard" },
    ],
  },
  {
    labelKey: "nav.groups.management",
    items: [
      { to: "/projects",  icon: FolderKanban, key: "nav.projects" },
      { to: "/employees", icon: Users,        key: "nav.employees" },
    ],
  },
  {
    labelKey: "nav.groups.operations",
    items: [
      { to: "/work-logs",      icon: ClipboardList, key: "nav.workLogs" },
      { to: "/hardware-costs", icon: HardDrive,     key: "nav.hardwareCosts" },
    ],
  },
] as const;

export default function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="sidebar-width flex-shrink-0 bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Briefcase className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-lg font-bold text-white leading-none">{t("app.name")}</p>
          <p className="text-[10px] text-[hsl(var(--sidebar-foreground))]/60 mt-1">{t("app.tagline")}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((group) => (
          <div key={group.labelKey}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--sidebar-foreground))]/40 select-none">
              {t(group.labelKey)}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, key }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-[hsl(var(--sidebar-accent))] text-white"
                        : "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-white/10 hover:text-white"
                    )
                  }
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {t(key)}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[hsl(var(--sidebar-border))]">
        <p className="text-xs text-[hsl(var(--sidebar-foreground))]/40">v1.0.0</p>
      </div>
    </aside>
  );
}
