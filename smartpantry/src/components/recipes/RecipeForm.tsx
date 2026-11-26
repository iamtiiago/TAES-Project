
import { useState, type FormEvent } from "react";
import type { MealType, RecipeIngredient } from "../../db/db";
import { addRecipe } from "../../services/recipeService";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function RecipeForm({ onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const form = event.currentTarget;
    const data = new FormData(form);

    const name = String(data.get("name") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const preparationTime = Number(data.get("preparationTime"));
    const servings = Number(data.get("servings"));
    const mealType = String(data.get("mealType")) as MealType;

    const ingredientsText = String(data.get("ingredients") ?? "");
    const instructionsText = String(data.get("instructions") ?? "");

    const ingredients: RecipeIngredient[] = ingredientsText
      .split("\n")
      .map((line) => {
        const [ingredientName, quantity, unit] = line.split(",").map((v) => v.trim());

        return {
          name: ingredientName ?? "",
          quantity: Number(quantity),
          unit: unit ?? "",
        };
      })
      .filter((ingredient) => ingredient.name !== "");

    const instructions = instructionsText
      .split("\n")
      .map((instruction) => instruction.trim())
      .filter(Boolean);

    if (!name || !description) {
      setError("Preenche o nome e a descrição.");
      return;
    }

    if (!Number.isFinite(preparationTime) || preparationTime <= 0) {
      setError("Indica um tempo de preparação válido.");
      return;
    }

    if (!Number.isInteger(servings) || servings < 1) {
      setError("Indica um número de porções válido.");
      return;
    }

    if (ingredients.length === 0) {
      setError("Adiciona pelo menos um ingrediente.");
      return;
    }

    if (instructions.length === 0) {
      setError("Adiciona pelo menos uma instrução.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await addRecipe({
        name,
        description,
        preparationTime,
        mealType,
        servings,
        ingredients,
        instructions,
      });

      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível guardar a receita."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="recipe-form-panel">
      <h2>Adicionar receita</h2>

      <form onSubmit={handleSubmit}>
        <fieldset disabled={saving}>
          <label>
            Nome da receita
            <input name="name" required placeholder="Ex.: Arroz de legumes" />
          </label>

          <label>
            Descrição
            <textarea name="description" required rows={2} />
          </label>

          <label>
            Tempo de preparação (minutos)
            <input
              name="preparationTime"
              type="number"
              min="1"
              required
            />
          </label>

          <label>
            Número de porções
            <input
              name="servings"
              type="number"
              min="1"
              step="1"
              defaultValue="2"
              required
            />
          </label>

          <label>
            Tipo de refeição
            <select name="mealType" defaultValue="Almoço">
              <option>Pequeno-almoço</option>
              <option>Almoço</option>
              <option>Jantar</option>
              <option>Lanche</option>
              <option>Sobremesa</option>
            </select>
          </label>

          <label>
            Ingredientes
            <textarea
              name="ingredients"
              rows={6}
              required
              placeholder={"Arroz, 200, g\nFrango, 300, g\nCebola, 1, un"}
            />
            <small>Formato: Nome, quantidade, unidade. Um ingrediente por linha.</small>
          </label>

          <label>
            Instruções
            <textarea
              name="instructions"
              rows={6}
              required
              placeholder={"Lava os alimentos.\nPrepara os ingredientes.\nCozinha e serve."}
            />
            <small>Escreve uma instrução por linha.</small>
          </label>

          {error && <p className="recipe-error" role="alert">{error}</p>}

          <div className="recipe-form-actions">
            <button type="submit">
              {saving ? "A guardar..." : "Guardar receita"}
            </button>

            <button type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
