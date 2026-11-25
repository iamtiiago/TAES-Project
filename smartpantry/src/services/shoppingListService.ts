import { db, type ShoppingListItem } from "../db/db";
import { normalizeIngredientName, type MissingIngredient } from "../utils/recipeUtils";

interface ShoppingItemDraft {
  name: string;
  quantity: number;
  unit: string;
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
