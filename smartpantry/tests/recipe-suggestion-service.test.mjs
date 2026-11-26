import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { activateProfile, db } from "../src/db/db.ts";
import { exportApplicationData, importApplicationData } from "../src/services/dataTransfer.ts";
import {
  getSavedRecipeSuggestions, requestRecipeSuggestion, saveRecipeSuggestion,
} from "../src/services/recipeSuggestionService.ts";

const pantryItem = {
  name: "Tomate", category: "Frigorífico", quantity: 400, unit: "g", expirationDate: "2099-12-31",
};
const firstProfile = {
  id: "first", name: "Casa", servings: 2, diet: "vegetarian",
  allergies: [" amendoim ", ""], excludedIngredients: ["coentros"],
};
const secondProfile = {
  id: "second", name: "Férias", servings: 4, diet: "vegan",
  allergies: ["soja"], excludedIngredients: ["alho"],
};
const recipe = {
  title: "Tomate assado", servings: 2, estimatedMinutes: 25,
  ingredients: [{ name: "Tomate", quantity: "400 g" }], steps: ["Assa o tomate."],
};

beforeEach(async () => {
  await db.open();
  await db.profiles.bulkAdd([firstProfile, secondProfile]);
  await activateProfile(firstProfile.id);
});

afterEach(async () => { await db.delete(); });

test("US12: usa apenas stock disponível e lê o perfil ativo em cada pedido", async (t) => {
  await db.pantry.bulkAdd([
    pantryItem,
    { ...pantryItem, name: "Cenoura expirada", expirationDate: "2000-12-31" },
    { ...pantryItem, name: "Pimento esgotado", quantity: 0 },
  ]);
  const requests = [];
  const signal = new AbortController().signal;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/recipe-suggestion");
    assert.equal(options.method, "POST");
    assert.equal(options.signal, signal);
    const body = JSON.parse(options.body);
    requests.push(body);
    return Response.json({ ...recipe, servings: body.servings });
  });

  assert.deepEqual(await requestRecipeSuggestion(signal), recipe);
  await activateProfile(secondProfile.id);
  assert.equal((await requestRecipeSuggestion(signal)).servings, 4);

  const { name, quantity, unit, expirationDate } = pantryItem;
  const ingredients = [{ name, quantity, unit, expirationDate }];
  assert.deepEqual(requests, [
    { ingredients, servings: 2, diet: "vegetarian", allergies: ["amendoim"], excludedIngredients: ["coentros"] },
    { ingredients, servings: 4, diet: "vegan", allergies: ["soja"], excludedIngredients: ["alho"] },
  ]);
  assert.equal(await db.recipeBook.count(), 0);
});

test("US12: evita o pedido quando não há stock disponível", async (t) => {
  await db.pantry.add({ ...pantryItem, expirationDate: "2000-12-31" });
  const fetchSpy = t.mock.method(globalThis, "fetch", async () => Response.json(null));

  await assert.rejects(requestRecipeSuggestion(new AbortController().signal), /alimentos com stock/);
  assert.equal(fetchSpy.mock.callCount(), 0);
});

test("US12: distingue ausência de sugestão, erro da rota e resposta inválida", async (t) => {
  await db.pantry.add(pantryItem);
  const responses = [
    Response.json(null),
    Response.json({ message: "O serviço está indisponível." }, { status: 502 }),
    Response.json({ ...recipe, steps: [] }),
  ];
  t.mock.method(globalThis, "fetch", async () => responses.shift());
  const signal = new AbortController().signal;

  assert.equal(await requestRecipeSuggestion(signal), null);
  await assert.rejects(requestRecipeSuggestion(signal), /O serviço está indisponível/);
  await assert.rejects(requestRecipeSuggestion(signal), /receita inválida/);
  assert.equal(await db.pantry.count(), 1);
  assert.equal(await db.recipeBook.count(), 0);
});

test("US12: guarda sugestões válidas e recupera-as a partir de uma exportação", async () => {
  const saved = { id: "tomato-recipe", ...recipe };

  assert.throws(() => saveRecipeSuggestion({ ...saved, ingredients: [] }), /sugestão não é válida/);
  assert.equal(await db.recipeBook.count(), 0);
  assert.equal(await saveRecipeSuggestion(saved), saved.id);
  assert.equal(await saveRecipeSuggestion(saved), saved.id);
  db.close();
  await db.open();

  assert.deepEqual(await getSavedRecipeSuggestions(), [saved]);
  const backup = await exportApplicationData();
  assert.deepEqual(backup.data.recipeBook, [saved]);

  await db.recipeBook.clear();
  await importApplicationData(JSON.stringify(backup));
  assert.deepEqual(await getSavedRecipeSuggestions(), [saved]);
});

test("US12: recupera sugestões de uma cópia de segurança da versão anterior", async () => {
  const saved = { id: "old-tomato-recipe", ...recipe };
  const backup = {
    format: "smartpantry-backup",
    version: 1,
    data: { profiles: [secondProfile], pantry: [], recipes: [saved], activeProfileId: secondProfile.id },
  };

  await importApplicationData(JSON.stringify(backup));
  assert.deepEqual(await getSavedRecipeSuggestions(), [saved]);
});
