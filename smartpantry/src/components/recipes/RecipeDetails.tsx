
import type { Recipe } from "../../db/db";
import { useMissingIngredients } from "../../hooks/useMissingIngredients";
import MissingIngredients from "./MissingIngredients";

interface Props {
  recipe: Recipe;
  onClose: () => void;
  onDelete: (id: number) => void;
}

export default function RecipeDetails({ recipe, onClose, onDelete }: Props) {
  const {
    missingIngredients,
    loading,
  } = useMissingIngredients(recipe);

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

      <MissingIngredients
        ingredients={missingIngredients}
        loading={loading}
      />

      <h3>Ingredientes</h3>

      <ul className="recipe-ingredients">
        {recipe.ingredients.map((ingredient, index) => (
          <li key={`${ingredient.name}-${index}`}>
            {ingredient.name} — {ingredient.quantity} {ingredient.unit}
          </li>
        ))}
      </ul>

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
