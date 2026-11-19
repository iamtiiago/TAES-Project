import { Dexie, type Table, type EntityTable } from "dexie";

export interface HouseholdProfile {
  id: string;
  name: string;
  servings: number;
  diet: "omnivore" | "vegetarian" | "vegan";
  allergies: string[];
  excludedIngredients: string[];
}

export interface PantryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expirationDate: string;
}

export type MealType =
  | "Pequeno-almoço"
  | "Almoço"
  | "Jantar"
  | "Lanche"
  | "Sobremesa";

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: number;
  name: string;
  description: string;
  preparationTime: number;
  mealType: MealType;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
}

export interface SavedRecipe {
  id: string;
  title: string;
  [key: string]: unknown;
}

export const db = new Dexie("SmartPantryDB") as Dexie & {
  profiles: Table<HouseholdProfile, string>;
  settings: Table<{ key: "activeProfileId"; value: string }, string>;
  pantry: EntityTable<PantryItem, "id">;
  recipes: EntityTable<Recipe, "id">;
  recipeBook: Table<SavedRecipe, string>;
};

db.version(2).stores({
  profiles: "id, name",
});

db.version(3).stores({
  profiles: "id, name",
  settings: "key",
});

db.version(4).stores({
  profiles: "id, name",
  settings: "key",
  pantry: "++id",
});

db.version(5).stores({
  profiles: "id, name",
  settings: "key",
  pantry: "++id, name, category, expirationDate",
});

db.version(6).stores({
  profiles: "id, name",
  settings: "key",
  pantry: "++id, name, category, expirationDate",
  recipes: "++id, name, mealType, preparationTime",
  recipeBook: "id, title",
});

// Garante ambas as tabelas em bases já criadas na versão 6 de qualquer branch.
db.version(7).stores({
  profiles: "id, name",
  settings: "key",
  pantry: "++id, name, category, expirationDate",
  recipes: "++id, name, mealType, preparationTime",
  recipeBook: "id, title",
});

export async function getActiveProfileId(): Promise<string | undefined> {
  const setting = await db.settings.get("activeProfileId");

  if (setting && await db.profiles.get(setting.value)) {
    return setting.value;
  }

  if (await db.profiles.get("initial")) {
    return "initial";
  }

  return (await db.profiles.toCollection().first())?.id;
}

export async function getActiveProfile(): Promise<HouseholdProfile | undefined> {
  return db.transaction("r", db.profiles, db.settings, async () => {
    const id = await getActiveProfileId();
    return id === undefined ? undefined : db.profiles.get(id);
  });
}

export async function activateProfile(id: string): Promise<void> {
  await db.transaction("rw", db.profiles, db.settings, async () => {
    if (!await db.profiles.get(id)) {
      throw new Error("Este perfil já não existe.");
    }

    await db.settings.put({ key: "activeProfileId", value: id });
  });
}

export class ActiveProfileError extends Error {
  constructor() {
    super("Não é possível eliminar o perfil ativo.");
  }
}

export async function deleteInactiveProfile(id: string): Promise<void> {
  await db.transaction("rw", db.profiles, db.settings, async () => {
    if (await getActiveProfileId() === id) {
      throw new ActiveProfileError();
    }

    await db.profiles.delete(id);
  });
}