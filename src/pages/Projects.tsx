import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Pencil, Trash2, Eye } from "lucide-react";
import { DataTable, SortableHeader } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate, todayDate } from "@/lib/utils";
import { getProjectsWithCosts, createProject, updateProject, deleteProject } from "@/services/projects";
import type { ProjectWithCosts } from "@/types";

const projectSchema = (t: (k: string) => string) =>
  z.object({
    name:            z.string().min(1, t("validation.required")),
    description:     z.string().optional(),
    client:          z.string().optional(),
    startDate:       z.string().min(1, t("validation.required")),
    status:          z.enum(["planning", "active", "completed", "on_hold"]),
    estimatedBudget: z.coerce.number().min(0).optional(),
  });

type ProjectFormValues = z.infer<ReturnType<typeof projectSchema>>;

export default function Projects() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectWithCosts[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectWithCosts | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectWithCosts | null>(null);
  const [saving, setSaving] = useState(false);

  const schema = projectSchema(t);
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", client: "", startDate: todayDate(), status: "planning", estimatedBudget: undefined },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try { setProjects(await getProjectsWithCosts()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    form.reset({ name: "", description: "", client: "", startDate: todayDate(), status: "planning" });
    setDialogOpen(true);
  };

  const openEdit = (p: ProjectWithCosts) => {
    setEditTarget(p);
    form.reset({ name: p.name, description: p.description ?? "", client: p.client ?? "", startDate: p.startDate, status: p.status, estimatedBudget: p.estimatedBudget ?? undefined });
    setDialogOpen(true);
  };

  const onSubmit = async (values: ProjectFormValues) => {
    setSaving(true);
    try {
      if (editTarget) {
        await updateProject(editTarget.id, values);
      } else {
        await createProject(values);
      }
      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    await deleteProject(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  };

  const columns: ColumnDef<ProjectWithCosts>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} label={t("projects.name")} />,
    },
    { accessorKey: "client", header: t("projects.client"), cell: ({ row }) => row.original.client ?? "-" },
    {
      accessorKey: "status",
      header: t("projects.status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "laborCost",
      header: t("projects.laborCost"),
      cell: ({ row }) => formatCurrency(row.original.laborCost),
    },
    {
      accessorKey: "hardwareCost",
      header: t("projects.hardwareCost"),
      cell: ({ row }) => formatCurrency(row.original.hardwareCost),
    },
    {
      accessorKey: "totalCost",
      header: ({ column }) => <SortableHeader column={column} label={t("projects.totalCost")} />,
      cell: ({ row }) => <span className="font-semibold">{formatCurrency(row.original.totalCost)}</span>,
    },
    {
      accessorKey: "completionPct",
      header: t("projects.progress"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={row.original.completionPct} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground w-8">{row.original.completionPct}%</span>
        </div>
      ),
    },
    {
      accessorKey: "startDate",
      header: t("projects.startDate"),
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => navigate(`/projects/${row.original.id}`)}>
            <Eye className="h-4 w-4" />
          </Button>
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("projects.title")}</h2>
        <Button onClick={openAdd} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          {t("projects.addProject")}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <DataTable columns={columns} data={projects} searchKey="name" searchPlaceholder={t("common.search")} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? t("projects.editProject") : t("projects.addProject")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("projects.name")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="client" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("projects.client")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("projects.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="planning">{t("status.planning")}</SelectItem>
                        <SelectItem value="active">{t("status.active")}</SelectItem>
                        <SelectItem value="completed">{t("status.completed")}</SelectItem>
                        <SelectItem value="on_hold">{t("status.on_hold")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("projects.startDate")}</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="estimatedBudget" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("projects.estimatedBudget")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("projects.description")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
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
        title={t("projects.deleteProject")}
        description={t("projects.deleteConfirm")}
      />
    </div>
  );
}
