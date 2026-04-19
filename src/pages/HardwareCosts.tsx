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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatCurrency, formatDate, todayDate } from "@/lib/utils";
import { getAllHardwareCosts, createHardwareCost, updateHardwareCost, deleteHardwareCost } from "@/services/hardwareCosts";
import { getAllProjects } from "@/services/projects";
import type { HardwareCostWithProject, Project } from "@/types";

const schema = (t: (k: string) => string) =>
  z.object({
    projectId:    z.coerce.number().min(1, t("validation.required")),
    itemName:     z.string().min(1, t("validation.required")),
    quantity:     z.coerce.number().int().min(1, t("validation.positiveNumber")),
    unitPrice:    z.coerce.number().min(0.01, t("validation.positiveNumber")),
    purchaseDate: z.string().min(1, t("validation.required")),
  });

type HardwareFormValues = z.infer<ReturnType<typeof schema>>;

export default function HardwareCosts() {
  const { t } = useTranslation();
  const [costs, setCosts] = useState<HardwareCostWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HardwareCostWithProject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HardwareCostWithProject | null>(null);
  const [saving, setSaving] = useState(false);

  const hardwareSchema = schema(t);
  const form = useForm<HardwareFormValues>({
    resolver: zodResolver(hardwareSchema),
    defaultValues: { projectId: 0, itemName: "", quantity: 1, unitPrice: 0, purchaseDate: todayDate() },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([getAllHardwareCosts(), getAllProjects()]);
      setCosts(c);
      setProjects(p as unknown as Project[]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    form.reset({ projectId: 0, itemName: "", quantity: 1, unitPrice: 0, purchaseDate: todayDate() });
    setDialogOpen(true);
  };

  const openEdit = (c: HardwareCostWithProject) => {
    setEditTarget(c);
    form.reset({ projectId: c.projectId, itemName: c.itemName, quantity: c.quantity, unitPrice: c.unitPrice, purchaseDate: c.purchaseDate });
    setDialogOpen(true);
  };

  const onSubmit = async (values: HardwareFormValues) => {
    setSaving(true);
    try {
      if (editTarget) { await updateHardwareCost(editTarget.id, values); }
      else { await createHardwareCost(values); }
      setDialogOpen(false);
      await load();
    } finally { setSaving(false); }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    await deleteHardwareCost(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  };

  const unitPrice = form.watch("unitPrice");
  const quantity  = form.watch("quantity");
  const previewTotal = (Number(unitPrice) || 0) * (Number(quantity) || 0);

  const columns: ColumnDef<HardwareCostWithProject>[] = [
    { accessorKey: "projectName", header: t("hardwareCosts.project") },
    {
      accessorKey: "itemName",
      header: ({ column }) => <SortableHeader column={column} label={t("hardwareCosts.itemName")} />,
    },
    { accessorKey: "quantity", header: t("hardwareCosts.quantity") },
    {
      accessorKey: "unitPrice",
      header: t("hardwareCosts.unitPrice"),
      cell: ({ row }) => formatCurrency(row.original.unitPrice),
    },
    {
      accessorKey: "totalPrice",
      header: ({ column }) => <SortableHeader column={column} label={t("hardwareCosts.totalPrice")} />,
      cell: ({ row }) => <span className="font-semibold text-emerald-600">{formatCurrency(row.original.totalPrice)}</span>,
    },
    {
      accessorKey: "purchaseDate",
      header: ({ column }) => <SortableHeader column={column} label={t("hardwareCosts.purchaseDate")} />,
      cell: ({ row }) => formatDate(row.original.purchaseDate),
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
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
        <h2 className="text-2xl font-bold">{t("hardwareCosts.title")}</h2>
        <Button onClick={openAdd} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          {t("hardwareCosts.addCost")}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <DataTable columns={columns} data={costs} searchKey="itemName" searchPlaceholder={t("common.search")} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? t("hardwareCosts.editCost") : t("hardwareCosts.addCost")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="projectId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("hardwareCosts.project")}</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("hardwareCosts.selectProject")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {projects.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="itemName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("hardwareCosts.itemName")}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("hardwareCosts.quantity")}</FormLabel>
                    <FormControl><Input type="number" min="1" step="1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="unitPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("hardwareCosts.unitPrice")}</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("hardwareCosts.purchaseDate")}</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {previewTotal > 0 && (
                <div className="rounded-md bg-muted px-4 py-2 text-sm flex justify-between">
                  <span className="text-muted-foreground">{t("hardwareCosts.totalPrice")}</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(previewTotal)}</span>
                </div>
              )}
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
        title={t("hardwareCosts.deleteCost")}
        description={t("hardwareCosts.deleteConfirm")}
      />
    </div>
  );
}
