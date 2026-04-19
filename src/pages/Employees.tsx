import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Pencil, Trash2, Download } from "lucide-react";
import { DataTable, SortableHeader } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatCurrency, formatDate, todayDate } from "@/lib/utils";
import { createEmployee, updateEmployee, deleteEmployee, getEmployeesWithStats } from "@/services/employees";
import { downloadWorkingHoursTemplate } from "@/services/workingHoursTemplate";
import type { EmployeeWithStats } from "@/types";

const employeeSchema = (t: (key: string) => string) =>
  z.object({
    name:       z.string().min(1, t("validation.required")),
    startDate:  z.string().min(1, t("validation.required")),
    status:     z.enum(["active", "inactive"]),
    hourlyRate: z.coerce.number().min(0, t("validation.positiveNumber")),
    role:       z.string().min(1, t("validation.required")),
    notes:      z.string().optional(),
  });

type EmployeeFormValues = z.infer<ReturnType<typeof employeeSchema>>;

export default function Employees() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<EmployeeWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmployeeWithStats | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeWithStats | null>(null);
  const [saving, setSaving] = useState(false);

  const schema = employeeSchema(t);
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", startDate: todayDate(), status: "active", hourlyRate: 0, role: "", notes: "" },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try { setEmployees(await getEmployeesWithStats()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    form.reset({ name: "", startDate: todayDate(), status: "active", hourlyRate: 0, role: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (emp: EmployeeWithStats) => {
    setEditTarget(emp);
    form.reset({ name: emp.name, startDate: emp.startDate, status: emp.status, hourlyRate: emp.hourlyRate, role: emp.role, notes: emp.notes ?? "" });
    setDialogOpen(true);
  };

  const onSubmit = async (values: EmployeeFormValues) => {
    setSaving(true);
    try {
      if (editTarget) {
        await updateEmployee(editTarget.id, values);
      } else {
        await createEmployee(values);
      }
      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    await deleteEmployee(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  };

  const columns: ColumnDef<EmployeeWithStats>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} label={t("employees.name")} />,
    },
    {
      accessorKey: "role",
      header: t("employees.role"),
    },
    {
      accessorKey: "status",
      header: t("employees.status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "hourlyRate",
      header: ({ column }) => <SortableHeader column={column} label={t("employees.hourlyRate")} />,
      cell: ({ row }) => formatCurrency(row.original.hourlyRate),
    },
    {
      accessorKey: "totalHours",
      header: t("employees.totalHours"),
      cell: ({ row }) => `${row.original.totalHours.toFixed(1)} ${t("common.hours")}`,
    },
    {
      accessorKey: "totalEarnings",
      header: t("employees.totalEarnings"),
      cell: ({ row }) => <span className="font-semibold text-emerald-600">{formatCurrency(row.original.totalEarnings)}</span>,
    },
    {
      accessorKey: "startDate",
      header: t("employees.startDate"),
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(row.original)}>
            <Trash2 className="h-4 w-4" />
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
          data={employees}
          searchKey="name"
          searchPlaceholder={t("common.search")}
          toolbar={
            <>
              <Button variant="outline" onClick={() => downloadWorkingHoursTemplate()} className="gap-2">
                <Download className="h-4 w-4" />
                {t("employees.downloadTemplate")}
              </Button>
              <Button onClick={openAdd} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                {t("employees.addEmployee")}
              </Button>
            </>
          }
        />
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? t("employees.editEmployee") : t("employees.addEmployee")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("employees.name")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("employees.role")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("employees.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">{t("status.active")}</SelectItem>
                        <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="hourlyRate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("employees.hourlyRate")}</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("employees.startDate")}</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("employees.notes")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                    <FormControl><Textarea rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
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
        title={t("employees.deleteEmployee")}
        description={t("employees.deleteConfirm")}
      />
    </div>
  );
}
