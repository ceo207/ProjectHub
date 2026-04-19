import { getSQLite } from "../db";
import { nowISO } from "../lib/utils";
import type { HardwareCostWithProject } from "../types";

export type NewHardwareCostInput = {
  projectId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  purchaseDate: string;
};

export async function getAllHardwareCosts(): Promise<HardwareCostWithProject[]> {
  const rows = await getSQLite().select<{
    id: number;
    project_id: number;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    purchase_date: string;
    created_at: string;
    project_name: string;
  }[]>(
    `SELECT hc.*, p.name AS project_name
     FROM hardware_costs hc
     JOIN projects p ON p.id = hc.project_id
     ORDER BY hc.purchase_date DESC, hc.created_at DESC`,
    []
  );

  return rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    itemName: r.item_name,
    quantity: r.quantity,
    unitPrice: r.unit_price,
    totalPrice: r.total_price,
    purchaseDate: r.purchase_date,
    createdAt: r.created_at,
    projectName: r.project_name,
  }));
}

export async function getHardwareCostsByProject(projectId: number): Promise<HardwareCostWithProject[]> {
  const rows = await getSQLite().select<{
    id: number;
    project_id: number;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    purchase_date: string;
    created_at: string;
    project_name: string;
  }[]>(
    `SELECT hc.*, p.name AS project_name
     FROM hardware_costs hc
     JOIN projects p ON p.id = hc.project_id
     WHERE hc.project_id = ?
     ORDER BY hc.purchase_date DESC`,
    [projectId]
  );

  return rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    itemName: r.item_name,
    quantity: r.quantity,
    unitPrice: r.unit_price,
    totalPrice: r.total_price,
    purchaseDate: r.purchase_date,
    createdAt: r.created_at,
    projectName: r.project_name,
  }));
}

export async function createHardwareCost(data: NewHardwareCostInput) {
  const now = nowISO();
  const totalPrice = data.quantity * data.unitPrice;
  return getSQLite().execute(
    `INSERT INTO hardware_costs (project_id, item_name, quantity, unit_price, total_price, purchase_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.projectId, data.itemName, data.quantity, data.unitPrice, totalPrice, data.purchaseDate, now]
  );
}

export async function updateHardwareCost(id: number, data: Partial<NewHardwareCostInput>) {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.projectId !== undefined) { fields.push("project_id = ?"); values.push(data.projectId); }
  if (data.itemName !== undefined) { fields.push("item_name = ?"); values.push(data.itemName); }
  if (data.quantity !== undefined) { fields.push("quantity = ?"); values.push(data.quantity); }
  if (data.unitPrice !== undefined) { fields.push("unit_price = ?"); values.push(data.unitPrice); }
  if (data.quantity !== undefined || data.unitPrice !== undefined) {
    const existingRows = await getSQLite().select<{ quantity: number; unit_price: number }[]>(
      "SELECT quantity, unit_price FROM hardware_costs WHERE id = ?", [id]
    );
    const existing = existingRows[0];
    if (existing) {
      const q = data.quantity ?? existing.quantity;
      const u = data.unitPrice ?? existing.unit_price;
      fields.push("total_price = ?");
      values.push(q * u);
    }
  }
  if (data.purchaseDate !== undefined) { fields.push("purchase_date = ?"); values.push(data.purchaseDate); }

  values.push(id);
  await getSQLite().execute(`UPDATE hardware_costs SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteHardwareCost(id: number) {
  await getSQLite().execute("DELETE FROM hardware_costs WHERE id = ?", [id]);
}
