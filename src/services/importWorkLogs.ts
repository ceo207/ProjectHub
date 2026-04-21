import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import * as XLSX from "xlsx";
import { createWorkLog } from "./workLogs";
import type { Employee, Project } from "../types";

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export async function importWorkLogsFromExcel(
  employees: Employee[],
  projects: Project[]
): Promise<ImportResult | null> {
  // 1. Open file picker
  const filePath = await open({
    title: "Select Timesheet File",
    filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }],
    multiple: false,
  });

  if (!filePath) return null;

  // 2. Read raw bytes via Tauri FS
  const bytes = await readFile(filePath as string);

  // 3. Parse workbook
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true });
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];

  // 4. Extract header cells
  const employeeName = cellStr(sheet, "J6");
  const projectName  = cellStr(sheet, "J5");

  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  if (!employeeName) {
    result.errors.push("Cell J6 (Employee Name) is empty.");
    return result;
  }
  if (!projectName) {
    result.errors.push("Cell J5 (Project Name) is empty.");
    return result;
  }

  // 5. Match employee & project by name (case-insensitive)
  const employee = employees.find(
    (e) => e.name.trim().toLowerCase() === employeeName.trim().toLowerCase()
  );
  const project = projects.find(
    (p) => p.name.trim().toLowerCase() === projectName.trim().toLowerCase()
  );

  if (!employee) {
    result.errors.push(`Employee "${employeeName}" not found in the system.`);
    return result;
  }
  if (!project) {
    result.errors.push(`Project "${projectName}" not found in the system.`);
    return result;
  }

  // 6. Walk rows starting at row 3
  let row = 3;
  while (true) {
    const dateCell  = sheet[`B${row}`];
    const hoursCell = sheet[`G${row}`];

    // Stop when both date and hours are empty
    if (!dateCell && !hoursCell) break;

    const hours = hoursCell ? Math.round(Number(hoursCell.v) * 10) / 10 : 0;

    // Skip rows with 0 hours or non-numeric hours
    if (!hours || isNaN(hours) || hours === 0) {
      result.skipped++;
      row++;
      continue;
    }

    // Parse date
    let dateStr = "";
    if (dateCell) {
      if (dateCell.t === "d" || dateCell.v instanceof Date) {
        dateStr = formatDate(new Date(dateCell.v));
      } else if (typeof dateCell.v === "number") {
        // Excel serial date
        dateStr = formatDate(XLSX.SSF.parse_date_code(dateCell.v));
      } else {
        dateStr = String(dateCell.v).trim();
      }
    }

    if (!dateStr) {
      result.skipped++;
      row++;
      continue;
    }

    const notes = sheet[`D${row}`] ? String(sheet[`D${row}`].v).trim() : undefined;

    try {
      await createWorkLog({
        employeeId:  employee.id,
        projectId:   project.id,
        date:        dateStr,
        hoursWorked: hours,
        notes:       notes || undefined,
      });
      result.imported++;
    } catch (e) {
      result.errors.push(`Row ${row}: ${String(e)}`);
    }

    row++;
  }

  return result;
}

function cellStr(sheet: XLSX.WorkSheet, addr: string): string {
  const cell = sheet[addr];
  return cell ? String(cell.v).trim() : "";
}

function formatDate(d: Date | { y: number; m: number; d: number }): string {
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  // XLSX parsed date object
  const y = d.y;
  const m = String(d.m).padStart(2, "0");
  const day = String(d.d).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
