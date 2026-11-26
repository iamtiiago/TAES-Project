import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

interface IngredientInput {
  name: string;
  quantity: number;
  unit: string;
}

interface RecipeSuggestionInput {
  ingredients: IngredientInput[];
  profile: {
    servings: number;
    diet: "omnivore" | "vegetarian" | "vegan";
    allergies: string[];
    excludedIngredients: string[];
  };
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

async function readRequestBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 50_000) throw new Error("O pedido é demasiado grande.");
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isIngredient(value: unknown): value is IngredientInput {
  if (!value || typeof value !== "object") return false;
  const ingredient = value as Record<string, unknown>;
  return (
    typeof ingredient.name === "string" &&
    ingredient.name.trim().length > 0 &&
    typeof ingredient.quantity === "number" &&
    Number.isFinite(ingredient.quantity) &&
    ingredient.quantity > 0 &&
    typeof ingredient.unit === "string" &&
    ingredient.unit.trim().length > 0
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecipeSuggestionInput(value: unknown): value is RecipeSuggestionInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  const profile = input.profile;

  if (!profile || typeof profile !== "object") return false;
  const preferences = profile as Record<string, unknown>;

  return (
    Array.isArray(input.ingredients) &&
    input.ingredients.length > 0 &&
    input.ingredients.every(isIngredient) &&
    Number.isInteger(preferences.servings) &&
    Number(preferences.servings) > 0 &&
    ["omnivore", "vegetarian", "vegan"].includes(String(preferences.diet)) &&
    isStringArray(preferences.allergies) &&
    isStringArray(preferences.excludedIngredients)
  );
}

function buildPrompt(input: RecipeSuggestionInput): string {
  return [
    "Cria uma receita em português de Portugal.",
    "Respeita obrigatoriamente a dieta, alergias e ingredientes excluídos.",
    "Usa os ingredientes selecionados sempre que forem adequados. Podes acrescentar ingredientes básicos apenas se forem necessários e indica-os na lista.",
    "Não apresentes texto fora do JSON pedido.",
    "Dados da aplicação:",
    JSON.stringify(input),
  ].join("\n");
}

function getResponseText(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const candidates = (body as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return undefined;

  const content = candidates[0] as { content?: { parts?: Array<{ text?: unknown }> } };
  const parts = content.content?.parts;
  if (!Array.isArray(parts)) return undefined;

  const text = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  return text || undefined;
}

export function recipeSuggestionApi(
  apiKey: string | undefined,
  model: string | undefined
): Plugin {
  return {
    name: "smartpantry-recipe-suggestion-api",
    configureServer(server) {
      server.middlewares.use("/api/recipe-suggestion", async (request, response) => {
        if (request.method !== "POST") {
          sendJson(response, 405, { error: "Método não permitido." });
          return;
        }

        if (!apiKey || !model) {
          sendJson(response, 503, {
            error: "A IA não está configurada neste ambiente.",
          });
          return;
        }

        try {
          const body = await readRequestBody(request);
          if (!isRecipeSuggestionInput(body)) {
            sendJson(response, 400, { error: "O pedido de sugestão é inválido." });
            return;
          }

          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: buildPrompt(body) }] }],
                generationConfig: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: "OBJECT",
                    properties: {
                      name: { type: "STRING" },
                      description: { type: "STRING" },
                      preparationTime: { type: "INTEGER" },
                      mealType: {
                        type: "STRING",
                        enum: ["Pequeno-almoço", "Almoço", "Jantar", "Lanche", "Sobremesa"],
                      },
                      servings: { type: "INTEGER" },
                      ingredients: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            name: { type: "STRING" },
                            quantity: { type: "NUMBER" },
                            unit: { type: "STRING" },
                          },
                          required: ["name", "quantity", "unit"],
                        },
                      },
                      instructions: {
                        type: "ARRAY",
                        items: { type: "STRING" },
                      },
                    },
                    required: [
                      "name",
                      "description",
                      "preparationTime",
                      "mealType",
                      "servings",
                      "ingredients",
                      "instructions",
                    ],
                  },
                },
              }),
            }
          );

          const geminiBody: unknown = await geminiResponse.json().catch(() => null);
          if (!geminiResponse.ok) {
            sendJson(response, 502, {
              error: "A IA não conseguiu gerar uma sugestão. Tenta novamente.",
            });
            return;
          }

          const text = getResponseText(geminiBody);
          if (!text) {
            sendJson(response, 502, {
              error: "A IA devolveu uma resposta vazia ou inválida.",
            });
            return;
          }

          try {
            sendJson(response, 200, JSON.parse(text));
          } catch {
            sendJson(response, 502, {
              error: "A IA não devolveu uma receita estruturada válida.",
            });
          }
        } catch {
          sendJson(response, 500, {
            error: "Não foi possível processar o pedido de sugestão.",
          });
        }
      });
    },
  };
}
