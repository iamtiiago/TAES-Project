
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Recipe } from "../db/db";
import { calculateMissingIngredients } from "../utils/recipeUtils";

export function useMissingIngredients(recipe: Recipe | null) {
  const result = useLiveQuery(async () => {
    if (!recipe) return [];

    const pantry = await db.pantry.toArray();

    return calculateMissingIngredients(
      recipe.ingredients,
      pantry,
      recipe.servings
    );
  }, [recipe?.id, recipe?.ingredients, recipe?.servings]);

  return {
    missingIngredients: result ?? [],
    loading: result === undefined && recipe !== null,
    isComplete: result !== undefined && result.length === 0,
  };
}
