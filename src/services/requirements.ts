import { getSQLite } from "../db";
import { nowISO } from "../lib/utils";
import type { RequirementWithEmployee } from "../types";

export type NewRequirementInput = {
  projectId: number;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  assignedEmployeeId?: number | null;
  progress: number;
};

export async function getRequirementsByProject(projectId: number): Promise<RequirementWithEmployee[]> {
  const rows = await getSQLite().select<{
    id: number;
    project_id: number;
    title: string;
    description: string | null;
    status: string;
    assigned_employee_id: number | null;
    progress: number;
    created_at: string;
    updated_at: string;
    employee_name: string | null;
  }[]>(
    `SELECT r.*, e.name AS employee_name
     FROM requirements r
     LEFT JOIN employees e ON e.id = r.assigned_employee_id
     WHERE r.project_id = ?
     ORDER BY r.created_at`,
    [projectId]
  );

  return rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    description: r.description,
    status: r.status as "todo" | "in_progress" | "done",
    assignedEmployeeId: r.assigned_employee_id,
    progress: r.progress,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    employeeName: r.employee_name,
  }));
}

export async function createRequirement(data: NewRequirementInput) {
  const now = nowISO();
  return getSQLite().execute(
    `INSERT INTO requirements (project_id, title, description, status, assigned_employee_id, progress, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.projectId, data.title, data.description ?? null, data.status, data.assignedEmployeeId ?? null, data.progress, now, now]
  );
}

export async function updateRequirement(id: number, data: Partial<Omit<NewRequirementInput, "projectId">>) {
  const now = nowISO();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
  if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
  if ("assignedEmployeeId" in data) { fields.push("assigned_employee_id = ?"); values.push(data.assignedEmployeeId ?? null); }
  if (data.progress !== undefined) { fields.push("progress = ?"); values.push(data.progress); }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  await getSQLite().execute(`UPDATE requirements SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteRequirement(id: number) {
  await getSQLite().execute("DELETE FROM requirements WHERE id = ?", [id]);
}

export async function getProjectCompletion(projectId: number): Promise<number> {
  const rows = await getSQLite().select<{ total: number; done: number }[]>(
    `SELECT
       COUNT(*)                                          AS total,
       SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done
     FROM requirements WHERE project_id = ?`,
    [projectId]
  );
  const r = rows[0];
  if (!r || r.total === 0) return 0;
  return Math.round((r.done / r.total) * 100);
}
