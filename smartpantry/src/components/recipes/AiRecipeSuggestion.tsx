import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type PantryItem } from "../../db/db";
import { getActiveRecipePreferences } from "../../services/recipePreferences";
import { addRecipe } from "../../services/recipeService";
import {
  requestRecipeSuggestion,
  type GeneratedRecipe,
} from "../../services/aiRecipeService";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

function isAvailable(item: PantryItem): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return item.quantity > 0 && (!item.expirationDate || item.expirationDate >= today);
}

export default function AiRecipeSuggestion({ onClose, onSaved }: Props) {
  const pantryItems = useLiveQuery(() => db.pantry.orderBy("name").toArray());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const availableItems = useMemo(
    () => (pantryItems ?? []).filter(isAvailable),
    [pantryItems]
  );

  function toggleIngredient(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGenerate() {
    const selectedItems = availableItems.filter((item) => selectedIds.has(item.id));

    if (selectedItems.length === 0) {
      setError("Seleciona pelo menos um alimento da despensa.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const profile = await getActiveRecipePreferences();
      const suggestion = await requestRecipeSuggestion({
        ingredients: selectedItems,
        profile,
      });
      setRecipe(suggestion);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível obter uma sugestão da IA."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!recipe || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await addRecipe(recipe);
      setMessage("Receita guardada no livro de receitas.");
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível guardar a receita."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ai-recipe-panel" aria-labelledby="ai-recipe-title">
      <div className="ai-recipe-header">
        <div>
          <h2 id="ai-recipe-title">Sugestão com IA</h2>
          <p>Escolhe os alimentos que queres aproveitar. A sugestão respeita o perfil ativo.</p>
        </div>
        <button type="button" onClick={onClose} disabled={loading || saving}>
          Fechar
        </button>
      </div>

      {pantryItems === undefined && <p>A carregar despensa...</p>}

      {pantryItems !== undefined && availableItems.length === 0 && (
        <p className="recipe-error" role="alert">
          Não existem alimentos válidos na despensa para criar uma sugestão.
        </p>
      )}

      {availableItems.length > 0 && (
        <>
          <fieldset className="ai-recipe-ingredients" disabled={loading || saving}>
            <legend>Alimentos a usar</legend>
            {availableItems.map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleIngredient(item.id)}
                />
                {item.name} — {item.quantity} {item.unit}
              </label>
            ))}
          </fieldset>

          <button type="button" onClick={() => void handleGenerate()} disabled={loading || saving}>
            {loading ? "A gerar sugestão..." : "Gerar receita"}
          </button>
        </>
      )}

      {error && <p className="recipe-error" role="alert">{error}</p>}
      {message && <p className="ai-recipe-success" role="status">{message}</p>}

      {recipe && (
        <article className="ai-recipe-result">
          <div>
            <span className="recipe-meal">{recipe.mealType}</span>
            <h3>{recipe.name}</h3>
            <p>{recipe.description}</p>
          </div>
          <p>{recipe.preparationTime} minutos · {recipe.servings} porções</p>

          <h4>Ingredientes</h4>
          <ul>
            {recipe.ingredients.map((ingredient, index) => (
              <li key={`${ingredient.name}-${index}`}>
                {ingredient.name} — {ingredient.quantity} {ingredient.unit}
              </li>
            ))}
          </ul>

          <h4>Preparação</h4>
          <ol>
            {recipe.instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ol>

          <p className="ai-recipe-note">
            Confirma sempre os ingredientes antes de cozinhar, especialmente em caso de alergias.
          </p>
          <button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? "A guardar..." : "Guardar no livro de receitas"}
          </button>
        </article>
      )}
    </section>
  );
}
