import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db/db";

const dietLabels = {
  omnivore: "Omnívoro",
  vegetarian: "Vegetariano",
  vegan: "Vegan",
};

function parseList(value: FormDataEntryValue | null): string[] {
  const items = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(items)];
}

export default function App() {
  const result = useLiveQuery(async () => ({
    profile: await db.profiles.get("initial"),
  }));

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const data = new FormData(event.currentTarget);

    const name = String(data.get("name") ?? "").trim();
    const servings = Number(data.get("servings"));
    const diet = String(data.get("diet") ?? "");

    const allergies = parseList(data.get("allergies"));
    const excludedIngredients = parseList(data.get("excludedIngredients"));

    setError("");

    if (!name) {
      setError("Indica um nome para o perfil.");
      return;
    }

    if (!Number.isInteger(servings) || servings < 1) {
      setError(
        "O número de porções deve ser um inteiro igual ou superior a 1.",
      );
      return;
    }

    if (diet !== "omnivore" && diet !== "vegetarian" && diet !== "vegan") {
      setError("Seleciona um regime alimentar válido.");
      return;
    }

    setSaving(true);

    try {
      await db.profiles.add({
        id: "initial",
        name,
        servings,
        diet,
        allergies,
        excludedIngredients,
      });
    } catch {
      setError("Não foi possível guardar o perfil. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (result === undefined) {
    return (
      <main>
        <p>A carregar o perfil…</p>
      </main>
    );
  }

  const profile = result.profile;

  if (profile) {
    return (
      <main>
        <h1>SmartPantry</h1>

        <section id="profile-summary">
          <h2>Perfil configurado</h2>

          <p>
            Nome: <strong id="saved-profile-name">{profile.name}</strong>
          </p>

          <p>Porções: {profile.servings}</p>
          <p>Regime alimentar: {dietLabels[profile.diet]}</p>
          <p>Alergias: {profile.allergies.join(", ") || "Nenhuma"}</p>
          <p>
            Ingredientes excluídos:{" "}
            {profile.excludedIngredients.join(", ") || "Nenhum"}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <h1>Bem-vindo ao SmartPantry</h1>
      <h2>Configura o teu perfil inicial</h2>

      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={saving}>
          <legend>Preferências do agregado</legend>

          <label htmlFor="profile-name">
            Nome do perfil
            <input
              id="profile-name"
              name="name"
              type="text"
              defaultValue="Casa"
              required
            />
          </label>

          <label htmlFor="profile-servings">
            Número habitual de porções
            <input
              id="profile-servings"
              name="servings"
              type="number"
              min="1"
              step="1"
              defaultValue="1"
              required
            />
          </label>

          <label htmlFor="profile-diet">
            Regime alimentar
            <select id="profile-diet" name="diet" defaultValue="omnivore">
              <option value="omnivore">Omnívoro</option>
              <option value="vegetarian">Vegetariano</option>
              <option value="vegan">Vegan</option>
            </select>
          </label>

          <label htmlFor="profile-allergies">
            Alergias — opcional, separadas por vírgulas
            <input
              id="profile-allergies"
              name="allergies"
              type="text"
              placeholder="Ex.: leite, amendoim"
            />
          </label>

          <label htmlFor="profile-exclusions">
            Ingredientes excluídos — opcional, separados por vírgulas
            <input
              id="profile-exclusions"
              name="excludedIngredients"
              type="text"
              placeholder="Ex.: cogumelos, coentros"
            />
          </label>

          <button id="save-profile" type="submit">
            {saving ? "A guardar…" : "Guardar perfil"}
          </button>
        </fieldset>
      </form>

      {error && (
        <p id="profile-error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
