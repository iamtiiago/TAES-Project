import assert from "node:assert/strict";
import { test } from "node:test";
import { parseProfileForm } from "../src/utils/profileForm.ts";

function profileForm(fields = {}) {
  const form = new FormData();

  for (const [name, value] of Object.entries({ name: "Casa", servings: "1", diet: "omnivore", ...fields })) {
    if (value !== undefined) form.set(name, value);
  }

  return form;
}

test("US01: aceita as preferências iniciais sem restrições opcionais", () => {
  assert.deepEqual(parseProfileForm(profileForm()), {
    profile: {
      name: "Casa",
      servings: 1,
      diet: "omnivore",
      allergies: [],
      excludedIngredients: [],
    },
  });
});

test("US01: lê as preferências e remove espaços e entradas vazias das listas", () => {
  const form = profileForm({
    name: "  Família  ",
    servings: "3",
    diet: "vegetarian",
    allergies: " leite , , amendoim, ",
    excludedIngredients: " cogumelos,  coentros ",
  });

  assert.deepEqual(parseProfileForm(form), {
    profile: {
      name: "Família",
      servings: 3,
      diet: "vegetarian",
      allergies: ["leite", "amendoim"],
      excludedIngredients: ["cogumelos", "coentros"],
    },
  });
});

test("US01: aceita o regime vegan", () => {
  assert.equal(parseProfileForm(profileForm({ diet: "vegan" })).profile?.diet, "vegan");
});

test("US01: rejeita um nome ausente ou composto apenas por espaços", () => {
  for (const name of [undefined, "   "]) {
    assert.deepEqual(parseProfileForm(profileForm({ name })), {
      error: "Introduz um nome para o perfil.",
    });
  }
});

test("US01: rejeita porções ausentes, vazias, não positivas, fracionárias ou inválidas", () => {
  for (const servings of [undefined, "", "0", "-1", "1.5", "abc", "Infinity"]) {
    assert.deepEqual(parseProfileForm(profileForm({ servings })), {
      error: "O número de porções tem de ser um inteiro igual ou superior a 1.",
    }, `Porções: ${servings}`);
  }
});

test("US01: rejeita um regime ausente ou desconhecido", () => {
  for (const diet of [undefined, "desconhecido"]) {
    assert.deepEqual(parseProfileForm(profileForm({ diet })), {
      error: "Seleciona um regime alimentar válido.",
    });
  }
});
