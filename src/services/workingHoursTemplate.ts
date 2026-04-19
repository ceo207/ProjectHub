import { save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { resolveResource } from "@tauri-apps/api/path";

export async function downloadWorkingHoursTemplate() {
  const filePath = await save({
    title: "Save Working Hours Template",
    defaultPath: "Working Hours Sheet.xlsx",
    filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }],
  });

  if (!filePath) return;

  const resourcePath = await resolveResource("resources/working-hours-template.xlsx");
  const fileBytes = await readFile(resourcePath);
  await writeFile(filePath, fileBytes);
}
