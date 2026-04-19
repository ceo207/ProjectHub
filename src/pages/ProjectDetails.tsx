import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, PlusCircle, Trash2, Pencil, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DataTable, SortableHeader } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { formatCurrency, formatDate, todayDate } from "@/lib/utils";
import { getProjectById, getProjectCosts, getProjectEmployees, assignEmployeeToProject, unassignEmployeeFromProject } from "@/services/projects";
import { getAllEmployees } from "@/services/employees";
import { getRequirementsByProject, createRequirement, updateRequirement, deleteRequirement } from "@/services/requirements";
import { getWorkLogsByProject, createWorkLog, updateWorkLog, deleteWorkLog } from "@/services/workLogs";
import { getHardwareCostsByProject, createHardwareCost, updateHardwareCost, deleteHardwareCost } from "@/services/hardwareCosts";
import type { Project, RequirementWithEmployee, WorkLogWithNames, HardwareCostWithProject, Employee } from "@/types";

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [costs, setCosts] = useState({ laborCost: 0, hardwareCost: 0, totalCost: 0 });
  const [teamMembers, setTeamMembers] = useState<{ id: number; employee_id: number; name: string; role: string; hourly_rate: number; assigned_at: string }[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [requirements, setRequirements] = useState<RequirementWithEmployee[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLogWithNames[]>([]);
  const [hardwareCosts, setHardwareCosts] = useState<HardwareCostWithProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [reqDialog, setReqDialog] = useState(false);
  const [reqEdit, setReqEdit] = useState<RequirementWithEmployee | null>(null);
  const [reqDelete, setReqDelete] = useState<RequirementWithEmployee | null>(null);
  const [logDialog, setLogDialog] = useState(false);
  const [logEdit, setLogEdit] = useState<WorkLogWithNames | null>(null);
  const [logDelete, setLogDelete] = useState<WorkLogWithNames | null>(null);
  const [hwDialog, setHwDialog] = useState(false);
  const [hwEdit, setHwEdit] = useState<HardwareCostWithProject | null>(null);
  const [hwDelete, setHwDelete] = useState<HardwareCostWithProject | null>(null);
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignEmpId, setAssignEmpId] = useState("");
  const [saving, setSaving] = useState(false);

  // Forms
  const reqSchema = z.object({
    title: z.string().min(1, t("validation.required")),
    description: z.string().optional(),
    status: z.enum(["todo", "in_progress", "done"]),
    assignedEmployeeId: z.coerce.number().optional().nullable(),
    progress: z.coerce.number().min(0).max(100),
  });
  const logSchema = z.object({
    employeeId: z.coerce.number().min(1, t("validation.required")),
    date: z.string().min(1, t("validation.required")),
    hoursWorked: z.coerce.number().min(0.1, t("validation.positiveNumber")),
    notes: z.string().optional(),
  });
  const hwSchema = z.object({
    itemName: z.string().min(1, t("validation.required")),
    quantity: z.coerce.number().int().min(1, t("validation.positiveNumber")),
    unitPrice: z.coerce.number().min(0.01, t("validation.positiveNumber")),
    purchaseDate: z.string().min(1, t("validation.required")),
  });

  const reqForm = useForm({ resolver: zodResolver(reqSchema), defaultValues: { title: "", description: "", status: "todo" as const, assignedEmployeeId: null, progress: 0 } });
  const logForm = useForm({ resolver: zodResolver(logSchema), defaultValues: { employeeId: 0, date: todayDate(), hoursWorked: 8, notes: "" } });
  const hwForm  = useForm({ resolver: zodResolver(hwSchema), defaultValues: { itemName: "", quantity: 1, unitPrice: 0, purchaseDate: todayDate() } });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, tm, ae, r, wl, hc] = await Promise.all([
        getProjectById(projectId),
        getProjectCosts(projectId),
        getProjectEmployees(projectId),
        getAllEmployees(),
        getRequirementsByProject(projectId),
        getWorkLogsByProject(projectId),
        getHardwareCostsByProject(projectId),
      ]);
      setProject(p);
      setCosts(c);
      setTeamMembers(tm);
      setAllEmployees(ae as unknown as Employee[]);
      setRequirements(r);
      setWorkLogs(wl);
      setHardwareCosts(hc);
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const completionPct = requirements.length > 0
    ? Math.round((requirements.filter((r) => r.status === "done").length / requirements.length) * 100)
    : 0;

  // Requirement handlers
  const onSaveReq = async (values: z.infer<typeof reqSchema>) => {
    setSaving(true);
    try {
      if (reqEdit) {
        await updateRequirement(reqEdit.id, { ...values, assignedEmployeeId: values.assignedEmployeeId ?? null });
      } else {
        await createRequirement({ ...values, projectId, assignedEmployeeId: values.assignedEmployeeId ?? null });
      }
      setReqDialog(false);
      await load();
    } finally { setSaving(false); }
  };

  // Work log handlers
  const onSaveLog = async (values: z.infer<typeof logSchema>) => {
    setSaving(true);
    try {
      if (logEdit) { await updateWorkLog(logEdit.id, values); }
      else { await createWorkLog({ ...values, projectId }); }
      setLogDialog(false);
      await load();
    } finally { setSaving(false); }
  };

  // Hardware cost handlers
  const onSaveHw = async (values: z.infer<typeof hwSchema>) => {
    setSaving(true);
    try {
      if (hwEdit) { await updateHardwareCost(hwEdit.id, values); }
      else { await createHardwareCost({ ...values, projectId }); }
      setHwDialog(false);
      await load();
    } finally { setSaving(false); }
  };

  const onAssignEmployee = async () => {
    if (!assignEmpId) return;
    await assignEmployeeToProject(projectId, Number(assignEmpId));
    setAssignDialog(false);
    setAssignEmpId("");
    await load();
  };

  if (loading || !project) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">{t("common.loading")}</div>;
  }

  const unassignedEmployees = allEmployees.filter((e) => !teamMembers.some((tm) => tm.employee_id === e.id));

  const reqColumns: ColumnDef<RequirementWithEmployee>[] = [
    { accessorKey: "title", header: t("requirements.taskTitle") },
    { accessorKey: "status", header: t("requirements.status"), cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: "employeeName", header: t("requirements.assignedEmployee"), cell: ({ row }) => row.original.employeeName ?? <span className="text-muted-foreground">{t("requirements.unassigned")}</span> },
    { accessorKey: "progress", header: t("requirements.progress"), cell: ({ row }) => (
      <div className="flex items-center gap-2 min-w-[80px]">
        <Progress value={row.original.progress} className="h-2 flex-1" />
        <span className="text-xs">{row.original.progress}%</span>
      </div>
    )},
    { id: "actions", header: t("common.actions"), cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={() => { setReqEdit(row.original); reqForm.reset({ title: row.original.title, description: row.original.description ?? "", status: row.original.status, assignedEmployeeId: row.original.assignedEmployeeId ?? null, progress: row.original.progress }); setReqDialog(true); }}><Pencil className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setReqDelete(row.original)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    )},
  ];

  const logColumns: ColumnDef<WorkLogWithNames>[] = [
    { accessorKey: "employeeName", header: t("workLogs.employee") },
    { accessorKey: "date", header: t("workLogs.date"), cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: "hoursWorked", header: t("workLogs.hoursWorked"), cell: ({ row }) => <span className="font-semibold text-primary">{row.original.hoursWorked} {t("common.hours")}</span> },
    { accessorKey: "notes", header: t("workLogs.notes"), cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.notes ?? "-"}</span> },
    { id: "actions", header: t("common.actions"), cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={() => { setLogEdit(row.original); logForm.reset({ employeeId: row.original.employeeId, date: row.original.date, hoursWorked: row.original.hoursWorked, notes: row.original.notes ?? "" }); setLogDialog(true); }}><Pencil className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setLogDelete(row.original)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    )},
  ];

  const hwColumns: ColumnDef<HardwareCostWithProject>[] = [
    { accessorKey: "itemName", header: t("hardwareCosts.itemName") },
    { accessorKey: "quantity", header: t("hardwareCosts.quantity") },
    { accessorKey: "unitPrice", header: t("hardwareCosts.unitPrice"), cell: ({ row }) => formatCurrency(row.original.unitPrice) },
    { accessorKey: "totalPrice", header: t("hardwareCosts.totalPrice"), cell: ({ row }) => <span className="font-semibold text-emerald-600">{formatCurrency(row.original.totalPrice)}</span> },
    { accessorKey: "purchaseDate", header: t("hardwareCosts.purchaseDate"), cell: ({ row }) => formatDate(row.original.purchaseDate) },
    { id: "actions", header: t("common.actions"), cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={() => { setHwEdit(row.original); hwForm.reset({ itemName: row.original.itemName, quantity: row.original.quantity, unitPrice: row.original.unitPrice, purchaseDate: row.original.purchaseDate }); setHwDialog(true); }}><Pencil className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setHwDelete(row.original)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{project.name}</h2>
          <p className="text-muted-foreground text-sm">{project.client ?? "-"}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("projectDetails.laborCost")}</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(costs.laborCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("projectDetails.hardwareCost")}</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(costs.hardwareCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("projectDetails.totalCost")}</p>
            <p className="text-lg font-bold">{formatCurrency(costs.totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("projectDetails.completion")}</p>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={completionPct} className="h-2 flex-1" />
              <span className="text-sm font-bold">{completionPct}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="requirements">
        <TabsList>
          <TabsTrigger value="requirements">{t("projectDetails.requirements")} ({requirements.length})</TabsTrigger>
          <TabsTrigger value="team">{t("projectDetails.team")} ({teamMembers.length})</TabsTrigger>
          <TabsTrigger value="workLogs">{t("projectDetails.workLogs")} ({workLogs.length})</TabsTrigger>
          <TabsTrigger value="hardware">{t("projectDetails.hardwareCosts")} ({hardwareCosts.length})</TabsTrigger>
        </TabsList>

        {/* Requirements */}
        <TabsContent value="requirements" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => { setReqEdit(null); reqForm.reset({ title: "", description: "", status: "todo", assignedEmployeeId: null, progress: 0 }); setReqDialog(true); }}>
              <PlusCircle className="h-4 w-4" />{t("projectDetails.addRequirement")}
            </Button>
          </div>
          {requirements.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">{t("projectDetails.noRequirements")}</p> :
            <DataTable columns={reqColumns} data={requirements} />}
        </TabsContent>

        {/* Team */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => setAssignDialog(true)} disabled={unassignedEmployees.length === 0}>
              <UserPlus className="h-4 w-4" />{t("projectDetails.assignEmployee")}
            </Button>
          </div>
          {teamMembers.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">{t("projectDetails.noTeam")}</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-sm text-muted-foreground">{m.role}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("projectDetails.assignedSince")}: {formatDate(m.assigned_at)}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={async () => { await unassignEmployeeFromProject(projectId, m.employee_id); await load(); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Work Logs */}
        <TabsContent value="workLogs" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => { setLogEdit(null); logForm.reset({ employeeId: 0, date: todayDate(), hoursWorked: 8, notes: "" }); setLogDialog(true); }}>
              <PlusCircle className="h-4 w-4" />{t("workLogs.addWorkLog")}
            </Button>
          </div>
          {workLogs.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">{t("projectDetails.noWorkLogs")}</p> :
            <DataTable columns={logColumns} data={workLogs} />}
        </TabsContent>

        {/* Hardware Costs */}
        <TabsContent value="hardware" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => { setHwEdit(null); hwForm.reset({ itemName: "", quantity: 1, unitPrice: 0, purchaseDate: todayDate() }); setHwDialog(true); }}>
              <PlusCircle className="h-4 w-4" />{t("hardwareCosts.addCost")}
            </Button>
          </div>
          {hardwareCosts.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">{t("projectDetails.noHardwareCosts")}</p> :
            <DataTable columns={hwColumns} data={hardwareCosts} />}
        </TabsContent>
      </Tabs>

      {/* Requirement Dialog */}
      <Dialog open={reqDialog} onOpenChange={setReqDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{reqEdit ? t("requirements.editRequirement") : t("requirements.addRequirement")}</DialogTitle></DialogHeader>
          <Form {...reqForm}>
            <form onSubmit={reqForm.handleSubmit(onSaveReq)} className="space-y-4">
              <FormField control={reqForm.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>{t("requirements.taskTitle")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={reqForm.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>{t("requirements.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="todo">{t("status.todo")}</SelectItem>
                        <SelectItem value="in_progress">{t("status.in_progress")}</SelectItem>
                        <SelectItem value="done">{t("status.done")}</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={reqForm.control} name="progress" render={({ field }) => (
                  <FormItem><FormLabel>{t("requirements.progress")}</FormLabel><FormControl><Input type="number" min="0" max="100" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={reqForm.control} name="assignedEmployeeId" render={({ field }) => (
                <FormItem><FormLabel>{t("requirements.assignedEmployee")}</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))} value={field.value ? String(field.value) : "none"}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t("requirements.unassigned")}</SelectItem>
                      {allEmployees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={reqForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>{t("requirements.description")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setReqDialog(false)}>{t("common.cancel")}</Button>
                <Button type="submit" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Work Log Dialog */}
      <Dialog open={logDialog} onOpenChange={setLogDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{logEdit ? t("workLogs.editWorkLog") : t("workLogs.addWorkLog")}</DialogTitle></DialogHeader>
          <Form {...logForm}>
            <form onSubmit={logForm.handleSubmit(onSaveLog)} className="space-y-4">
              <FormField control={logForm.control} name="employeeId" render={({ field }) => (
                <FormItem><FormLabel>{t("workLogs.employee")}</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("workLogs.selectEmployee")} /></SelectTrigger></FormControl>
                    <SelectContent>{allEmployees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={logForm.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>{t("workLogs.date")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={logForm.control} name="hoursWorked" render={({ field }) => (
                  <FormItem><FormLabel>{t("workLogs.hoursWorked")}</FormLabel><FormControl><Input type="number" step="0.25" min="0.25" max="24" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={logForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>{t("workLogs.notes")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setLogDialog(false)}>{t("common.cancel")}</Button>
                <Button type="submit" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Hardware Dialog */}
      <Dialog open={hwDialog} onOpenChange={setHwDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{hwEdit ? t("hardwareCosts.editCost") : t("hardwareCosts.addCost")}</DialogTitle></DialogHeader>
          <Form {...hwForm}>
            <form onSubmit={hwForm.handleSubmit(onSaveHw)} className="space-y-4">
              <FormField control={hwForm.control} name="itemName" render={({ field }) => (
                <FormItem><FormLabel>{t("hardwareCosts.itemName")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={hwForm.control} name="quantity" render={({ field }) => (
                  <FormItem><FormLabel>{t("hardwareCosts.quantity")}</FormLabel><FormControl><Input type="number" min="1" step="1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={hwForm.control} name="unitPrice" render={({ field }) => (
                  <FormItem><FormLabel>{t("hardwareCosts.unitPrice")}</FormLabel><FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={hwForm.control} name="purchaseDate" render={({ field }) => (
                <FormItem><FormLabel>{t("hardwareCosts.purchaseDate")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setHwDialog(false)}>{t("common.cancel")}</Button>
                <Button type="submit" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Assign Employee Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t("projectDetails.assignEmployee")}</DialogTitle></DialogHeader>
          <Select onValueChange={setAssignEmpId} value={assignEmpId}>
            <SelectTrigger><SelectValue placeholder={t("requirements.selectEmployee")} /></SelectTrigger>
            <SelectContent>
              {unassignedEmployees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name} — {e.role}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssignDialog(false)}>{t("common.cancel")}</Button>
            <Button onClick={onAssignEmployee} disabled={!assignEmpId}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!reqDelete} onOpenChange={(o) => !o && setReqDelete(null)} onConfirm={async () => { await deleteRequirement(reqDelete!.id); setReqDelete(null); await load(); }} title={t("requirements.deleteRequirement")} description={t("requirements.deleteConfirm")} />
      <DeleteConfirmDialog open={!!logDelete} onOpenChange={(o) => !o && setLogDelete(null)} onConfirm={async () => { await deleteWorkLog(logDelete!.id); setLogDelete(null); await load(); }} title={t("workLogs.deleteWorkLog")} description={t("workLogs.deleteConfirm")} />
      <DeleteConfirmDialog open={!!hwDelete} onOpenChange={(o) => !o && setHwDelete(null)} onConfirm={async () => { await deleteHardwareCost(hwDelete!.id); setHwDelete(null); await load(); }} title={t("hardwareCosts.deleteCost")} description={t("hardwareCosts.deleteConfirm")} />
    </div>
  );
}
