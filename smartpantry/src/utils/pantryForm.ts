import type { PantryItem } from "../db/db.ts";

export const CUSTOM_CATEGORY = "__custom__";
export const pantryUnits = ["un", "g", "kg", "ml", "L"];

type PantryFormResult = { food: Omit<PantryItem, "id"> } | { error: string };

export function parsePantryForm(data: FormData, availableCategories: readonly string[]): PantryFormResult {
  const name = String(data.get("name") ?? "").trim();
  const selectedCategory = String(data.get("category") ?? "");
  const category = selectedCategory === CUSTOM_CATEGORY
    ? String(data.get("customCategory") ?? "").trim()
    : selectedCategory;
  const quantity = Number(data.get("quantity"));
  const unit = String(data.get("unit") ?? "");
  const expirationDate = String(data.get("expirationDate") ?? "");

  if (!name) return { error: "Indica o nome do alimento." };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "A quantidade tem de ser superior a zero." };
  }

  const validCategory = selectedCategory === CUSTOM_CATEGORY
    ? category.length > 0
    : availableCategories.includes(category);
  if (!validCategory || !pantryUnits.includes(unit) || !expirationDate) {
    return { error: "Preenche todos os campos." };
  }

  return { food: { name, category, quantity, unit, expirationDate } };
}
