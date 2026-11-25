import { db, type PantryItem, type ShoppingListItem } from "../db/db";
import { normalizeIngredientName, toBaseQuantity, type MissingIngredient } from "../utils/recipeUtils";

interface ShoppingItemDraft {
  name: string;
  quantity: number;
  unit: string;
}

interface TransferOptions {
  category: string;
  expirationDate: string;
}

function groupMissingIngredients(ingredients: MissingIngredient[]): ShoppingItemDraft[] {
  const groupedIngredients = new Map<string, ShoppingItemDraft>();

  for (const ingredient of ingredients) {
    if (ingredient.reason === "incompatible" || ingredient.missing <= 0) continue;

    const key = `${normalizeIngredientName(ingredient.name)}|${ingredient.unit.toLowerCase()}`;
    const existing = groupedIngredients.get(key);

    if (existing) {
      existing.quantity += ingredient.missing;
    } else {
      groupedIngredients.set(key, {
        name: ingredient.name,
        quantity: ingredient.missing,
        unit: ingredient.unit,
      });
    }
  }

  return [...groupedIngredients.values()];
}

function hasSameIngredient(item: ShoppingListItem, draft: ShoppingItemDraft): boolean {
  return !item.checked &&
    normalizeIngredientName(item.name) === normalizeIngredientName(draft.name) &&
    item.unit.toLowerCase() === draft.unit.toLowerCase();
}

export async function addMissingIngredientsToShoppingList(
  ingredients: MissingIngredient[]
): Promise<number> {
  const itemsToAdd = groupMissingIngredients(ingredients);
  if (itemsToAdd.length === 0) return 0;

  await db.transaction("rw", db.shoppingList, async () => {
    const currentItems = await db.shoppingList.toArray();

    for (const itemToAdd of itemsToAdd) {
      const existingItem = currentItems.find((item) => hasSameIngredient(item, itemToAdd));

      if (existingItem) {
        const quantity = Number((existingItem.quantity + itemToAdd.quantity).toFixed(6));
        await db.shoppingList.update(existingItem.id, { quantity });
      } else {
        await db.shoppingList.add({ ...itemToAdd, checked: false });
      }
    }
  });

  return itemsToAdd.length;
}

export async function updateShoppingListItemStatus(id: number, checked: boolean): Promise<void> {
  const updated = await db.shoppingList.update(id, { checked });

  if (!updated) {
    throw new Error("Este item já não existe na lista de compras.");
  }
}

function findCompatiblePantryItem(
  pantryItems: PantryItem[],
  shoppingItem: ShoppingListItem
): PantryItem | undefined {
  const shoppingQuantity = toBaseQuantity(shoppingItem.quantity, shoppingItem.unit);

  return pantryItems.find((pantryItem) => {
    if (normalizeIngredientName(pantryItem.name) !== normalizeIngredientName(shoppingItem.name)) {
      return false;
    }

    const pantryQuantity = toBaseQuantity(pantryItem.quantity, pantryItem.unit);
    if (shoppingQuantity && pantryQuantity) {
      return shoppingQuantity.unit === pantryQuantity.unit;
    }

    return pantryItem.unit.toLowerCase() === shoppingItem.unit.toLowerCase();
  });
}

function addToPantryQuantity(pantryItem: PantryItem, shoppingItem: ShoppingListItem): number {
  const pantryQuantity = toBaseQuantity(pantryItem.quantity, pantryItem.unit);
  const shoppingQuantity = toBaseQuantity(shoppingItem.quantity, shoppingItem.unit);

  if (pantryQuantity && shoppingQuantity) {
    const pantryUnitFactor = toBaseQuantity(1, pantryItem.unit);
    if (pantryUnitFactor) {
      return Number((pantryItem.quantity + shoppingQuantity.quantity / pantryUnitFactor.quantity).toFixed(6));
    }
  }

  return Number((pantryItem.quantity + shoppingItem.quantity).toFixed(6));
}

export async function transferShoppingListItemToPantry(
  id: number,
  options: TransferOptions
): Promise<void> {
  await db.transaction("rw", db.shoppingList, db.pantry, async () => {
    const shoppingItem = await db.shoppingList.get(id);
    if (!shoppingItem) {
      throw new Error("Este item já não existe na lista de compras.");
    }
    if (!shoppingItem.checked) {
      throw new Error("Marca o item como comprado antes de o transferir.");
    }

    const pantryItems = await db.pantry.toArray();
    const existingPantryItem = findCompatiblePantryItem(pantryItems, shoppingItem);

    if (existingPantryItem) {
      await db.pantry.update(existingPantryItem.id, {
        quantity: addToPantryQuantity(existingPantryItem, shoppingItem),
      });
    } else {
      await db.pantry.add({
        name: shoppingItem.name,
        quantity: shoppingItem.quantity,
        unit: shoppingItem.unit,
        category: options.category,
        expirationDate: options.expirationDate,
      });
    }

    await db.shoppingList.delete(id);
  });
}
