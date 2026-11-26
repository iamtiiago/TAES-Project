import {
  db,
  getActiveProfileId,
  type HouseholdProfile,
  type PantryItem,
  type Recipe,
  type SavedRecipe,
  type ShoppingListItem,
} from "../db/db";

export interface SmartPantryBackup {
  format: "smartpantry-backup";
  version: 2;
  exportedAt: string;
  data: {
    profiles: HouseholdProfile[];
    pantry: PantryItem[];
    recipes: Recipe[];
    recipeBook: SavedRecipe[];
    shoppingList: ShoppingListItem[];
    activeProfileId: string | null;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isProfile(value: unknown): value is HouseholdProfile {
  return isRecord(value) &&
    typeof value.id === "string" && value.id.length > 0 &&
    typeof value.name === "string" && value.name.trim().length > 0 &&
    Number.isInteger(value.servings) && Number(value.servings) > 0 &&
    (value.diet === "omnivore" || value.diet === "vegetarian" || value.diet === "vegan") &&
    isStringList(value.allergies) &&
    isStringList(value.excludedIngredients);
}

function isPantryItem(value: unknown): value is PantryItem {
  return isRecord(value) &&
    typeof value.id === "number" && Number.isInteger(value.id) && value.id > 0 &&
    typeof value.name === "string" && value.name.trim().length > 0 &&
    typeof value.category === "string" && value.category.trim().length > 0 &&
    typeof value.quantity === "number" && Number.isFinite(value.quantity) && value.quantity > 0 &&
    typeof value.unit === "string" && value.unit.trim().length > 0 &&
    typeof value.expirationDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.expirationDate);
}

function isRecipeBookItem(value: unknown): value is SavedRecipe {
  return isRecord(value) &&
    typeof value.id === "string" && value.id.length > 0 &&
    typeof value.title === "string" && value.title.trim().length > 0;
}

function isRecipeIngredient(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.name === "string" && value.name.trim().length > 0 &&
    typeof value.quantity === "number" && Number.isFinite(value.quantity) && value.quantity > 0 &&
    typeof value.unit === "string" && value.unit.trim().length > 0;
}

function isRecipe(value: unknown): value is Recipe {
  return isRecord(value) &&
    typeof value.id === "number" && Number.isInteger(value.id) && value.id > 0 &&
    typeof value.name === "string" && value.name.trim().length > 0 &&
    typeof value.description === "string" &&
    typeof value.preparationTime === "number" && Number.isFinite(value.preparationTime) && value.preparationTime > 0 &&
    (value.mealType === "Pequeno-almoço" || value.mealType === "Almoço" || value.mealType === "Jantar" || value.mealType === "Lanche" || value.mealType === "Sobremesa") &&
    typeof value.servings === "number" && Number.isInteger(value.servings) && value.servings > 0 &&
    Array.isArray(value.ingredients) && value.ingredients.every(isRecipeIngredient) &&
    Array.isArray(value.instructions) && value.instructions.every((instruction) => typeof instruction === "string");
}

function isShoppingListItem(value: unknown): value is ShoppingListItem {
  return isRecord(value) &&
    typeof value.id === "number" && Number.isInteger(value.id) && value.id > 0 &&
    typeof value.name === "string" && value.name.trim().length > 0 &&
    typeof value.quantity === "number" && Number.isFinite(value.quantity) && value.quantity > 0 &&
    typeof value.unit === "string" && value.unit.trim().length > 0 &&
    typeof value.checked === "boolean";
}

function parseBackup(text: string): SmartPantryBackup {
  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("O ficheiro não contém JSON válido.");
  }

  if (!isRecord(value) || value.format !== "smartpantry-backup" || !isRecord(value.data)) {
    throw new Error("Este ficheiro não é uma cópia de segurança do SmartPantry válida.");
  }

  const { profiles, pantry, shoppingList, activeProfileId } = value.data;
  if (!Array.isArray(profiles) || !profiles.every(isProfile) ||
    !Array.isArray(pantry) || !pantry.every(isPantryItem) ||
    (shoppingList !== undefined && (!Array.isArray(shoppingList) || !shoppingList.every(isShoppingListItem))) ||
    (activeProfileId !== null && typeof activeProfileId !== "string")) {
    throw new Error("Os dados da cópia de segurança estão incompletos ou têm um formato inválido.");
  }

  if (activeProfileId !== null && !profiles.some((profile) => profile.id === activeProfileId)) {
    throw new Error("O perfil ativo indicado no ficheiro não existe na lista de perfis.");
  }

  if (value.version === 1) {
    const { recipes } = value.data;
    if (!Array.isArray(recipes) || !recipes.every(isRecipeBookItem)) {
      throw new Error("Os dados da cópia de segurança estão incompletos ou têm um formato inválido.");
    }

    return {
      format: "smartpantry-backup",
      version: 2,
      exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : "",
      data: {
        profiles,
        pantry,
        recipes: [],
        recipeBook: recipes,
        shoppingList: shoppingList ?? [],
        activeProfileId,
      },
    };
  }

  const { recipes, recipeBook } = value.data;
  if (value.version !== 2 || !Array.isArray(recipes) || !recipes.every(isRecipe) ||
    !Array.isArray(recipeBook) || !recipeBook.every(isRecipeBookItem)) {
    throw new Error("Os dados da cópia de segurança estão incompletos ou têm um formato inválido.");
  }

  return {
    format: "smartpantry-backup",
    version: 2,
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : "",
    data: { profiles, pantry, recipes, recipeBook, shoppingList: shoppingList ?? [], activeProfileId },
  };
}

export async function exportApplicationData(): Promise<SmartPantryBackup> {
  const [profiles, pantry, recipes, recipeBook, shoppingList, activeProfileId] = await Promise.all([
    db.profiles.toArray(),
    db.pantry.toArray(),
    db.recipes.toArray(),
    db.recipeBook.toArray(),
    db.shoppingList.toArray(),
    getActiveProfileId(),
  ]);

  return {
    format: "smartpantry-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      profiles,
      pantry,
      recipes,
      recipeBook,
      shoppingList,
      activeProfileId: activeProfileId ?? null,
    },
  };
}

export async function importApplicationData(text: string): Promise<void> {
  const backup = parseBackup(text);
  const { profiles, pantry, recipes, recipeBook, shoppingList, activeProfileId } = backup.data;

  await db.transaction("rw", db.profiles, db.settings, db.pantry, db.recipes, db.recipeBook, db.shoppingList, async () => {
    await Promise.all([
      db.profiles.clear(),
      db.settings.clear(),
      db.pantry.clear(),
      db.recipes.clear(),
      db.recipeBook.clear(),
      db.shoppingList.clear(),
    ]);

    if (profiles.length > 0) await db.profiles.bulkPut(profiles);
    if (pantry.length > 0) await db.pantry.bulkPut(pantry);
    if (recipes.length > 0) await db.recipes.bulkPut(recipes);
    if (recipeBook.length > 0) await db.recipeBook.bulkPut(recipeBook);
    if (shoppingList.length > 0) await db.shoppingList.bulkPut(shoppingList);
    if (activeProfileId) await db.settings.put({ key: "activeProfileId", value: activeProfileId });
  });
}
