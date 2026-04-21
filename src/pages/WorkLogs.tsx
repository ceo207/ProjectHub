import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Pencil, Trash2, Upload, CheckCircle2, XCircle, X } from "lucide-react";
import { DataTable, SortableHeader } from "@/components/shared/DataTable";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatCurrency, formatDate, todayDate } from "@/lib/utils";
import { getAllWorkLogs, createWorkLog, updateWorkLog, deleteWorkLog } from "@/services/workLogs";
import { toast } from "@/hooks/use-toast";
import { getAllEmployees } from "@/services/employees";
import { getAllProjects } from "@/services/projects";
import { importWorkLogsFromExcel } from "@/services/importWorkLogs";
import type { WorkLogWithNames, Employee, Project } from "@/types";

const schema = (t: (k: string) => string) =>
  z.object({
    employeeId:  z.coerce.number().min(1, t("validation.required")),
    projectId:   z.coerce.number().min(1, t("validation.required")),
    date:        z.string().min(1, t("validation.required")),
    hoursWorked: z.coerce.number().min(0.1, t("validation.positiveNumber")).multipleOf(0.1, t("validation.oneDecimal")),
    notes:       z.string().optional(),
  });

type WorkLogFormValues = z.infer<ReturnType<typeof schema>>;

type ImportStatus = { imported: number; skipped: number; errors: string[] } | null;

