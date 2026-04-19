import type Database from "@tauri-apps/plugin-sql";

const DDL_STATEMENTS = [
  `PRAGMA foreign_keys = ON`,

  `CREATE TABLE IF NOT EXISTS employees (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    start_date  TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'active',
    hourly_rate REAL    NOT NULL DEFAULT 0,
    role        TEXT    NOT NULL,
    notes       TEXT,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS projects (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT    NOT NULL,
    description      TEXT,
    client           TEXT,
    start_date       TEXT    NOT NULL,
    status           TEXT    NOT NULL DEFAULT 'planning',
    estimated_budget REAL,
    created_at       TEXT    NOT NULL,
    updated_at       TEXT    NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS project_employees (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assigned_at TEXT    NOT NULL,
    UNIQUE(project_id, employee_id)
  )`,

  `CREATE TABLE IF NOT EXISTS requirements (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id           INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title                TEXT    NOT NULL,
    description          TEXT,
    status               TEXT    NOT NULL DEFAULT 'todo',
    assigned_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    progress             INTEGER NOT NULL DEFAULT 0,
    created_at           TEXT    NOT NULL,
    updated_at           TEXT    NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS work_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    date         TEXT    NOT NULL,
    hours_worked REAL    NOT NULL,
    notes        TEXT,
    created_at   TEXT    NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS hardware_costs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_name     TEXT    NOT NULL,
    quantity      INTEGER NOT NULL,
    unit_price    REAL    NOT NULL,
    total_price   REAL    NOT NULL,
    purchase_date TEXT    NOT NULL,
    created_at    TEXT    NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_work_logs_employee ON work_logs(employee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_work_logs_project  ON work_logs(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_work_logs_date     ON work_logs(date)`,
  `CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_hardware_project   ON hardware_costs(project_id)`,
];

export async function runMigrations(db: Database): Promise<void> {
  for (const stmt of DDL_STATEMENTS) {
    await db.execute(stmt, []);
  }
}
