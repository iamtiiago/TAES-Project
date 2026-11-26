import assert from "node:assert/strict";
import { test } from "node:test";
import { isRecipeSuggestion, isRecipeSuggestionRequest } from "../src/shared/recipeSuggestion.ts";

const ingredient = { name: "Tomate", quantity: 400, unit: "g", expirationDate: "2099-12-31" };
const request = {
  servings: 2, diet: "vegan", allergies: ["soja"], excludedIngredients: ["coentros"],
  ingredients: [ingredient],
};
const recipe = {
  title: "Tomate assado", servings: 2, estimatedMinutes: 25,
  ingredients: [{ name: "Tomate", quantity: "400 g" }], steps: ["Assa o tomate."],
};

test("US12: aceita as estruturas válidas de pedido e receita", () => {
  assert.equal(isRecipeSuggestionRequest(request), true);
  assert.equal(isRecipeSuggestionRequest({ ...request, ingredients: [{ ...ingredient, expirationDate: "" }] }), true);
  assert.equal(isRecipeSuggestion(recipe), true);
});

test("US12: rejeita preferências inválidas no pedido", () => {
  for (const invalid of [
    { servings: "2" },
    { servings: 0 },
    { diet: "desconhecido" },
    { allergies: [" "] },
    { excludedIngredients: [7] },
  ]) {
    assert.equal(isRecipeSuggestionRequest({ ...request, ...invalid }), false, JSON.stringify(invalid));
  }
});

test("US12: rejeita alimentos inválidos no pedido", () => {
  for (const invalid of [
    { name: " " },
    { quantity: 0 },
    { quantity: -1 },
    { quantity: Infinity },
    { quantity: "400" },
    { unit: "" },
    { expirationDate: "31/12/2099" },
  ]) {
    assert.equal(isRecipeSuggestionRequest({
      ...request, ingredients: [{ ...ingredient, ...invalid }],
    }), false, JSON.stringify(invalid));
  }
});

test("US12: rejeita receitas incompletas ou com campos inválidos", () => {
  for (const invalid of [
    { title: "" },
    { servings: 1.5 },
    { estimatedMinutes: -1 },
    { estimatedMinutes: "25" },
    { ingredients: [] },
    { ingredients: [{ name: "Tomate", quantity: 400 }] },
    { steps: [] },
    { steps: ["Assa o tomate.", " "] },
  ]) {
    assert.equal(isRecipeSuggestion({ ...recipe, ...invalid }), false, JSON.stringify(invalid));
  }
  assert.equal(isRecipeSuggestion(null), false);
});
