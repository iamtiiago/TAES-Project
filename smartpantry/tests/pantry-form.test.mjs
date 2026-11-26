import assert from "node:assert/strict";
import { test } from "node:test";
import { CUSTOM_CATEGORY, parsePantryForm } from "../src/utils/pantryForm.ts";

const categories = ["Despensa", "Frigorífico", "Congelador"];
const fields = { name: "Arroz", category: "Despensa", quantity: "1.5", unit: "kg", expirationDate: "2099-12-31" };

function submitFood(overrides = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...fields, ...overrides })) {
    if (value !== undefined) form.set(key, value);
  }
  return parsePantryForm(form, categories);
}

test("US05: aceita valores válidos e conserva uma quantidade fracionária", () => {
  assert.deepEqual(submitFood({ name: " Arroz " }), { food: { ...fields, quantity: 1.5 } });
});

test("US05 e US07: rejeita nomes em falta e quantidades inválidas", () => {
  for (const name of ["", "  ", undefined]) {
    assert.deepEqual(submitFood({ name }), { error: "Indica o nome do alimento." });
  }
  for (const quantity of ["", "0", "-1", "NaN", "Infinity", undefined]) {
    assert.deepEqual(submitFood({ quantity }), { error: "A quantidade tem de ser superior a zero." });
  }
});

test("US05 e US07: rejeita categoria, unidade ou validade em falta ou inválidas", () => {
  for (const values of [{ category: "desconhecida" }, { unit: "caixas" }, { expirationDate: "" }]) {
    assert.deepEqual(submitFood(values), { error: "Preenche todos os campos." });
  }
});

test("US07: devolve os dados editados com a categoria e unidade escolhidas", () => {
  assert.deepEqual(submitFood({
    name: "  Ervilhas ", category: "Congelador", quantity: "600", unit: "g", expirationDate: "2099-10-15",
  }), {
    food: { name: "Ervilhas", category: "Congelador", quantity: 600, unit: "g", expirationDate: "2099-10-15" },
  });

  assert.deepEqual(submitFood({ category: CUSTOM_CATEGORY, customCategory: "  Outros " }), {
    food: { ...fields, category: "Outros", quantity: 1.5 },
  });
});
