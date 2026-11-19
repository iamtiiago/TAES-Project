
import type { Recipe, PantryItem } from "../db/db";

export type RecipeTimeFilter = "all" | "15" | "30" | "45" | "60";

export interface RecipeFilters {
  search: string;
  maxTime: RecipeTimeFilter;
  mealType: string;
}

export function filterRecipes(
  recipes: Recipe[],
  filters: RecipeFilters
): Recipe[] {
  return recipes.filter((recipe) => {
    const search = filters.search.trim().toLocaleLowerCase("pt-PT");

    const matchesSearch =
      recipe.name.toLocaleLowerCase("pt-PT").includes(search) ||
      recipe.description.toLocaleLowerCase("pt-PT").includes(search);

    const matchesTime =
      filters.maxTime === "all" ||
      recipe.preparationTime <= Number(filters.maxTime);

    const matchesMeal =
      filters.mealType === "all" ||
      recipe.mealType === filters.mealType;

    return matchesSearch && matchesTime && matchesMeal;
  });
}

export function normalizeIngredientName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .trim()
    .replace(/\s+/g, " ");
}

export function toBaseQuantity(
  quantity: number,
  unit: string
): { quantity: number; unit: string } | null {
  switch (unit.toLowerCase()) {
    case "kg":
      return { quantity: quantity * 1000, unit: "g" };

    case "g":
      return { quantity, unit: "g" };

    case "l":
      return { quantity: quantity * 1000, unit: "ml" };

    case "ml":
      return { quantity, unit: "ml" };

    case "un":
      return { quantity, unit: "un" };

    default:
      return null;
  }
}

export interface MissingIngredient {
  name: string;
  required: number;
  available: number;
  missing: number;
  unit: string;
  reason: "missing" | "insufficient" | "incompatible";
}

export function calculateMissingIngredients(
  ingredients: Recipe["ingredients"],
  pantry: PantryItem[],
  servings: number
): MissingIngredient[] {
  const missingIngredients: MissingIngredient[] = [];

  for (const ingredient of ingredients) {
    const requiredQuantity =
      ingredient.quantity * (servings > 0 ? 1 : 1);

    const normalizedName = normalizeIngredientName(ingredient.name);

    const matchingItems = pantry.filter(
      (item) =>
        normalizeIngredientName(item.name) === normalizedName &&
        (!item.expirationDate || item.expirationDate >= getToday())
    );

    if (matchingItems.length === 0) {
      missingIngredients.push({
        name: ingredient.name,
        required: requiredQuantity,
        available: 0,
        missing: requiredQuantity,
        unit: ingredient.unit,
        reason: "missing",
      });
      continue;
    }

    const required = toBaseQuantity(requiredQuantity, ingredient.unit);

    if (!required) {
      missingIngredients.push({
        name: ingredient.name,
        required: requiredQuantity,
        available: 0,
        missing: requiredQuantity,
        unit: ingredient.unit,
        reason: "incompatible",
      });
      continue;
    }

    let available = 0;
    let hasCompatibleItem = false;

    for (const item of matchingItems) {
      const converted = toBaseQuantity(item.quantity, item.unit);

      if (converted && converted.unit === required.unit) {
        available += converted.quantity;
        hasCompatibleItem = true;
      }
    }

    if (!hasCompatibleItem) {
      missingIngredients.push({
        name: ingredient.name,
        required: required.quantity,
        available: 0,
        missing: required.quantity,
        unit: required.unit,
        reason: "incompatible",
      });
      continue;
    }

    if (available < required.quantity) {
      missingIngredients.push({
        name: ingredient.name,
        required: required.quantity,
        available,
        missing: required.quantity - available,
        unit: required.unit,
        reason: "insufficient",
      });
    }
  }

  return missingIngredients;
}

function getToday(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
