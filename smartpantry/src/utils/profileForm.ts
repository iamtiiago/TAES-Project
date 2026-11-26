import type { HouseholdProfile } from "../db/db.ts";

type ProfileFormResult = { profile: Omit<HouseholdProfile, "id"> } | { error: string };

function parseIngredientList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

export function parseProfileForm(data: FormData): ProfileFormResult {
  const name = String(data.get("name") ?? "").trim();
  const servings = Number(data.get("servings"));
  const diet = data.get("diet");

  if (!name) {
    return { error: "Introduz um nome para o perfil." };
  }

  if (!Number.isInteger(servings) || servings < 1) {
    return { error: "O número de porções tem de ser um inteiro igual ou superior a 1." };
  }

  if (diet !== "omnivore" && diet !== "vegetarian" && diet !== "vegan") {
    return { error: "Seleciona um regime alimentar válido." };
  }

  return {
    profile: {
      name,
      servings,
      diet,
      allergies: parseIngredientList(data.get("allergies")),
      excludedIngredients: parseIngredientList(data.get("excludedIngredients")),
    },
  };
}
