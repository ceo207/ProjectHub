import { eq } from "drizzle-orm";
import { getDB, getSQLite } from "../db";
import { employees } from "../db/schema";
import { nowISO } from "../lib/utils";
import type { EmployeeWithStats } from "../types";

export type NewEmployeeInput = {
  name: string;
  startDate: string;
  status: "active" | "inactive";
  hourlyRate: number;
  role: string;
  notes?: string;
};

export async function getAllEmployees() {
  return getDB().select().from(employees).all();
}

export async function getEmployeeById(id: number) {
  return getDB().select().from(employees).where(eq(employees.id, id)).get();
}

export async function createEmployee(data: NewEmployeeInput) {
  const now = nowISO();
  const result = await getSQLite().execute(
    `INSERT INTO employees (name, start_date, status, hourly_rate, role, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.startDate, data.status, data.hourlyRate, data.role, data.notes ?? null, now, now]
  );
  return result;
}

export async function updateEmployee(id: number, data: Partial<NewEmployeeInput>) {
  const now = nowISO();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.startDate !== undefined) { fields.push("start_date = ?"); values.push(data.startDate); }
  if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
  if (data.hourlyRate !== undefined) { fields.push("hourly_rate = ?"); values.push(data.hourlyRate); }
  if (data.role !== undefined) { fields.push("role = ?"); values.push(data.role); }
  if (data.notes !== undefined) { fields.push("notes = ?"); values.push(data.notes); }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  await getSQLite().execute(
    `UPDATE employees SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
}

export async function deleteEmployee(id: number) {
  await getSQLite().execute("DELETE FROM employees WHERE id = ?", [id]);
}

export async function getEmployeesWithStats(): Promise<EmployeeWithStats[]> {
  const rows = await getSQLite().select<{
    id: number;
    name: string;
    start_date: string;
    status: string;
    hourly_rate: number;
    role: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    total_hours: number | null;
    total_earnings: number | null;
    project_count: number;
  }[]>(
    `SELECT
       e.*,
       COALESCE(SUM(wl.hours_worked), 0)                     AS total_hours,
       COALESCE(SUM(wl.hours_worked * e.hourly_rate), 0)     AS total_earnings,
       COUNT(DISTINCT pe.project_id)                          AS project_count
     FROM employees e
     LEFT JOIN work_logs wl ON wl.employee_id = e.id
     LEFT JOIN project_employees pe ON pe.employee_id = e.id
     GROUP BY e.id
     ORDER BY e.name`,
    []
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    startDate: r.start_date,
    status: r.status as "active" | "inactive",
    hourlyRate: r.hourly_rate,
    role: r.role,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    totalHours: r.total_hours ?? 0,
    totalEarnings: r.total_earnings ?? 0,
    projectCount: r.project_count,
  }));
}

export async function getEmployeeStats(id: number) {
  const rows = await getSQLite().select<{ total_hours: number; total_earnings: number }[]>(
    `SELECT
       COALESCE(SUM(wl.hours_worked), 0)                     AS total_hours,
       COALESCE(SUM(wl.hours_worked * e.hourly_rate), 0)     AS total_earnings
     FROM work_logs wl
     JOIN employees e ON e.id = wl.employee_id
     WHERE wl.employee_id = ?`,
    [id]
  );
  return rows[0] ?? { total_hours: 0, total_earnings: 0 };
}
