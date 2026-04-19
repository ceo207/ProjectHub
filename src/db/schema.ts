import {
  sqliteTable,
  integer,
  text,
  real,
} from "drizzle-orm/sqlite-core";

export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  status: text("status").notNull().default("active"),
  hourlyRate: real("hourly_rate").notNull().default(0),
  role: text("role").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  client: text("client"),
  startDate: text("start_date").notNull(),
  status: text("status").notNull().default("planning"),
  estimatedBudget: real("estimated_budget"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const projectEmployees = sqliteTable("project_employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  assignedAt: text("assigned_at").notNull(),
});

export const requirements = sqliteTable("requirements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),
  assignedEmployeeId: integer("assigned_employee_id").references(
    () => employees.id,
    { onDelete: "set null" }
  ),
  progress: integer("progress").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const workLogs = sqliteTable("work_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  hoursWorked: real("hours_worked").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const hardwareCosts = sqliteTable("hardware_costs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
  purchaseDate: text("purchase_date").notNull(),
  createdAt: text("created_at").notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectEmployee = typeof projectEmployees.$inferSelect;
export type NewProjectEmployee = typeof projectEmployees.$inferInsert;
export type Requirement = typeof requirements.$inferSelect;
export type NewRequirement = typeof requirements.$inferInsert;
export type WorkLog = typeof workLogs.$inferSelect;
export type NewWorkLog = typeof workLogs.$inferInsert;
export type HardwareCost = typeof hardwareCosts.$inferSelect;
export type NewHardwareCost = typeof hardwareCosts.$inferInsert;
