import { getSQLite } from "../db";
import type { DashboardStats, MonthlyCostData } from "../types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const sqlite = getSQLite();

  const [empRows, projRows, costRows, monthRows] = await Promise.all([
    sqlite.select<{ total: number; active: number }[]>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active
       FROM employees`,
      []
    ),
    sqlite.select<{ total: number; active: number }[]>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active
       FROM projects`,
      []
    ),
    sqlite.select<{ labor: number; hardware: number }[]>(
      `SELECT
         COALESCE((SELECT SUM(wl.hours_worked * e.hourly_rate) FROM work_logs wl JOIN employees e ON e.id=wl.employee_id), 0) AS labor,
         COALESCE((SELECT SUM(total_price) FROM hardware_costs), 0) AS hardware`,
      []
    ),
    sqlite.select<{ labor: number; hardware: number }[]>(
      `SELECT
         COALESCE((SELECT SUM(wl.hours_worked * e.hourly_rate) FROM work_logs wl JOIN employees e ON e.id=wl.employee_id WHERE wl.date >= date('now','start of month')), 0) AS labor,
         COALESCE((SELECT SUM(total_price) FROM hardware_costs WHERE purchase_date >= date('now','start of month')), 0) AS hardware`,
      []
    ),
  ]);

  const emp = empRows[0] ?? { total: 0, active: 0 };
  const proj = projRows[0] ?? { total: 0, active: 0 };
  const cost = costRows[0] ?? { labor: 0, hardware: 0 };
  const month = monthRows[0] ?? { labor: 0, hardware: 0 };

  return {
    totalEmployees: emp.total,
    activeEmployees: emp.active,
    totalProjects: proj.total,
    activeProjects: proj.active,
    totalCost: cost.labor + cost.hardware,
    monthlyCost: month.labor + month.hardware,
    monthlyLaborCost: month.labor,
    monthlyHardwareCost: month.hardware,
  };
}

export async function getMonthlyCosts(months = 6): Promise<MonthlyCostData[]> {
  const sqlite = getSQLite();

  const [laborRows, hardwareRows] = await Promise.all([
    sqlite.select<{ month: string; amount: number }[]>(
      `SELECT strftime('%Y-%m', date) AS month, SUM(wl.hours_worked * e.hourly_rate) AS amount
       FROM work_logs wl JOIN employees e ON e.id = wl.employee_id
       WHERE date >= date('now', ?)
       GROUP BY strftime('%Y-%m', date)
       ORDER BY month`,
      [`-${months} months`]
    ),
    sqlite.select<{ month: string; amount: number }[]>(
      `SELECT strftime('%Y-%m', purchase_date) AS month, SUM(total_price) AS amount
       FROM hardware_costs
       WHERE purchase_date >= date('now', ?)
       GROUP BY strftime('%Y-%m', purchase_date)
       ORDER BY month`,
      [`-${months} months`]
    ),
  ]);

  const map = new Map<string, MonthlyCostData>();

  for (const r of laborRows) {
    map.set(r.month, { month: r.month, labor: r.amount, hardware: 0, total: r.amount });
  }
  for (const r of hardwareRows) {
    const existing = map.get(r.month);
    if (existing) {
      existing.hardware = r.amount;
      existing.total = existing.labor + r.amount;
    } else {
      map.set(r.month, { month: r.month, labor: 0, hardware: r.amount, total: r.amount });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export async function getProjectCostChart(): Promise<{ name: string; labor: number; hardware: number; total: number }[]> {
  const rows = await getSQLite().select<{
    project_name: string;
    labor: number;
    hardware: number;
  }[]>(
    `SELECT
       p.name AS project_name,
       COALESCE((SELECT SUM(wl.hours_worked * e.hourly_rate) FROM work_logs wl JOIN employees e ON e.id=wl.employee_id WHERE wl.project_id=p.id), 0) AS labor,
       COALESCE((SELECT SUM(total_price) FROM hardware_costs WHERE project_id=p.id), 0) AS hardware
     FROM projects p
     ORDER BY (labor+hardware) DESC
     LIMIT 8`,
    []
  );

  return rows.map((r) => ({
    name: r.project_name,
    labor: r.labor,
    hardware: r.hardware,
    total: r.labor + r.hardware,
  }));
}

export async function getRecentWorkLogs(limit = 5) {
  return getSQLite().select<{
    id: number;
    date: string;
    hours_worked: number;
    employee_name: string;
    project_name: string;
  }[]>(
    `SELECT wl.id, wl.date, wl.hours_worked, e.name AS employee_name, p.name AS project_name
     FROM work_logs wl
     JOIN employees e ON e.id = wl.employee_id
     JOIN projects p ON p.id = wl.project_id
     ORDER BY wl.date DESC, wl.created_at DESC
     LIMIT ?`,
    [limit]
  );
}
