import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search, FolderKanban, Users, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getSQLite } from "@/db";

interface ProjectResult {
  id: number;
  name: string;
  client: string | null;
  status: string;
  startDate: string;
  laborCost: number;
  hardwareCost: number;
  totalCost: number;
  teamSize: number;
  completionPct: number;
  estimatedBudget: number | null;
}

interface EmployeeResult {
  id: number;
  name: string;
  role: string;
  status: string;
  hourlyRate: number;
  startDate: string;
  totalHours: number;
  totalEarnings: number;
  projectCount: number;
}

export default function SmartSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [projectResults, setProjectResults] = useState<ProjectResult[]>([]);
  const [employeeResults, setEmployeeResults] = useState<EmployeeResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setProjectResults([]); setEmployeeResults([]); return; }
    setLoading(true);
    const like = `%${q}%`;
    try {
      const sqlite = getSQLite();
      const [pr, er] = await Promise.all([
        sqlite.select<any[]>(
          `SELECT
             p.id, p.name, p.client, p.status, p.start_date AS startDate, p.estimated_budget AS estimatedBudget,
             COALESCE((SELECT SUM(wl.hours_worked * e.hourly_rate) FROM work_logs wl JOIN employees e ON e.id=wl.employee_id WHERE wl.project_id=p.id), 0) AS laborCost,
             COALESCE((SELECT SUM(total_price) FROM hardware_costs WHERE project_id=p.id), 0) AS hardwareCost,
             COALESCE((SELECT COUNT(DISTINCT employee_id) FROM project_employees WHERE project_id=p.id), 0) AS teamSize,
             COALESCE((SELECT COUNT(*) FROM requirements WHERE project_id=p.id), 0) AS req_total,
             COALESCE((SELECT COUNT(*) FROM requirements WHERE project_id=p.id AND status='done'), 0) AS req_done
           FROM projects p
           WHERE p.name LIKE ? OR p.client LIKE ? OR p.description LIKE ?
           ORDER BY p.name LIMIT 20`,
          [like, like, like]
        ),
        sqlite.select<any[]>(
          `SELECT
             e.id, e.name, e.role, e.status, e.hourly_rate AS hourlyRate, e.start_date AS startDate,
             COALESCE(SUM(wl.hours_worked), 0) AS totalHours,
             COALESCE(SUM(wl.hours_worked * e.hourly_rate), 0) AS totalEarnings,
             COUNT(DISTINCT pe.project_id) AS projectCount
           FROM employees e
           LEFT JOIN work_logs wl ON wl.employee_id = e.id
           LEFT JOIN project_employees pe ON pe.employee_id = e.id
           WHERE e.name LIKE ? OR e.role LIKE ?
           GROUP BY e.id
           ORDER BY e.name LIMIT 20`,
          [like, like]
        ),
      ]);

      setProjectResults(pr.map((r) => ({
        id: r.id, name: r.name, client: r.client, status: r.status,
        startDate: r.startDate ?? r.start_date,
        laborCost: r.laborCost ?? 0, hardwareCost: r.hardwareCost ?? 0,
        totalCost: (r.laborCost ?? 0) + (r.hardwareCost ?? 0),
        teamSize: r.teamSize ?? 0,
        completionPct: r.req_total > 0 ? Math.round((r.req_done / r.req_total) * 100) : 0,
        estimatedBudget: r.estimatedBudget,
      })));

      setEmployeeResults(er.map((r) => ({
        id: r.id, name: r.name, role: r.role, status: r.status,
        hourlyRate: r.hourlyRate ?? r.hourly_rate,
        startDate: r.startDate ?? r.start_date,
        totalHours: r.totalHours ?? 0, totalEarnings: r.totalEarnings ?? 0,
        projectCount: r.projectCount ?? 0,
      })));
    } finally { setLoading(false); }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    search(val);
  };

  const showProjects = tab === "all" || tab === "projects";
  const showEmployees = tab === "all" || tab === "employees";
  const hasResults = projectResults.length > 0 || employeeResults.length > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">{t("smartSearch.title")}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t("smartSearch.subtitle")}</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="ps-10 h-12 text-base"
          placeholder={t("smartSearch.placeholder")}
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          autoFocus
        />
      </div>

      {/* Filter tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">{t("smartSearch.allResults")}</TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="h-3.5 w-3.5" />
            {t("smartSearch.projectResults")} {projectResults.length > 0 && `(${projectResults.length})`}
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-2">
            <Users className="h-3.5 w-3.5" />
            {t("smartSearch.employeeResults")} {employeeResults.length > 0 && `(${employeeResults.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading && <p className="text-muted-foreground">{t("common.loading")}</p>}

          {!loading && query && !hasResults && (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>{t("smartSearch.noResults", { query })}</p>
            </div>
          )}

          {!query && (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>{t("smartSearch.typeToSearch")}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Project Results */}
            {showProjects && projectResults.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  {t("smartSearch.projectResults")} ({projectResults.length})
                </h3>
                <div className="grid gap-3">
                  {projectResults.map((p) => (
                    <Card key={p.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-base truncate">{p.name}</h4>
                              <StatusBadge status={p.status as any} />
                            </div>
                            {p.client && <p className="text-sm text-muted-foreground mb-3">{p.client}</p>}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">{t("smartSearch.startDate")}</p>
                                <p className="font-medium">{formatDate(p.startDate)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t("smartSearch.totalCost")}</p>
                                <p className="font-bold text-primary">{formatCurrency(p.totalCost)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t("smartSearch.assignedEmployees")}</p>
                                <p className="font-medium">{p.teamSize}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t("smartSearch.completionPct")}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Progress value={p.completionPct} className="h-1.5 flex-1" />
                                  <span className="text-xs font-medium">{p.completionPct}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${p.id}`)} className="flex-shrink-0 gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            {t("common.view")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Employee Results */}
            {showEmployees && employeeResults.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t("smartSearch.employeeResults")} ({employeeResults.length})
                </h3>
                <div className="grid gap-3">
                  {employeeResults.map((e) => (
                    <Card key={e.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-base">{e.name}</h4>
                              <StatusBadge status={e.status as any} />
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{e.role}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">{t("employees.startDate")}</p>
                                <p className="font-medium">{formatDate(e.startDate)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t("smartSearch.totalHours")}</p>
                                <p className="font-medium">{e.totalHours.toFixed(1)} {t("common.hours")}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t("smartSearch.totalEarnings")}</p>
                                <p className="font-bold text-emerald-600">{formatCurrency(e.totalEarnings)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t("smartSearch.assignedProjects")}</p>
                                <p className="font-medium">{e.projectCount}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
