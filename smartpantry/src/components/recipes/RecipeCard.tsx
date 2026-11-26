
import type { Recipe } from "../../db/db";

interface Props {
  recipe: Recipe;
  onSelect: (recipe: Recipe) => void;
  selected: boolean;
}

export default function RecipeCard({
  recipe,
  onSelect,
  selected,
}: Props) {
  return (
    <article className={`recipe-card ${selected ? "recipe-card-selected" : ""}`}>
      <div className="recipe-card-content">
        <span className="recipe-meal">{recipe.mealType}</span>

        <h3>{recipe.name}</h3>

        <p>{recipe.description}</p>

        <div className="recipe-meta">
          <span>◷ {recipe.preparationTime} min</span>
          <span>♟ {recipe.servings} porções</span>
        </div>

        <p className="recipe-preparation-count">
          🍳 Preparada {recipe.preparationCount ?? 0} vezes
        </p>

        <button type="button" onClick={() => onSelect(recipe)}>
          {selected ? "Receita selecionada" : "Ver receita"}
        </button>
      </div>
    </article>
  );
}
