export type EmployeeStatus = "active" | "inactive";
export type ProjectStatus = "planning" | "active" | "completed" | "on_hold";
export type RequirementStatus = "todo" | "in_progress" | "done";

export interface Employee {
  id: number;
  name: string;
  startDate: string;
  status: EmployeeStatus;
  hourlyRate: number;
  role: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  client?: string | null;
  startDate: string;
  status: ProjectStatus;
  estimatedBudget?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectEmployee {
  id: number;
  projectId: number;
  employeeId: number;
  assignedAt: string;
}

export interface Requirement {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  status: RequirementStatus;
  assignedEmployeeId?: number | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkLog {
  id: number;
  employeeId: number;
  projectId: number;
  date: string;
  hoursWorked: number;
  notes?: string | null;
  createdAt: string;
}

export interface HardwareCost {
  id: number;
  projectId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  purchaseDate: string;
  createdAt: string;
}

export interface ProjectCosts {
  laborCost: number;
  hardwareCost: number;
  totalCost: number;
}

export interface ProjectWithCosts extends Project {
  laborCost: number;
  hardwareCost: number;
  totalCost: number;
  completionPct: number;
}

export interface EmployeeWithStats extends Employee {
  totalHours: number;
  totalEarnings: number;
  projectCount: number;
}

export interface WorkLogWithNames extends WorkLog {
  employeeName: string;
  projectName: string;
  hourlyRate: number;
  earning: number;
}

export interface HardwareCostWithProject extends HardwareCost {
  projectName: string;
}

export interface RequirementWithEmployee extends Requirement {
  employeeName?: string | null;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalProjects: number;
  activeProjects: number;
  totalCost: number;
  monthlyCost: number;
}

export interface MonthlyCostData {
  month: string;
  labor: number;
  hardware: number;
  total: number;
}
