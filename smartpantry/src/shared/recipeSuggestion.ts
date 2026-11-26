export const recipeSuggestionPath = "/api/recipe-suggestion";

export interface RecipeSuggestion {
  title: string;
  servings: number;
  estimatedMinutes: number;
  ingredients: { name: string; quantity: string }[];
  steps: string[];
}

export interface RecipeSuggestionRequest {
  ingredients: { name: string; quantity: number; unit: string; expirationDate: string }[];
  servings: number;
  diet: "omnivore" | "vegetarian" | "vegan";
  allergies: string[];
  excludedIngredients: string[];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(hasText);
}

export function isRecipeSuggestion(value: unknown): value is RecipeSuggestion {
  return isRecord(value) && hasText(value.title) && isPositiveInteger(value.servings) &&
    isPositiveInteger(value.estimatedMinutes) && Array.isArray(value.ingredients) &&
    value.ingredients.length > 0 && value.ingredients.every((ingredient) =>
      isRecord(ingredient) && hasText(ingredient.name) && hasText(ingredient.quantity)
    ) && isTextList(value.steps) && value.steps.length > 0;
}

export function isRecipeSuggestionRequest(value: unknown): value is RecipeSuggestionRequest {
  return isRecord(value) && isPositiveInteger(value.servings) &&
    (value.diet === "omnivore" || value.diet === "vegetarian" || value.diet === "vegan") &&
    isTextList(value.allergies) && isTextList(value.excludedIngredients) &&
    Array.isArray(value.ingredients) && value.ingredients.every((ingredient) =>
      isRecord(ingredient) && hasText(ingredient.name) && hasText(ingredient.unit) &&
      typeof ingredient.quantity === "number" && Number.isFinite(ingredient.quantity) &&
      ingredient.quantity > 0 && typeof ingredient.expirationDate === "string" &&
      (ingredient.expirationDate === "" || /^\d{4}-\d{2}-\d{2}$/.test(ingredient.expirationDate))
    );
}
