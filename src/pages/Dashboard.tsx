import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Users, FolderKanban, DollarSign, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getDashboardStats, getMonthlyCosts, getProjectCostChart, getRecentWorkLogs } from "@/services/dashboard";
import { getProjectsWithCosts } from "@/services/projects";
import type { DashboardStats, MonthlyCostData, ProjectWithCosts } from "@/types";

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthlyCosts, setMonthlyCosts] = useState<MonthlyCostData[]>([]);
  const [projectChart, setProjectChart] = useState<{ name: string; labor: number; hardware: number; total: number }[]>([]);
  const [recentLogs, setRecentLogs] = useState<{ id: number; date: string; hours_worked: number; employee_name: string; project_name: string }[]>([]);
  const [projects, setProjects] = useState<ProjectWithCosts[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, mc, pc, rl, pr] = await Promise.all([
        getDashboardStats(),
        getMonthlyCosts(6),
        getProjectCostChart(),
        getRecentWorkLogs(5),
        getProjectsWithCosts(),
      ]);
      setStats(s);
      setMonthlyCosts(mc);
      setProjectChart(pc);
      setRecentLogs(rl);
      setProjects(pr);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("dashboard.totalEmployees")}
          value={stats?.totalEmployees ?? 0}
          subtitle={`${stats?.activeEmployees ?? 0} ${t("dashboard.employees")}`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title={t("dashboard.totalProjects")}
          value={stats?.totalProjects ?? 0}
          subtitle={`${stats?.activeProjects ?? 0} ${t("status.active")}`}
          icon={<FolderKanban className="h-5 w-5" />}
        />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium text-muted-foreground">{t("dashboard.totalCost")}</p>
                <p className="text-2xl font-bold tracking-tight">{formatCurrency(stats?.totalCost ?? 0)}</p>
                <div className="flex flex-col gap-0.5 pt-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="text-blue-500 font-medium">{t("dashboard.totalCodingCost")}: </span>
                    {formatCurrency(projects.reduce((s, p) => s + p.laborCost, 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-emerald-600 font-medium">{t("dashboard.totalHardwareCost")}: </span>
                    {formatCurrency(projects.reduce((s, p) => s + p.hardwareCost, 0))}
                  </p>
                </div>
              </div>
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium text-muted-foreground">{t("dashboard.monthlyCost")}</p>
                <p className="text-2xl font-bold tracking-tight">{formatCurrency(stats?.monthlyCost ?? 0)}</p>
                <div className="flex flex-col gap-0.5 pt-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="text-blue-500 font-medium">{t("dashboard.totalCodingCost")}: </span>
                    {formatCurrency(stats?.monthlyLaborCost ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-emerald-600 font-medium">{t("dashboard.totalHardwareCost")}: </span>
                    {formatCurrency(stats?.monthlyHardwareCost ?? 0)}
                  </p>
                </div>
              </div>
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.costOverTime")}</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyCosts.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                {t("dashboard.noLogsYet")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyCosts}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="labor" stroke="hsl(221 83% 53%)" name={t("dashboard.laborCost")} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="hardware" stroke="hsl(142 76% 36%)" name={t("dashboard.hardwareCost")} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cost by Project */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.projectCosts")}</CardTitle>
          </CardHeader>
          <CardContent>
            {projectChart.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                {t("dashboard.noProjectsYet")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={projectChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="labor" stackId="a" fill="hsl(221 83% 53%)" name={t("dashboard.laborCost")} />
                  <Bar dataKey="hardware" stackId="a" fill="hsl(142 76% 36%)" name={t("dashboard.hardwareCost")} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.projectProgress")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noProjectsYet")}</p>
            ) : (
              projects.slice(0, 5).map((p) => (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[60%]">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      <span className="text-muted-foreground text-xs">{p.completionPct}%</span>
                    </div>
                  </div>
                  <Progress value={p.completionPct} className="h-2" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Work Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.recentWorkLogs")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noLogsYet")}</p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{log.employee_name}</p>
                      <p className="text-muted-foreground text-xs">{log.project_name} · {formatDate(log.date)}</p>
                    </div>
                    <span className="font-semibold text-primary">{log.hours_worked}{t("common.hours")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
