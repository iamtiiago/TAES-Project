import type { HouseholdProfile, MealType, PantryItem, RecipeIngredient } from "../db/db";

export interface GeneratedRecipe {
  name: string;
  description: string;
  preparationTime: number;
  mealType: MealType;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
}

interface RecipeSuggestionRequest {
  ingredients: PantryItem[];
  profile: Pick<
    HouseholdProfile,
    "servings" | "diet" | "allergies" | "excludedIngredients"
  >;
}

const mealTypes: MealType[] = [
  "Pequeno-almoço",
  "Almoço",
  "Jantar",
  "Lanche",
  "Sobremesa",
];

function isRecipeIngredient(value: unknown): value is RecipeIngredient {
  if (!value || typeof value !== "object") return false;

  const ingredient = value as Record<string, unknown>;
  return (
    typeof ingredient.name === "string" &&
    ingredient.name.trim().length > 0 &&
    typeof ingredient.quantity === "number" &&
    Number.isFinite(ingredient.quantity) &&
    ingredient.quantity > 0 &&
    typeof ingredient.unit === "string" &&
    ingredient.unit.trim().length > 0
  );
}

function isGeneratedRecipe(value: unknown): value is GeneratedRecipe {
  if (!value || typeof value !== "object") return false;

  const recipe = value as Record<string, unknown>;
  return (
    typeof recipe.name === "string" &&
    recipe.name.trim().length > 0 &&
    typeof recipe.description === "string" &&
    Number.isFinite(recipe.preparationTime) &&
    Number(recipe.preparationTime) > 0 &&
    typeof recipe.mealType === "string" &&
    mealTypes.includes(recipe.mealType as MealType) &&
    Number.isInteger(recipe.servings) &&
    Number(recipe.servings) > 0 &&
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.length > 0 &&
    recipe.ingredients.every(isRecipeIngredient) &&
    Array.isArray(recipe.instructions) &&
    recipe.instructions.some(
      (instruction) => typeof instruction === "string" && instruction.trim().length > 0
    )
  );
}

export async function requestRecipeSuggestion(
  request: RecipeSuggestionRequest
): Promise<GeneratedRecipe> {
  const response = await fetch("/api/recipe-suggestion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : "Não foi possível obter uma sugestão da IA.";
    throw new Error(message);
  }

  if (!isGeneratedRecipe(body)) {
    throw new Error("A resposta da IA não tem o formato esperado. Tenta novamente.");
  }

  return body;
}
