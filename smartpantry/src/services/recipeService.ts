
import { db, type Recipe } from "../db/db";
import { initialRecipes } from "../data/recipes";

export type NewRecipe = Omit<Recipe, "id">;

export async function initializeRecipes(): Promise<void> {
  const count = await db.recipes.count();

  if (count === 0) {
    await db.recipes.bulkAdd(initialRecipes);
  }
}

export async function getRecipes(): Promise<Recipe[]> {
  return db.recipes.orderBy("name").toArray();
}

export async function addRecipe(recipe: NewRecipe): Promise<number> {
  validateRecipe(recipe);
  return db.recipes.add(recipe);
}

export async function deleteRecipe(id: number): Promise<void> {
  await db.recipes.delete(id);
}

function validateRecipe(recipe: NewRecipe): void {
  if (!recipe.name.trim()) {
    throw new Error("O nome da receita é obrigatório.");
  }

  if (!Number.isFinite(recipe.preparationTime) || recipe.preparationTime <= 0) {
    throw new Error("O tempo de preparação tem de ser superior a zero.");
  }

  if (!Number.isInteger(recipe.servings) || recipe.servings < 1) {
    throw new Error("O número de porções tem de ser igual ou superior a 1.");
  }

  if (recipe.ingredients.length === 0) {
    throw new Error("Adiciona pelo menos um ingrediente.");
  }

  for (const ingredient of recipe.ingredients) {
    if (!ingredient.name.trim()) {
      throw new Error("Todos os ingredientes precisam de ter um nome.");
    }

    if (!Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0) {
      throw new Error("As quantidades têm de ser superiores a zero.");
    }

    if (!ingredient.unit.trim()) {
      throw new Error("Todos os ingredientes precisam de uma unidade.");
    }
  }

  if (!recipe.instructions.some((instruction) => instruction.trim())) {
    throw new Error("Adiciona pelo menos uma instrução.");
  }
}

export async function removeDuplicateRecipes(): Promise<void> {
  const recipes = await db.recipes.toArray();

  const seen = new Set<string>();
  const idsToDelete: number[] = [];

  for (const recipe of recipes) {
    const normalizedName = recipe.name.trim().toLowerCase();

    if (seen.has(normalizedName)) {
      if (recipe.id !== undefined) {
        idsToDelete.push(recipe.id);
      }
    } else {
      seen.add(normalizedName);
    }
  }

  await db.recipes.bulkDelete(idsToDelete);
}
