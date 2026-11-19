import { db, type Recipe, type RecipeIngredient, type PantryItem } from "../db/db";
import { initialRecipes } from "../data/recipes";
import {
  normalizeIngredientName,
  toBaseQuantity,
} from "../utils/recipeUtils";

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

/**
 * Desconta os ingredientes utilizados na confeção.
 *
 * - Converte unidades para unidades base (kg -> g, L -> ml).
 * - Suporta vários registos do mesmo ingrediente.
 * - Utiliza primeiro os alimentos com validade mais próxima.
 * - Não utiliza alimentos expirados.
 * - Verifica todo o stock antes de efetuar alterações.
 * - Executa todas as alterações numa única transação.
 *
 * Devolve os nomes dos ingredientes cujo stock total chegou a zero.
 */
export async function consumeRecipeIngredients(
  ingredients: RecipeIngredient[]
): Promise<string[]> {
  return db.transaction("rw", db.pantry, async () => {
    const pantry = await db.pantry.toArray();

    const today = getToday();

    const groups = new Map<
      string,
      {
        name: string;
        normalizedName: string;
        unit: string;
        required: number;
      }
    >();

    // Agrupar ingredientes repetidos e converter quantidades.
    for (const ingredient of ingredients) {
      if (
        !Number.isFinite(ingredient.quantity) ||
        ingredient.quantity < 0 ||
        !ingredient.unit.trim() ||
        !ingredient.name.trim()
      ) {
        throw new Error("Existem quantidades ou ingredientes inválidos.");
      }

      if (ingredient.quantity === 0) {
        continue;
      }

      const normalizedName = normalizeIngredientName(ingredient.name);
      const converted = toBaseQuantity(
        ingredient.quantity,
        ingredient.unit
      );

      if (!converted) {
        throw new Error(
          `Não é possível converter a unidade de ${ingredient.name}.`
        );
      }

      const key = `${normalizedName}|${converted.unit}`;
      const existing = groups.get(key);

      if (existing) {
        existing.required += converted.quantity;
      } else {
        groups.set(key, {
          name: ingredient.name,
          normalizedName,
          unit: converted.unit,
          required: converted.quantity,
        });
      }
    }

    if (groups.size === 0) {
      throw new Error("Indica pelo menos uma quantidade para descontar.");
    }

    // Guardar alterações temporariamente antes de atualizar a despensa.
    const updates = new Map<number, PantryItem>();
    const exhaustedIngredients: string[] = [];

    for (const group of groups.values()) {
      const matchingItems = pantry.filter(
        (item) =>
          normalizeIngredientName(item.name) === group.normalizedName &&
          (!item.expirationDate || item.expirationDate >= today)
      );

      if (matchingItems.length === 0) {
        throw new Error(
          `Não existe stock válido de ${group.name} na despensa.`
        );
      }

      const compatibleItems = matchingItems
        .map((item) => ({
          item,
          converted: toBaseQuantity(item.quantity, item.unit),
          factor: toBaseQuantity(1, item.unit),
        }))
        .filter(
          (entry) =>
            entry.converted !== null &&
            entry.factor !== null &&
            entry.converted.unit === group.unit
        )
        .map((entry) => ({
          item: entry.item,
          factor: entry.factor!.quantity,
          available: entry.converted!.quantity,
        }));

      if (compatibleItems.length === 0) {
        throw new Error(
          `As unidades de ${group.name} na despensa são incompatíveis com a receita.`
        );
      }

      const totalAvailable = compatibleItems.reduce(
        (total, entry) => total + entry.available,
        0
      );

      const epsilon = 0.000001;

      if (totalAvailable + epsilon < group.required) {
        throw new Error(
          `Stock insuficiente de ${group.name}. ` +
          `Disponível: ${totalAvailable} ${group.unit}. ` +
          `Necessário: ${group.required} ${group.unit}.`
        );
      }

      // Consumir primeiro os alimentos que expiram mais cedo.
      compatibleItems.sort((a, b) => {
        const dateA = a.item.expirationDate || "9999-12-31";
        const dateB = b.item.expirationDate || "9999-12-31";

        return (
          dateA.localeCompare(dateB) ||
          a.item.id - b.item.id
        );
      });

      let remaining = group.required;

      for (const entry of compatibleItems) {
        if (remaining <= epsilon) break;

        const currentItem = updates.get(entry.item.id) ?? entry.item;

        const currentBase = toBaseQuantity(
          currentItem.quantity,
          currentItem.unit
        );

        if (!currentBase || currentBase.quantity <= 0) {
          continue;
        }

        const consumed = Math.min(
          currentBase.quantity,
          remaining
        );

        const newQuantity = Math.max(
          0,
          currentItem.quantity - consumed / entry.factor
        );

        updates.set(entry.item.id, {
          ...currentItem,
          quantity:
            newQuantity <= epsilon
              ? 0
              : Number(newQuantity.toFixed(6)),
        });

        remaining -= consumed;
      }

      // Notificar apenas quando o stock total chega efetivamente a zero.
      const remainingStock = compatibleItems.reduce(
        (total, entry) => {
          const updated = updates.get(entry.item.id) ?? entry.item;
          const converted = toBaseQuantity(
            updated.quantity,
            updated.unit
          );

          return total + (converted?.quantity ?? 0);
        },
        0
      );

      if (remainingStock <= epsilon) {
        exhaustedIngredients.push(group.name);
      }
    }

    // Só atualiza a base de dados depois de validar todos os ingredientes.
    if (updates.size > 0) {
      await db.pantry.bulkPut(Array.from(updates.values()));
    }

    return exhaustedIngredients;
  });
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

function getToday(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
