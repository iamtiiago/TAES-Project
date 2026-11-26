import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getSavedRecipeSuggestions,
  requestRecipeSuggestion,
  saveRecipeSuggestion,
  type SavedRecipeSuggestion,
} from "../../services/recipeSuggestionService";
import type { RecipeSuggestion } from "../../shared/recipeSuggestion";

function SuggestionDetails({ recipe }: { recipe: RecipeSuggestion }) {
  return (
    <>
      <p className="recipe-meta">
        <span>{recipe.estimatedMinutes} min</span>
        <span>{recipe.servings} {recipe.servings === 1 ? "porção" : "porções"}</span>
      </p>
      <strong>Ingredientes</strong>
      <ul className="recipe-ingredients">
        {recipe.ingredients.map(({ name, quantity }, index) => (
          <li key={index}>{name} — {quantity}</li>
        ))}
      </ul>
      <strong>Preparação</strong>
      <ol className="recipe-instructions">
        {recipe.steps.map((step, index) => <li key={index}>{step}</li>)}
      </ol>
      <p className="recipe-assistant-note">
        Confirma os ingredientes e os alergénios antes de cozinhar.
      </p>
    </>
  );
}

export default function RecipeAssistant() {
  const savedRecipes = useLiveQuery(getSavedRecipeSuggestions, [], []);
  const request = useRef<AbortController | null>(null);
  const [suggestion, setSuggestion] = useState<SavedRecipeSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => request.current?.abort(), []);

  async function generateSuggestion() {
    if (request.current || saving) return;

    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setSuggestion(null);
    setMessage("");
    setError("");

    try {
      const recipe = await requestRecipeSuggestion(controller.signal);
      if (controller.signal.aborted) return;

      if (recipe) {
        setSuggestion({ ...recipe, id: crypto.randomUUID() });
      } else {
        setMessage("Nenhuma sugestão encontrada para os alimentos e as restrições do perfil ativo.");
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Não foi possível gerar uma sugestão.");
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  async function saveSuggestion() {
    if (!suggestion || saving) return;
    setSaving(true);
    setError("");

    try {
      await saveRecipeSuggestion(suggestion);
      setSuggestion(null);
      setMessage("Sugestão guardada no livro de receitas.");
    } catch {
      setError("Não foi possível guardar a sugestão. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="recipe-assistant" aria-labelledby="recipe-assistant-title">
      <h2 id="recipe-assistant-title">Sous-Chef</h2>
      <p>Usa a Gemini para sugerir uma receita com os alimentos da despensa e as preferências do perfil ativo.</p>
      <button className="recipe-assistant-action" type="button" disabled={loading || saving} onClick={generateSuggestion}>
        Sugerir receita com sobras
      </button>

      <div className="recipe-assistant-status" role="status">
        {loading ? "A consultar a Gemini…" : message}
      </div>
      {error && <p className="recipe-error" role="alert">{error}</p>}

      {suggestion && (
        <article className="recipe-suggestion">
          <h3>{suggestion.title}</h3>
          <SuggestionDetails recipe={suggestion} />
          <button className="recipe-assistant-action" type="button" disabled={saving} onClick={saveSuggestion}>
            {saving ? "A guardar…" : "Guardar sugestão"}
          </button>
        </article>
      )}

      {savedRecipes.length > 0 && (
        <section className="recipe-assistant-saved" aria-labelledby="saved-suggestions-title">
          <h3 id="saved-suggestions-title">Sugestões guardadas</h3>
          {savedRecipes.map((recipe) => (
            <details className="recipe-suggestion" key={recipe.id}>
              <summary>{recipe.title}</summary>
              <SuggestionDetails recipe={recipe} />
            </details>
          ))}
        </section>
      )}
    </section>
  );
}
