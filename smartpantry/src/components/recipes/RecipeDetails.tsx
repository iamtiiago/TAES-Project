
import { useEffect, useMemo, useState } from "react";
import type { Recipe, RecipeIngredient } from "../../db/db";
import { useMissingIngredients } from "../../hooks/useMissingIngredients";
import { consumeRecipeIngredients } from "../../services/recipeService";
import MissingIngredients from "./MissingIngredients";

interface Props {
  recipe: Recipe;
  onClose: () => void;
  onDelete: (id: number) => void;
}


export default function RecipeDetails({
  recipe,
  onClose,
  onDelete,
}: Props) {
  const [adjustedIngredients, setAdjustedIngredients] = useState<
    RecipeIngredient[]
  >(() =>
    recipe.ingredients.map((ingredient) => ({ ...ingredient }))
  );

  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Reiniciar os dados quando o utilizador seleciona outra receita.
  useEffect(() => {
    setAdjustedIngredients(
      recipe.ingredients.map((ingredient) => ({ ...ingredient }))
    );

    setCompleted(false);
    setSaving(false);
    setError("");
    setSuccessMessage("");
  }, [recipe.id]);

  // Verificar a disponibilidade com as quantidades editadas pelo utilizador.
  const adjustedRecipe = useMemo(
    () => ({
      ...recipe,
      ingredients: adjustedIngredients.filter(
        (ingredient) => ingredient.quantity > 0
      ),
    }),
    [recipe, adjustedIngredients]
  );

  const {
    missingIngredients,
    loading,
  } = useMissingIngredients(adjustedRecipe);

  function handleQuantityChange(index: number, value: string) {
    const quantity = value === "" ? 0 : Number(value);

    setAdjustedIngredients((current) =>
      current.map((ingredient, currentIndex) =>
        currentIndex === index
          ? { ...ingredient, quantity }
          : ingredient
      )
    );

    setError("");
    setSuccessMessage("");
    setCompleted(false);
  }

  const hasValidQuantities = adjustedIngredients.every(
    (ingredient) =>
      Number.isFinite(ingredient.quantity) &&
      ingredient.quantity >= 0
  );

  const hasIngredients = adjustedIngredients.some(
    (ingredient) => ingredient.quantity > 0
  );

  const canConfirm =
    !loading &&
    !saving &&
    !completed &&
    hasValidQuantities &&
    hasIngredients &&
    missingIngredients.length === 0;

  async function handleConfirmCooking() {
    if (!canConfirm) return;

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const exhausted = await consumeRecipeIngredients(
        adjustedIngredients
      );

      setCompleted(true);

      if (exhausted.length > 0) {
        setSuccessMessage(
          `Confeção confirmada! Os seguintes ingredientes ficaram esgotados: ${exhausted.join(", ")}.`
        );
      } else {
        setSuccessMessage(
          "Confeção confirmada! As quantidades foram descontadas da despensa."
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível descontar os ingredientes da despensa."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="recipe-details">
      <div className="recipe-details-header">
        <div>
          <span className="recipe-meal">{recipe.mealType}</span>

          <h2>{recipe.name}</h2>

          <p>{recipe.description}</p>
        </div>

        <button type="button" onClick={onClose}>
          Fechar
        </button>
      </div>

      <div className="recipe-meta">
        <span>◷ {recipe.preparationTime} minutos</span>
        <span>♟ {recipe.servings} porções</span>
      </div>

      <h3>Ingredientes a descontar</h3>

      <p className="recipe-cooking-description">
        Confirma ou ajusta as quantidades que utilizaste na confeção.
        Estas quantidades serão retiradas da tua despensa.
      </p>

      <div className="recipe-cooking-ingredients">
        {adjustedIngredients.map((ingredient, index) => (
          <div
            className="recipe-cooking-ingredient"
            key={`${ingredient.name}-${index}`}
          >
            <label htmlFor={`ingredient-${index}`}>
              <strong>{ingredient.name}</strong>

              <span>Quantidade a descontar ({ingredient.unit})</span>
            </label>

            <input
              id={`ingredient-${index}`}
              type="number"
              min="0"
              step="any"
              value={ingredient.quantity}
              disabled={saving || completed}
              onChange={(event) =>
                handleQuantityChange(index, event.target.value)
              }
            />
          </div>
        ))}
      </div>

      {!hasIngredients && (
        <p className="recipe-error" role="alert">
          Indica pelo menos um ingrediente com quantidade superior a zero.
        </p>
      )}

      {!hasValidQuantities && (
        <p className="recipe-error" role="alert">
          Existem quantidades inválidas.
        </p>
      )}

      <MissingIngredients
        ingredients={missingIngredients}
        loading={loading}
      />

      {error && (
        <p className="recipe-error" role="alert">
          {error}
        </p>
      )}

      {successMessage && (
        <div className="recipe-cooking-success" role="status">
          <strong>Confeção registada!</strong>
          <p>{successMessage}</p>
        </div>
      )}

      <div className="recipe-cooking-actions">
        <button
          type="button"
          onClick={handleConfirmCooking}
          disabled={!canConfirm}
        >
          {saving
            ? "A descontar stock..."
            : completed
              ? "Confeção confirmada"
              : "Confirmar confeção"}
        </button>
      </div>

      <h3>Preparação</h3>

      <ol className="recipe-instructions">
        {recipe.instructions.map((instruction, index) => (
          <li key={index}>{instruction}</li>
        ))}
      </ol>

      <button
        type="button"
        className="recipe-delete-button"
        onClick={() => {
          if (
            window.confirm(
              "Tens a certeza de que queres eliminar esta receita?"
            )
          ) {
            onDelete(recipe.id);
          }
        }}
      >
        Eliminar receita
      </button>
    </section>
  );
}
