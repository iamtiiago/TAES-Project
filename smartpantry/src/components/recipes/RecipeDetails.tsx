
import { useEffect, useMemo, useState } from "react";
import type { Recipe, RecipeIngredient } from "../../db/db";
import { useMissingIngredients } from "../../hooks/useMissingIngredients";
import {
  consumeRecipeIngredients,
  incrementRecipePreparation,
} from "../../services/recipeService";
import { addMissingIngredientsToShoppingList } from "../../services/shoppingListService";
import MissingIngredients from "./MissingIngredients";

interface Props {
  recipe: Recipe;
  onClose: () => void;
  onDelete: (id: number) => void;
  onStartCooking: (recipe: Recipe) => void;
}

export default function RecipeDetails({
  recipe,
  onClose,
  onDelete,
  onStartCooking,
}: Props) {
  const [adjustedIngredients, setAdjustedIngredients] = useState<
    RecipeIngredient[]
  >(() => recipe.ingredients.map((ingredient) => ({ ...ingredient })));

  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [addingToShoppingList, setAddingToShoppingList] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [shoppingListMessage, setShoppingListMessage] = useState("");
  const [preparationCount, setPreparationCount] = useState(
    recipe.preparationCount ?? 0
  );

  useEffect(() => {
    setAdjustedIngredients(
      recipe.ingredients.map((ingredient) => ({ ...ingredient }))
    );

    setCompleted(false);
    setAddingToShoppingList(false);
    setSaving(false);
    setError("");
    setSuccessMessage("");
    setShoppingListMessage("");
    setPreparationCount(recipe.preparationCount ?? 0);
  }, [recipe.id, recipe.ingredients, recipe.preparationCount]);

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
      await consumeRecipeIngredients(adjustedIngredients);
      await incrementRecipePreparation(recipe.id);

      setPreparationCount((current) => current + 1);
      setCompleted(true);

      setSuccessMessage(
        "Confeção confirmada! As quantidades foram descontadas da despensa e a preparação foi registada."
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível registar a preparação."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAddToShoppingList() {
    if (loading || addingToShoppingList) return;

    setAddingToShoppingList(true);
    setError("");
    setShoppingListMessage("");

    try {
      const addedItems = await addMissingIngredientsToShoppingList(
        missingIngredients
      );

      setShoppingListMessage(
        addedItems === 1
          ? "Ingrediente adicionado à lista de compras."
          : `${addedItems} ingredientes adicionados à lista de compras.`
      );
    } catch {
      setError("Não foi possível atualizar a lista de compras.");
    } finally {
      setAddingToShoppingList(false);
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

      <div className="recipe-preparation-counter">
        <h3>Histórico de preparações</h3>
        <p>
          🍳 Esta receita já foi preparada{" "}
          <strong>{preparationCount}</strong>{" "}
          {preparationCount === 1 ? "vez" : "vezes"}.
        </p>
      </div>

      <h3>Ingredientes da receita</h3>

      <ul className="recipe-ingredients">
        {recipe.ingredients.map((ingredient, index) => (
          <li key={`${ingredient.name}-${index}`}>
            {ingredient.name} — {ingredient.quantity} {ingredient.unit}
          </li>
        ))}
      </ul>

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
        addingToShoppingList={addingToShoppingList}
        onAddToShoppingList={() => void handleAddToShoppingList()}
      />

      {shoppingListMessage && <p role="status">{shoppingListMessage}</p>}

      {error && (
        <p className="recipe-error" role="alert">
          {error}
        </p>
      )}

      {successMessage && (
        <div className="recipe-cooking-success" role="status">
          <strong>Confeção registada!</strong>
          <p>{successMessage}</p>
          <p>Total de preparações: {preparationCount}</p>
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

      <div className="recipe-cooking-actions">
        <button type="button" onClick={() => onStartCooking(recipe)}>
          Iniciar modo de preparação
        </button>
      </div>

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
