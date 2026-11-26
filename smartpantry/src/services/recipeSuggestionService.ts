import { db, type SavedRecipe } from "../db/db";
import { getActiveRecipePreferences } from "./recipePreferences";
import { getToday } from "../utils/recipeUtils";
import {
  isRecipeSuggestion,
  isRecord,
  recipeSuggestionPath,
  type RecipeSuggestion,
  type RecipeSuggestionRequest,
} from "../shared/recipeSuggestion";

export type SavedRecipeSuggestion = SavedRecipe & RecipeSuggestion;

export async function requestRecipeSuggestion(signal: AbortSignal): Promise<RecipeSuggestion | null> {
  const today = getToday();
  const pantry = await db.pantry.toArray();
  const ingredients = pantry
    .filter((item) => item.quantity > 0 && (!item.expirationDate || item.expirationDate >= today))
    .map(({ name, quantity, unit, expirationDate }) => ({ name, quantity, unit, expirationDate: expirationDate ?? "" }));

  if (ingredients.length === 0) {
    throw new Error("Adiciona alimentos com stock e dentro da validade para gerar uma sugestão.");
  }

  const { servings, diet, allergies, excludedIngredients } = await getActiveRecipePreferences();
  const request: RecipeSuggestionRequest = {
    ingredients,
    servings,
    diet,
    allergies: allergies.map((allergy) => allergy.trim()).filter(Boolean),
    excludedIngredients: excludedIngredients.map((ingredient) => ingredient.trim()).filter(Boolean),
  };

  const unavailableMessage = "Não foi possível contactar o Sous-Chef. Verifica a ligação e tenta novamente.";
  let response: Response;
  let result: unknown;

  try {
    response = await fetch(recipeSuggestionPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
    result = await response.json();
  } catch {
    throw new Error(unavailableMessage);
  }

  if (!response.ok) {
    throw new Error(isRecord(result) && typeof result.message === "string" ? result.message : unavailableMessage);
  }

  if (result === null || isRecipeSuggestion(result)) return result;
  throw new Error("O Sous-Chef devolveu uma receita inválida. Tenta novamente.");
}

export async function getSavedRecipeSuggestions(): Promise<SavedRecipeSuggestion[]> {
  const recipes = await db.recipeBook.orderBy("title").toArray();
  return recipes.filter((recipe): recipe is SavedRecipeSuggestion => isRecipeSuggestion(recipe));
}

export function saveRecipeSuggestion(suggestion: SavedRecipeSuggestion): Promise<string> {
  if (!isRecipeSuggestion(suggestion)) throw new Error("A sugestão não é válida.");
  return db.recipeBook.put(suggestion);
}
