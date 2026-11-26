import { useEffect, useMemo, useState } from "react";
import type { Recipe, RecipeCollection, RecipeIngredient } from "../../db/db";
import { useMissingIngredients } from "../../hooks/useMissingIngredients";
import { consumeRecipeIngredients } from "../../services/recipeService";
import MissingIngredients from "./MissingIngredients";

interface Props {
  recipe: Recipe;
  onClose: () => void;
  onDelete: (id: number) => void;
  onStartCooking: (recipe: Recipe) => void;
  collections: RecipeCollection[];
  onAddToCollection: (collectionId: string) => Promise<void>;
}


export default function RecipeDetails({
  recipe,
  onClose,
  onDelete,
  onStartCooking,
  collections,
  onAddToCollection,
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
  const [targetCollectionId, setTargetCollectionId] = useState("");
  const [collectionMessage, setCollectionMessage] = useState("");
  const [collectionError, setCollectionError] = useState("");
  const [addingToCollection, setAddingToCollection] = useState(false);

  // Reiniciar os dados quando o utilizador seleciona outra receita.
  useEffect(() => {
    setAdjustedIngredients(
      recipe.ingredients.map((ingredient) => ({ ...ingredient }))
    );

    setCompleted(false);
    setSaving(false);
    setError("");
    setSuccessMessage("");
    setTargetCollectionId("");
    setCollectionMessage("");
    setCollectionError("");
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

  async function handleAddToCollection() {
    if (!targetCollectionId || addingToCollection) return;

    setAddingToCollection(true);
    setCollectionMessage("");
    setCollectionError("");

    try {
      await onAddToCollection(targetCollectionId);
      const collection = collections.find((item) => item.id === targetCollectionId);
      setCollectionMessage(`Receita adicionada à coleção "${collection?.name ?? "selecionada"}".`);
    } catch (cause) {
      setCollectionError(
        cause instanceof Error ? cause.message : "Não foi possível associar a receita à coleção."
      );
    } finally {
      setAddingToCollection(false);
    }
  }

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

      <section className="recipe-collection-association" aria-label="Organizar receita">
        <h3>Guardar numa coleção</h3>
        {collections.length === 0 ? (
          <p>Ainda não existem coleções. Cria uma coleção para organizares esta receita.</p>
        ) : (
          <div className="recipe-collection-association-controls">
            <label htmlFor="recipe-target-collection">Selecionar coleção</label>
            <select
              id="recipe-target-collection"
              value={targetCollectionId}
              onChange={(event) => {
                setTargetCollectionId(event.target.value);
                setCollectionMessage("");
                setCollectionError("");
              }}
            >
              <option value="">Escolhe uma coleção</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleAddToCollection()}
              disabled={!targetCollectionId || addingToCollection}
            >
              {addingToCollection ? "A adicionar..." : "Adicionar à coleção"}
            </button>
          </div>
        )}
        {collectionMessage && <p className="recipe-collection-success" role="status">{collectionMessage}</p>}
        {collectionError && <p className="recipe-error" role="alert">{collectionError}</p>}
      </section>

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

      <div className="recipe-cooking-actions">
        <button type="button" onClick={() => onStartCooking(recipe)}>
          Iniciar modo de preparação
        </button>
      </div>

      <button
        type="button"
        className="recipe-delete-button"
        onClick={() => {
          if (window.confirm("Tens a certeza de que queres eliminar esta receita?")) {
            onDelete(recipe.id);
          }
        }}
      >
        Eliminar receita
      </button>
    </section>
  );
}
