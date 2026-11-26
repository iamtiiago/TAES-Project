import assert from "node:assert/strict";
import { createServer } from "vite";

const stubModel = "gemini-katalon-test";
const stubKey = "katalon-test-key";
const geminiOrigin = "https://generativelanguage.googleapis.com";
const useByDate = "2099-12-31";
const realFetch = globalThis.fetch;

function geminiResponse(recipe) {
  return Response.json({
    candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ recipe }) }] } }],
  });
}

// O servidor de teste mantém a rota da aplicação e substitui apenas a chamada à Gemini.
globalThis.fetch = async (resource, options) => {
  const url = resource instanceof Request ? resource.url : String(resource);
  if (!url.startsWith(geminiOrigin + "/")) return realFetch(resource, options);

  assert.equal(url, `${geminiOrigin}/v1beta/models/${stubModel}:generateContent`);
  assert.equal(new Headers(options.headers).get("x-goog-api-key"), stubKey);
  const request = JSON.parse(JSON.parse(options.body).contents[0].parts[0].text);
  const { name } = request.ingredients[0];
  assert.deepEqual(request, {
    ingredients: [{ name, quantity: 400, unit: "g", expirationDate: useByDate }],
    servings: 2, diet: "vegetarian", allergies: ["amendoim"], excludedIngredients: ["coentros"],
  });

  const recipe = {
    title: "Tomate assado", servings: 2, estimatedMinutes: 25,
    ingredients: [{ name, quantity: "400 g" }], steps: ["Assa o tomate durante 20 minutos."],
  };

  switch (name) {
    case "Tomate":
    case "Manteiga de amendoim":
      return geminiResponse(recipe);
    case "Cebola":
      return geminiResponse(null);
    case "Curgete":
      return geminiResponse({ ...recipe, steps: [] });
    case "Cenoura":
      return new Response(null, { status: 503 });
    case "Pimento":
      return Response.json({
        error: { status: "PERMISSION_DENIED", message: "The Gemini API free tier is not available for this project." },
      }, { status: 403 });
    default:
      throw new Error(`Não existe uma resposta de teste para ${name}.`);
  }
};

process.env.GEMINI_API_KEY = stubKey;
process.env.GEMINI_MODEL = stubModel;

const server = await createServer({ server: { host: "localhost", port: 5174, strictPort: true } });
await server.listen();
server.printUrls();
