import { getSQLite } from "../db";
import { nowISO } from "../lib/utils";

export async function isSeedNeeded(): Promise<boolean> {
  const rows = await getSQLite().select<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM employees",
    []
  );
  return (rows[0]?.count ?? 0) === 0;
}

export async function seedSampleData(): Promise<void> {
  const sqlite = getSQLite();
  const now = nowISO();

  // Employees
  await sqlite.execute(
    `INSERT INTO employees (name, start_date, status, hourly_rate, role, notes, created_at, updated_at) VALUES
     ('Ahmed Al-Sayed',    '2023-01-15', 'active',   45, 'Full-Stack Developer', 'Senior developer, React & Node', ?, ?),
     ('Fatima Hassan',     '2023-03-01', 'active',   38, 'UI/UX Designer',       'Figma & Adobe XD specialist',    ?, ?),
     ('Omar Khalid',       '2022-09-10', 'active',   50, 'Project Manager',      'PMP certified',                  ?, ?),
     ('Sara Mohammed',     '2023-06-20', 'active',   42, 'Backend Developer',    'Python & Django expert',         ?, ?),
     ('Khalid Ibrahim',    '2022-05-01', 'inactive', 35, 'QA Engineer',          'Manual & automation testing',    ?, ?)`,
    [now, now, now, now, now, now, now, now, now, now]
  );

  // Projects
  await sqlite.execute(
    `INSERT INTO projects (name, description, client, start_date, status, estimated_budget, created_at, updated_at) VALUES
     ('E-Commerce Platform',    'Full-stack online store with payment integration', 'RetailCo',      '2024-01-10', 'active',    50000, ?, ?),
     ('Mobile Banking App',     'iOS and Android banking application',              'FinanceBank',   '2024-02-15', 'active',    80000, ?, ?),
     ('HR Management System',   'Internal HR and payroll system',                  'TechCorp',      '2023-11-01', 'completed', 30000, ?, ?),
     ('Analytics Dashboard',    'Real-time business intelligence dashboard',       'DataInsights',  '2024-03-20', 'planning',  25000, ?, ?),
     ('Inventory System',       'Warehouse management and tracking system',        'LogisticsPro',  '2023-09-01', 'on_hold',   20000, ?, ?)`,
    [now, now, now, now, now, now, now, now, now, now]
  );

  // Project-Employee assignments (project IDs 1-5, employee IDs 1-5)
  const assignedAt = now;
  await sqlite.execute(
    `INSERT OR IGNORE INTO project_employees (project_id, employee_id, assigned_at) VALUES
     (1,1,?),(1,2,?),(1,3,?),
     (2,1,?),(2,4,?),(2,3,?),
     (3,3,?),(3,4,?),(3,5,?),
     (4,2,?),(4,4,?),
     (5,1,?),(5,5,?)`,
    Array(13).fill(assignedAt)
  );

  // Requirements
  await sqlite.execute(
    `INSERT INTO requirements (project_id, title, status, assigned_employee_id, progress, created_at, updated_at) VALUES
     (1, 'User Authentication',       'done',        1, 100, ?, ?),
     (1, 'Product Catalog',           'done',        1, 100, ?, ?),
     (1, 'Shopping Cart',             'in_progress', 1,  65, ?, ?),
     (1, 'Payment Gateway',           'todo',        4,   0, ?, ?),
     (2, 'Login & Registration',      'done',        4, 100, ?, ?),
     (2, 'Account Dashboard',         'in_progress', 4,  40, ?, ?),
     (2, 'Transaction History',       'todo',        1,   0, ?, ?),
     (3, 'Employee Records',          'done',        4, 100, ?, ?),
     (3, 'Payroll Processing',        'done',        4, 100, ?, ?),
     (3, 'Leave Management',          'done',        3, 100, ?, ?)`,
    Array(20).fill(now)
  );

  // Work Logs
  await sqlite.execute(
    `INSERT INTO work_logs (employee_id, project_id, date, hours_worked, notes, created_at) VALUES
     (1, 1, '2024-04-01', 8,   'Frontend auth pages',        ?),
     (1, 1, '2024-04-02', 7.5, 'Product listing UI',         ?),
     (2, 1, '2024-04-01', 6,   'Design system setup',        ?),
     (3, 1, '2024-04-03', 4,   'Sprint planning',            ?),
     (1, 2, '2024-04-04', 8,   'API integration',            ?),
     (4, 2, '2024-04-01', 8,   'Database schema',            ?),
     (4, 2, '2024-04-02', 7,   'REST endpoints',             ?),
     (3, 2, '2024-04-05', 3,   'Client meeting',             ?),
     (4, 3, '2024-03-15', 8,   'Employee CRUD',              ?),
     (4, 3, '2024-03-16', 8,   'Payroll logic',              ?),
     (3, 3, '2024-03-10', 5,   'Requirements gathering',     ?),
     (5, 3, '2024-03-20', 8,   'Testing payroll module',     ?)`,
    Array(12).fill(now)
  );

  // Hardware Costs
  await sqlite.execute(
    `INSERT INTO hardware_costs (project_id, item_name, quantity, unit_price, total_price, purchase_date, created_at) VALUES
     (1, 'Web Server License',    1,  1200, 1200, '2024-01-15', ?),
     (1, 'SSL Certificate',       2,   150,  300, '2024-01-20', ?),
     (2, 'Cloud Server (Annual)', 2,  2400, 4800, '2024-02-20', ?),
     (2, 'Mobile Testing Devices',3,   350, 1050, '2024-03-01', ?),
     (3, 'Development Workstation',1, 1800, 1800, '2023-11-10', ?),
     (3, 'Backup Storage',        1,   400,  400, '2023-11-15', ?)`,
    Array(6).fill(now)
  );
}
