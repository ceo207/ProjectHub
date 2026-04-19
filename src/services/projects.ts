import { getSQLite } from "../db";
import { nowISO } from "../lib/utils";
import type { ProjectWithCosts } from "../types";

export type NewProjectInput = {
  name: string;
  description?: string;
  client?: string;
  startDate: string;
  status: "planning" | "active" | "completed" | "on_hold";
  estimatedBudget?: number;
};

export async function getAllProjects() {
  const rows = await getSQLite().select<{
    id: number;
    name: string;
    description: string | null;
    client: string | null;
    start_date: string;
    status: string;
    estimated_budget: number | null;
    created_at: string;
    updated_at: string;
  }[]>("SELECT * FROM projects ORDER BY created_at DESC", []);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    client: r.client,
    startDate: r.start_date,
    status: r.status as NewProjectInput["status"],
    estimatedBudget: r.estimated_budget,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getProjectById(id: number) {
  const rows = await getSQLite().select<{
    id: number;
    name: string;
    description: string | null;
    client: string | null;
    start_date: string;
    status: string;
    estimated_budget: number | null;
    created_at: string;
    updated_at: string;
  }[]>("SELECT * FROM projects WHERE id = ?", [id]);

  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    client: r.client,
    startDate: r.start_date,
    status: r.status as NewProjectInput["status"],
    estimatedBudget: r.estimated_budget,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function createProject(data: NewProjectInput) {
  const now = nowISO();
  return getSQLite().execute(
    `INSERT INTO projects (name, description, client, start_date, status, estimated_budget, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.description ?? null, data.client ?? null, data.startDate, data.status, data.estimatedBudget ?? null, now, now]
  );
}

export async function updateProject(id: number, data: Partial<NewProjectInput>) {
  const now = nowISO();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
  if (data.client !== undefined) { fields.push("client = ?"); values.push(data.client); }
  if (data.startDate !== undefined) { fields.push("start_date = ?"); values.push(data.startDate); }
  if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
  if (data.estimatedBudget !== undefined) { fields.push("estimated_budget = ?"); values.push(data.estimatedBudget); }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  await getSQLite().execute(
    `UPDATE projects SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
}

export async function deleteProject(id: number) {
  await getSQLite().execute("DELETE FROM projects WHERE id = ?", [id]);
}

export async function getProjectsWithCosts(): Promise<ProjectWithCosts[]> {
  const rows = await getSQLite().select<{
    id: number;
    name: string;
    description: string | null;
    client: string | null;
    start_date: string;
    status: string;
    estimated_budget: number | null;
    created_at: string;
    updated_at: string;
    labor_cost: number;
    hardware_cost: number;
    req_total: number;
    req_done: number;
  }[]>(
    `SELECT
       p.*,
       COALESCE((
         SELECT SUM(wl.hours_worked * e.hourly_rate)
         FROM work_logs wl JOIN employees e ON e.id = wl.employee_id
         WHERE wl.project_id = p.id
       ), 0) AS labor_cost,
       COALESCE((
         SELECT SUM(hc.total_price) FROM hardware_costs hc WHERE hc.project_id = p.id
       ), 0) AS hardware_cost,
       COALESCE((SELECT COUNT(*) FROM requirements r WHERE r.project_id = p.id), 0)       AS req_total,
       COALESCE((SELECT COUNT(*) FROM requirements r WHERE r.project_id = p.id AND r.status = 'done'), 0) AS req_done
     FROM projects p
     ORDER BY p.created_at DESC`,
    []
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    client: r.client,
    startDate: r.start_date,
    status: r.status as NewProjectInput["status"],
    estimatedBudget: r.estimated_budget,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    laborCost: r.labor_cost,
    hardwareCost: r.hardware_cost,
    totalCost: r.labor_cost + r.hardware_cost,
    completionPct: r.req_total > 0 ? Math.round((r.req_done / r.req_total) * 100) : 0,
  }));
}

export async function getProjectCosts(id: number) {
  const rows = await getSQLite().select<{ labor_cost: number; hardware_cost: number }[]>(
    `SELECT
       COALESCE((
         SELECT SUM(wl.hours_worked * e.hourly_rate)
         FROM work_logs wl JOIN employees e ON e.id = wl.employee_id
         WHERE wl.project_id = ?
       ), 0) AS labor_cost,
       COALESCE((
         SELECT SUM(hc.total_price) FROM hardware_costs hc WHERE hc.project_id = ?
       ), 0) AS hardware_cost`,
    [id, id]
  );
  const r = rows[0] ?? { labor_cost: 0, hardware_cost: 0 };
  return { laborCost: r.labor_cost, hardwareCost: r.hardware_cost, totalCost: r.labor_cost + r.hardware_cost };
}

// Project-Employee assignments
export async function getProjectEmployees(projectId: number) {
  return getSQLite().select<{
    id: number;
    employee_id: number;
    name: string;
    role: string;
    hourly_rate: number;
    assigned_at: string;
  }[]>(
    `SELECT pe.id, pe.employee_id, e.name, e.role, e.hourly_rate, pe.assigned_at
     FROM project_employees pe JOIN employees e ON e.id = pe.employee_id
     WHERE pe.project_id = ?
     ORDER BY pe.assigned_at`,
    [projectId]
  );
}

export async function assignEmployeeToProject(projectId: number, employeeId: number) {
  return getSQLite().execute(
    `INSERT OR IGNORE INTO project_employees (project_id, employee_id, assigned_at) VALUES (?, ?, ?)`,
    [projectId, employeeId, nowISO()]
  );
}

export async function unassignEmployeeFromProject(projectId: number, employeeId: number) {
  return getSQLite().execute(
    `DELETE FROM project_employees WHERE project_id = ? AND employee_id = ?`,
    [projectId, employeeId]
  );
}
