import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
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
import { getAllEmployees } from "@/services/employees";
import { getAllProjects } from "@/services/projects";
import type { WorkLogWithNames, Employee, Project } from "@/types";

const schema = (t: (k: string) => string) =>
  z.object({
    employeeId:  z.coerce.number().min(1, t("validation.required")),
    projectId:   z.coerce.number().min(1, t("validation.required")),
    date:        z.string().min(1, t("validation.required")),
    hoursWorked: z.coerce.number().min(0.1, t("validation.positiveNumber")),
    notes:       z.string().optional(),
  });

type WorkLogFormValues = z.infer<ReturnType<typeof schema>>;

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
      if (editTarget) { await updateWorkLog(editTarget.id, values); }
      else { await createWorkLog(values); }
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
      cell: ({ row }) => <span className="font-semibold text-primary">{row.original.hoursWorked} {t("common.hours")}</span>,
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
      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          searchKey="employeeName"
          searchPlaceholder={t("common.search")}
          toolbar={
            <Button onClick={openAdd} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              {t("workLogs.addWorkLog")}
            </Button>
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
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="hoursWorked" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("workLogs.hoursWorked")}</FormLabel>
                    <FormControl><Input type="number" step="0.25" min="0.25" max="24" {...field} /></FormControl>
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