export default function WorkLogs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<WorkLogWithNames[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkLogWithNames | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkLogWithNames | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportStatus>(null);

  // Filters ("all" = no filter)
  const [filterMonth, setFilterMonth] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterProject, setFilterProject] = useState("all");

  const workLogSchema = schema(t);
  const form = useForm<WorkLogFormValues>({
    resolver: zodResolver(workLogSchema),
    defaultValues: { employeeId: 0, projectId: 0, date: todayDate(), hoursWorked: 8, notes: "" },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, e, p] = await Promise.all([getAllWorkLogs(), getAllEmployees(), getAllProjects()]);
      setLogs(l);
      setEmployees(e as unknown as Employee[]);
      setProjects(p as unknown as Project[]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Projects visible in dropdown = only those the selected employee has logged on
  const availableProjects = useMemo(() => {
    if (filterEmployee === "all") return projects;
    const ids = new Set(logs.filter(l => l.employeeId === Number(filterEmployee)).map(l => l.projectId));
    return projects.filter(p => ids.has(p.id));
  }, [logs, projects, filterEmployee]);

  // Employees visible in dropdown = only those who logged on the selected project
  const availableEmployees = useMemo(() => {
    if (filterProject === "all") return employees;
    const ids = new Set(logs.filter(l => l.projectId === Number(filterProject)).map(l => l.employeeId));
    return employees.filter(e => ids.has(e.id));
  }, [logs, employees, filterProject]);

  const onEmployeeChange = (val: string) => {
    setFilterEmployee(val);
    if (val !== "all" && filterProject !== "all") {
      const valid = new Set(logs.filter(l => l.employeeId === Number(val)).map(l => l.projectId));
      if (!valid.has(Number(filterProject))) setFilterProject("all");
    }
  };

  const onProjectChange = (val: string) => {
    setFilterProject(val);
    if (val !== "all" && filterEmployee !== "all") {
      const valid = new Set(logs.filter(l => l.projectId === Number(val)).map(l => l.employeeId));
      if (!valid.has(Number(filterEmployee))) setFilterEmployee("all");
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterMonth && !log.date.startsWith(filterMonth)) return false;
      if (filterEmployee !== "all" && log.employeeId !== Number(filterEmployee)) return false;
      if (filterProject !== "all" && log.projectId !== Number(filterProject)) return false;
      return true;
    });
  }, [logs, filterMonth, filterEmployee, filterProject]);

  const totalHours   = useMemo(() => filteredLogs.reduce((s, l) => s + l.hoursWorked, 0), [filteredLogs]);
  const totalEarning = useMemo(() => filteredLogs.reduce((s, l) => s + l.earning, 0), [filteredLogs]);
  const hasFilters   = filterMonth !== "" || filterEmployee !== "all" || filterProject !== "all";

  const clearFilters = () => {
    setFilterMonth("");
    setFilterEmployee("all");
    setFilterProject("all");
  };

  const openAdd = () => {
    setEditTarget(null);
    form.reset({ employeeId: 0, projectId: 0, date: todayDate(), hoursWorked: 8, notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (log: WorkLogWithNames) => {
    setEditTarget(log);
    form.reset({ employeeId: log.employeeId, projectId: log.projectId, date: log.date, hoursWorked: log.hoursWorked, notes: log.notes ?? "" });
    setDialogOpen(true);
  };

  const onSubmit = async (values: WorkLogFormValues) => {
    setSaving(true);
    try {
      if (editTarget) {
        await updateWorkLog(editTarget.id, values);
        toast(t("common.updatedSuccessfully"));
      } else {
        await createWorkLog(values);
        toast(t("common.addedSuccessfully"));
      }
      setDialogOpen(false);
      await load();
    } finally { setSaving(false); }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    await deleteWorkLog(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  };

  const onImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importWorkLogsFromExcel(employees, projects);
      if (result) {
        setImportResult(result);
        if (result.imported > 0) await load();
        setTimeout(() => setImportResult(null), 5000);
      }
    } finally {
      setImporting(false);
    }
  };

  const columns: ColumnDef<WorkLogWithNames>[] = [
    {
      accessorKey: "employeeName",
      header: t("workLogs.employee"),
    },
    {
      accessorKey: "projectName",
      header: t("workLogs.project"),
    },
    {
      accessorKey: "date",
      header: ({ column }) => <SortableHeader column={column} label={t("workLogs.date")} />,
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "hoursWorked",
      size: 80,
      header: ({ column }) => <SortableHeader column={column} label={t("workLogs.hoursWorked")} />,
      cell: ({ row }) => <span className="font-semibold text-primary">{row.original.hoursWorked.toFixed(1)} {t("common.hours")}</span>,
    },
    {
      accessorKey: "earning",
      header: ({ column }) => <SortableHeader column={column} label={t("workLogs.earning")} />,
      cell: ({ row }) => <span className="font-semibold text-emerald-600">{formatCurrency(row.original.earning)}</span>,
    },
    {
      accessorKey: "notes",
      size: 400,
      header: t("workLogs.notes"),
      cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.notes ?? "-"}</span>,
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => (
        <div className="flex gap-1.5 justify-center">
          <Button size="icon" variant="ghost" onClick={() => openEdit(row.original)}
            className="h-8 w-8 text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(row.original)}
            className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Import result banner */}
      {importResult && (
        <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
          importResult.errors.length > 0 || importResult.imported === 0
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-800"
        }`}>
          {importResult.imported > 0 && importResult.errors.length === 0
            ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            : <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />}
          <div className="flex-1">
            {importResult.imported > 0 && (
              <p className="font-medium">
                Successfully imported {importResult.imported} work log{importResult.imported !== 1 ? "s" : ""}.
              </p>
            )}
            {importResult.errors.map((e, i) => (
              <p key={i} className="text-red-700">{e}</p>
            ))}
          </div>
          <button onClick={() => setImportResult(null)} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{t("workLogs.filterMonth")}</span>
          <Input
            type="month"
            lang="en-CA"
            dir="ltr"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-44 bg-background"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{t("workLogs.employee")}</span>
          <Select value={filterEmployee} onValueChange={onEmployeeChange}>
            <SelectTrigger className="w-48 bg-background"><SelectValue placeholder={t("workLogs.allEmployees")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("workLogs.allEmployees")}</SelectItem>
              {availableEmployees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{t("workLogs.project")}</span>
          <Select value={filterProject} onValueChange={onProjectChange}>
            <SelectTrigger className="w-48 bg-background"><SelectValue placeholder={t("workLogs.allProjects")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("workLogs.allProjects")}</SelectItem>
              {availableProjects.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
            {t("common.clearFilters")}
          </Button>
        )}

        {/* Summary */}
        {hasFilters && (
          <div className="ms-auto flex gap-4 rounded-md border bg-background px-4 py-2 text-sm">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t("workLogs.totalHours")}</p>
              <p className="font-bold text-primary">{totalHours.toFixed(1)} {t("common.hours")}</p>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t("workLogs.totalEarning")}</p>
              <p className="font-bold text-emerald-600">{formatCurrency(totalEarning)}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <DataTable
          columns={columns}
          data={filteredLogs}
          searchKey="employeeName"
          searchPlaceholder={t("common.search")}
          toolbar={
            <div className="flex gap-2">
              <Button variant="outline" onClick={onImport} disabled={importing} className="gap-2">
                <Upload className="h-4 w-4" />
                {importing ? t("workLogs.importing") : t("workLogs.importTimesheet")}
              </Button>
              <Button onClick={openAdd} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                {t("workLogs.addWorkLog")}
              </Button>
            </div>
          }
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? t("workLogs.editWorkLog") : t("workLogs.addWorkLog")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="employeeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workLogs.employee")}</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("workLogs.selectEmployee")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {employees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="projectId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workLogs.project")}</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("workLogs.selectProject")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {projects.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("workLogs.date")}</FormLabel>
                    <FormControl><Input type="date" lang="en-CA" dir="ltr" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="hoursWorked" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("workLogs.hoursWorked")}</FormLabel>
                    <FormControl><Input type="number" step="0.1" min="0.1" max="24" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workLogs.notes")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                  <FormControl><Textarea rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
                <Button type="submit" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={onDelete}
        title={t("workLogs.deleteWorkLog")}
        description={t("workLogs.deleteConfirm")}
      />
    </div>
  );
}
