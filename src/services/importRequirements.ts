import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import * as XLSX from "xlsx";
import { createRequirement } from "./requirements";

export type ImportReqResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

function cellStr(sheet: XLSX.WorkSheet, r: number, c: number): string {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = sheet[addr];
  if (!cell || cell.v === null || cell.v === undefined) return "";
  return String(cell.v).trim();
}

function cellNum(sheet: XLSX.WorkSheet, r: number, c: number): number {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = sheet[addr];
  if (!cell || cell.v === null || cell.v === undefined) return NaN;
  return Number(cell.v);
}

export async function importRequirementsFromExcel(
  projectId: number,
  teamMembers: { employee_id: number; name: string }[]
): Promise<ImportReqResult | null> {
  const filePath = await open({
    title: "Select Requirements File",
    filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }],
    multiple: false,
  });

  if (!filePath) return null;

  const bytes = await readFile(filePath as string);
  const workbook = XLSX.read(bytes, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const ref = sheet["!ref"];
  if (!ref) return { imported: 0, skipped: 0, errors: ["The file appears to be empty."] };

  const range = XLSX.utils.decode_range(ref);
  const result: ImportReqResult = { imported: 0, skipped: 0, errors: [] };

  // Rows 0 = headers, 1 = hints — data starts at row index 2
  for (let r = 2; r <= range.e.r; r++) {
    const section      = cellStr(sheet, r, 0);
    const title        = cellStr(sheet, r, 1);
    const description  = cellStr(sheet, r, 2);
    const statusRaw    = cellStr(sheet, r, 3).toLowerCase().replace(/-/g, "_");
    const progressRaw  = cellNum(sheet, r, 4);
    const employeeName = cellStr(sheet, r, 5);

    if (!title) { result.skipped++; continue; }

    const statusMap: Record<string, "todo" | "in_progress" | "done"> = {
      "to do":       "todo",
      "todo":        "todo",
      "in progress": "in_progress",
      "in_progress": "in_progress",
      "done":        "done",
    };
    const status = statusMap[statusRaw] ?? "todo";
    const progress = isNaN(progressRaw) ? 0 : Math.min(100, Math.max(0, Math.round(progressRaw)));

    let assignedEmployeeId: number | null = null;
    if (employeeName) {
      const match = teamMembers.find(
        (m) => m.name.trim().toLowerCase() === employeeName.toLowerCase()
      );
      if (!match) {
        result.errors.push(`Row ${r + 1}: Employee "${employeeName}" not found in project team.`);
      } else {
        assignedEmployeeId = match.employee_id;
      }
    }

    try {
      await createRequirement({
        projectId,
        title,
        description: description || undefined,
        status,
        progress,
        section: section || null,
        assignedEmployeeId,
      });
      result.imported++;
    } catch (e) {
      result.errors.push(`Row ${r + 1}: ${String(e)}`);
    }
  }

  return result;
}
