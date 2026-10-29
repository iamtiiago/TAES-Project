
import { useState, type FormEvent } from "react";
import type { HouseholdProfile } from "./db/db";

interface ProfileFormProps {
  onSave: (
    profile: Omit<HouseholdProfile, "id">
  ) => Promise<void>;
  saving: boolean;
  onCancel?: () => void;
}

function parseList(value: FormDataEntryValue | null): string[] {
  const items = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  // Remove ingredientes repetidos.
  return [...new Set(items)];
}

export default function ProfileForm({
  onSave,
  saving,
  onCancel,
}: ProfileFormProps) {
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    const data = new FormData(event.currentTarget);

    const name = String(data.get("name") ?? "").trim();
    const servings = Number(data.get("servings"));
    const diet = String(data.get("diet") ?? "");

    const allergies = parseList(data.get("allergies"));
    const excludedIngredients = parseList(
      data.get("excludedIngredients")
    );

    setError("");

    // Validar o nome.
    if (!name) {
      setError("Indica um nome para o perfil.");
      return;
    }

    // Validar o número de porções.
    if (!Number.isInteger(servings) || servings < 1) {
      setError(
        "O número de porções deve ser um inteiro igual ou superior a 1."
      );
      return;
    }

    // Validar o regime alimentar.
    if (
      diet !== "omnivore" &&
      diet !== "vegetarian" &&
      diet !== "vegan"
    ) {
      setError("Seleciona um regime alimentar válido.");
      return;
    }

    // Preparar os dados do perfil.
    const profile: Omit<HouseholdProfile, "id"> = {
      name,
      servings,
      diet,
      allergies,
      excludedIngredients,
    };

    try {
      // Pedir ao App para guardar o perfil na base de dados.
      await onSave(profile);
    } catch {
      setError(
        "Não foi possível guardar o perfil. Tenta novamente."
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <fieldset disabled={saving}>
        <legend>Preferências do perfil</legend>

        <label htmlFor="profile-name">
          Nome do perfil
          <input
            id="profile-name"
            name="name"
            type="text"
            placeholder="Ex.: Casa, Tomás, Família"
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
          <select
            id="profile-diet"
            name="diet"
            defaultValue="omnivore"
          >
            <option value="omnivore">Omnívoro</option>
            <option value="vegetarian">Vegetariano</option>
            <option value="vegan">Vegan</option>
          </select>
        </label>

        <label htmlFor="profile-allergies">
          Alergias — separadas por vírgulas
          <input
            id="profile-allergies"
            name="allergies"
            type="text"
            placeholder="Ex.: leite, amendoim"
          />
        </label>

        <label htmlFor="profile-exclusions">
          Ingredientes excluídos — separados por vírgulas
          <input
            id="profile-exclusions"
            name="excludedIngredients"
            type="text"
            placeholder="Ex.: cogumelos, coentros"
          />
        </label>

        <button id="save-profile" type="submit">
          {saving ? "A guardar..." : "Guardar perfil"}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </button>
        )}
      </fieldset>

      {error && (
        <p id="profile-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
