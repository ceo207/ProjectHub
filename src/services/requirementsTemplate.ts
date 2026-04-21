import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import ExcelJS from "exceljs";

// ─── Style tokens ────────────────────────────────────────────────────────────

const BORDER_THIN  = { style: "thin"   as const, color: { argb: "FFCBD5E1" } };
const BORDER_OUTER = { style: "medium" as const, color: { argb: "FF1E293B" } };

const FONT_HEADER = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
const FONT_DATA   = { name: "Arial", size: 11, color: { argb: "FF111827" } };

const FILL = (argb: string) =>
  ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });

const FILL_REQUIRED = FILL("FFD97706"); // amber-600
const FILL_OPTIONAL = FILL("FF475569"); // slate-600
const FILL_WHITE    = FILL("FFFFFFFF");
const FILL_ALT      = FILL("FFF8FAFC");

const ALIGN_HEADER = { horizontal: "center" as const, vertical: "middle" as const, wrapText: true };
const ALIGN_DATA   = { horizontal: "center" as const, vertical: "middle" as const };

type OuterSides = { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };

function border(outer: OuterSides) {
  return {
    top:    outer.top    ? BORDER_OUTER : BORDER_THIN,
    right:  outer.right  ? BORDER_OUTER : BORDER_THIN,
    bottom: outer.bottom ? BORDER_OUTER : BORDER_THIN,
    left:   outer.left   ? BORDER_OUTER : BORDER_THIN,
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function downloadRequirementsTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Requirements");

  const DATA_ROWS      = 50;
  const HEADER_ROW     = 2;              // Excel row 2 (row 1 is an empty spacer)
  const FIRST_DATA_ROW = 3;
  const LAST_DATA_ROW  = 2 + DATA_ROWS;  // Excel row 52
  const LAST_COL       = 6;

  // ── Column widths ─────────────────────────────────────────────────────────
  ws.columns = [
    { width: 22 }, // A: Section
    { width: 28 }, // B: Title
    { width: 42 }, // C: Description
    { width: 16 }, // D: Status
    { width: 18 }, // E: Progress
    { width: 28 }, // F: Assigned Employee
  ];

  // ── Row 2: headers ────────────────────────────────────────────────────────
  const headers: { text: string; required: boolean }[] = [
    { text: "Section",           required: true  },
    { text: "Title",             required: true  },
    { text: "Description",       required: false },
    { text: "Status",            required: true  },
    { text: "Progress (%)",      required: false },
    { text: "Assigned Employee", required: false },
  ];

  ws.getRow(HEADER_ROW).height = 36;
  headers.forEach((h, i) => {
    const col = i + 1;
    const cell = ws.getCell(HEADER_ROW, col);
    cell.value = h.text;
    cell.font = FONT_HEADER;
    cell.fill = h.required ? FILL_REQUIRED : FILL_OPTIONAL;
    cell.alignment = ALIGN_HEADER;
    cell.border = border({
      top:    true,
      bottom: true,
      left:   col === 1,
      right:  col === LAST_COL,
    });
  });

  // ── Rows 3–52: data rows ──────────────────────────────────────────────────
  for (let r = FIRST_DATA_ROW; r <= LAST_DATA_ROW; r++) {
    ws.getRow(r).height = 22;
    const alt    = r % 2 === 0;
    const isLast = r === LAST_DATA_ROW;

    for (let c = 1; c <= LAST_COL; c++) {
      const cell = ws.getCell(r, c);
      cell.value = "";
      cell.font = FONT_DATA;
      cell.fill = alt ? FILL_ALT : FILL_WHITE;
      cell.alignment = ALIGN_DATA;
      cell.border = border({
        bottom: isLast,
        left:   c === 1,
        right:  c === LAST_COL,
      });
    }

    // Status dropdown (column D)
    ws.getCell(r, 4).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"To Do,In Progress,Done"'],
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid Status",
      error: 'Please select one of: "To Do", "In Progress", or "Done".',
    };

    // Progress whole number 0–100 (column E)
    ws.getCell(r, 5).dataValidation = {
      type: "whole",
      operator: "between",
      allowBlank: true,
      formulae: [0, 100],
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid Progress",
      error: "Progress must be a whole number between 0 and 100.",
    };
  }

  // ── Freeze first 2 rows (empty + headers) ─────────────────────────────────
  ws.views = [{ state: "frozen", ySplit: 2, topLeftCell: "A3", activeCell: "A3" }];

  // ── Write & save ──────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();

  const filePath = await save({
    title: "Save Requirements Template",
    defaultPath: "Requirements_Template.xlsx",
    filters: [{ name: "Excel", extensions: ["xlsx"] }],
  });

  if (!filePath) return;
  await writeFile(filePath as string, new Uint8Array(buffer));
}
