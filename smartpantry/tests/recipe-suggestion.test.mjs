import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { createRecipeSuggestionHandler } from "../server/recipeSuggestion.ts";
import { recipeSuggestionPath } from "../src/shared/recipeSuggestion.ts";

const profileAndPantry = {
  ingredients: [
    { name: "Tomate", quantity: 400, unit: "g", expirationDate: "2030-12-31" },
    { name: "Manteiga de amendoim", quantity: 2, unit: "g", expirationDate: "2030-12-31" },
  ],
  servings: 2,
  diet: "vegetarian",
  allergies: ["Amendoim"],
  excludedIngredients: ["Coentros"],
};

const recipe = {
  title: "Tomate assado",
  servings: 2,
  estimatedMinutes: 25,
  ingredients: [{ name: "Tomate", quantity: "400 g" }],
  steps: ["Corta o tomate e assa-o durante 20 minutos."],
};

function geminiResult(recipe) {
  return Response.json({
    candidates: [{
      finishReason: "STOP",
      content: { parts: [
        { thought: true, text: "Escolher ingredientes." },
        { text: JSON.stringify({ recipe }) },
      ] },
    }],
  });
}

async function postSuggestion(t, apiKey, stubGemini, body = profileAndPantry) {
  const handler = createRecipeSuggestionHandler(apiKey, "test-flash", stubGemini);
  const server = createServer(handler).listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  await once(server, "listening");
  return fetch(`http://127.0.0.1:${server.address().port}${recipeSuggestionPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("US12: sends only pantry and preference fields with server credentials", async (t) => {
  const body = {
    ...profileAndPantry,
    profileId: "private-id",
    ingredients: profileAndPantry.ingredients.map((ingredient) => ({ ...ingredient, category: "Frigo" })),
  };
  let geminiRequest;
  const response = await postSuggestion(t, "test-key", async (url, options) => {
    geminiRequest = { url, ...options, body: JSON.parse(options.body) };
    return geminiResult(recipe);
  }, body);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), recipe);
  assert.equal(geminiRequest.url, "https://generativelanguage.googleapis.com/v1beta/models/test-flash:generateContent");
  assert.equal(geminiRequest.headers["x-goog-api-key"], "test-key");
  assert.equal(geminiRequest.body.generationConfig.responseMimeType, "application/json");
  assert.deepEqual(JSON.parse(geminiRequest.body.contents[0].parts[0].text), profileAndPantry);
});

test("US12: rejects Gemini responses without a title, ingredients or steps", async (t) => {
  for (const invalidRecipe of [
    { ...recipe, title: " " },
    { ...recipe, ingredients: [] },
    { ...recipe, steps: [""] },
  ]) {
    const response = await postSuggestion(t, "test-key", async () => geminiResult(invalidRecipe));
    assert.equal(response.status, 502);
    assert.match((await response.json()).message, /indisponível/);
  }
});

test("US12: returns no suggestion when Gemini finds none or uses a restricted ingredient", async (t) => {
  const restrictedRecipe = { ...recipe, ingredients: [{ name: "Manteiga de amendoim", quantity: "1 g" }] };
  for (const result of [null, restrictedRecipe]) {
    const response = await postSuggestion(t, "test-key", async () => geminiResult(result));
    assert.equal(response.status, 200);
    assert.equal(await response.json(), null);
  }
});

test("US12: reports missing configuration and upstream errors without disclosing credentials", async (t) => {
  const unconfigured = await postSuggestion(t, undefined, () => assert.fail("Unexpected upstream request"));
  assert.equal(unconfigured.status, 503);
  assert.match((await unconfigured.json()).message, /configurado/);

  const response = await postSuggestion(t, "test-key", async () => new Response("upstream test-key", { status: 429 }));
  assert.equal(response.status, 502);
  const body = await response.text();
  assert.match(body, /indisponível/);
  assert.doesNotMatch(body, /test-key/);
});

test("US12: identifies a Google project's lack of free-tier access", async (t) => {
  const response = await postSuggestion(t, "test-key", async () => Response.json({
    error: {
      status: "PERMISSION_DENIED",
      message: "The Gemini API free tier is not available for this project.",
    },
  }, { status: 403 }));
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /projeto Google.*escalão gratuito/);

  const blockedKey = await postSuggestion(t, "test-key", async () => Response.json({
    error: { status: "PERMISSION_DENIED", message: "The API key has been blocked." },
  }, { status: 403 }));
  assert.equal(blockedKey.status, 502);
  assert.match((await blockedKey.json()).message, /serviço de sugestões está indisponível/);
});
