import {
  db,
  getActiveProfileId,
  type HouseholdProfile,
  type PantryItem,
  type SavedRecipe,
} from "../db/db";

export interface SmartPantryBackup {
  format: "smartpantry-backup";
  version: 1;
  exportedAt: string;
  data: {
    profiles: HouseholdProfile[];
    pantry: PantryItem[];
    recipes: SavedRecipe[];
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

function isRecipe(value: unknown): value is SavedRecipe {
  return isRecord(value) &&
    typeof value.id === "string" && value.id.length > 0 &&
    typeof value.title === "string" && value.title.trim().length > 0;
}

function parseBackup(text: string): SmartPantryBackup {
  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("O ficheiro não contém JSON válido.");
  }

  if (!isRecord(value) || value.format !== "smartpantry-backup" || value.version !== 1 || !isRecord(value.data)) {
    throw new Error("Este ficheiro não é uma cópia de segurança do SmartPantry válida.");
  }

  const { profiles, pantry, recipes, activeProfileId } = value.data;
  if (!Array.isArray(profiles) || !profiles.every(isProfile) ||
    !Array.isArray(pantry) || !pantry.every(isPantryItem) ||
    !Array.isArray(recipes) || !recipes.every(isRecipe) ||
    (activeProfileId !== null && typeof activeProfileId !== "string")) {
    throw new Error("Os dados da cópia de segurança estão incompletos ou têm um formato inválido.");
  }

  if (activeProfileId !== null && !profiles.some((profile) => profile.id === activeProfileId)) {
    throw new Error("O perfil ativo indicado no ficheiro não existe na lista de perfis.");
  }

  return {
    format: "smartpantry-backup",
    version: 1,
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : "",
    data: { profiles, pantry, recipes, activeProfileId },
  };
}

export async function exportApplicationData(): Promise<SmartPantryBackup> {
  const [profiles, pantry, recipes, activeProfileId] = await Promise.all([
    db.profiles.toArray(),
    db.pantry.toArray(),
    db.recipeBook.toArray(),
    getActiveProfileId(),
  ]);

  return {
    format: "smartpantry-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      profiles,
      pantry,
      recipes,
      activeProfileId: activeProfileId ?? null,
    },
  };
}

export async function importApplicationData(text: string): Promise<void> {
  const backup = parseBackup(text);
  const { profiles, pantry, recipes, activeProfileId } = backup.data;

  await db.transaction("rw", db.profiles, db.settings, db.pantry, db.recipeBook, async () => {
    await Promise.all([
      db.profiles.clear(),
      db.settings.clear(),
      db.pantry.clear(),
      db.recipeBook.clear(),
    ]);

    if (profiles.length > 0) await db.profiles.bulkPut(profiles);
    if (pantry.length > 0) await db.pantry.bulkPut(pantry);
    if (recipes.length > 0) await db.recipeBook.bulkPut(recipes);
    if (activeProfileId) await db.settings.put({ key: "activeProfileId", value: activeProfileId });
  });
}
