import { getSQLite } from "../db";
import { nowISO } from "../lib/utils";
import type { WorkLogWithNames } from "../types";

export type NewWorkLogInput = {
  employeeId: number;
  projectId: number;
  date: string;
  hoursWorked: number;
  notes?: string;
};

export async function getAllWorkLogs(): Promise<WorkLogWithNames[]> {
  const rows = await getSQLite().select<{
    id: number;
    employee_id: number;
    project_id: number;
    date: string;
    hours_worked: number;
    notes: string | null;
    created_at: string;
    employee_name: string;
    project_name: string;
  }[]>(
    `SELECT wl.*, e.name AS employee_name, p.name AS project_name
     FROM work_logs wl
     JOIN employees e ON e.id = wl.employee_id
     JOIN projects p ON p.id = wl.project_id
     ORDER BY wl.date DESC, wl.created_at DESC`,
    []
  );

  return rows.map((r) => ({
    id: r.id,
    employeeId: r.employee_id,
    projectId: r.project_id,
    date: r.date,
    hoursWorked: r.hours_worked,
    notes: r.notes,
    createdAt: r.created_at,
    employeeName: r.employee_name,
    projectName: r.project_name,
  }));
}

export async function getWorkLogsByProject(projectId: number): Promise<WorkLogWithNames[]> {
  const rows = await getSQLite().select<{
    id: number;
    employee_id: number;
    project_id: number;
    date: string;
    hours_worked: number;
    notes: string | null;
    created_at: string;
    employee_name: string;
    project_name: string;
  }[]>(
    `SELECT wl.*, e.name AS employee_name, p.name AS project_name
     FROM work_logs wl
     JOIN employees e ON e.id = wl.employee_id
     JOIN projects p ON p.id = wl.project_id
     WHERE wl.project_id = ?
     ORDER BY wl.date DESC`,
    [projectId]
  );

  return rows.map((r) => ({
    id: r.id,
    employeeId: r.employee_id,
    projectId: r.project_id,
    date: r.date,
    hoursWorked: r.hours_worked,
    notes: r.notes,
    createdAt: r.created_at,
    employeeName: r.employee_name,
    projectName: r.project_name,
  }));
}

export async function createWorkLog(data: NewWorkLogInput) {
  const now = nowISO();
  return getSQLite().execute(
    `INSERT INTO work_logs (employee_id, project_id, date, hours_worked, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.employeeId, data.projectId, data.date, data.hoursWorked, data.notes ?? null, now]
  );
}

export async function updateWorkLog(id: number, data: Partial<NewWorkLogInput>) {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.employeeId !== undefined) { fields.push("employee_id = ?"); values.push(data.employeeId); }
  if (data.projectId !== undefined) { fields.push("project_id = ?"); values.push(data.projectId); }
  if (data.date !== undefined) { fields.push("date = ?"); values.push(data.date); }
  if (data.hoursWorked !== undefined) { fields.push("hours_worked = ?"); values.push(data.hoursWorked); }
  if (data.notes !== undefined) { fields.push("notes = ?"); values.push(data.notes); }

  values.push(id);
  await getSQLite().execute(`UPDATE work_logs SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteWorkLog(id: number) {
  await getSQLite().execute("DELETE FROM work_logs WHERE id = ?", [id]);
}
