
import type { MissingIngredient } from "../../utils/recipeUtils";

interface Props {
  ingredients: MissingIngredient[];
  loading: boolean;
}

function formatQuantity(quantity: number): string {
  return Number(quantity.toFixed(2)).toLocaleString("pt-PT");
}

export default function MissingIngredients({
  ingredients,
  loading,
}: Props) {
  if (loading) {
    return <p>A verificar os ingredientes da despensa...</p>;
  }

  if (ingredients.length === 0) {
    return (
      <div className="ingredients-success" role="status">
        <strong>Todos os ingredientes estão disponíveis!</strong>
        <p>Tens tudo o que precisas para preparar esta receita.</p>
      </div>
    );
  }

  return (
    <div className="ingredients-warning" role="alert">
      <h3>Ingredientes em falta ou insuficientes</h3>

      <p>
        Não tens todos os ingredientes necessários para esta receita.
      </p>

      <ul>
        {ingredients.map((ingredient, index) => (
          <li key={`${ingredient.name}-${index}`}>
            <strong>{ingredient.name}</strong>

            {ingredient.reason === "missing" && (
              <span>
                Em falta: {formatQuantity(ingredient.required)} {ingredient.unit}
              </span>
            )}

            {ingredient.reason === "insufficient" && (
              <span>
                Tens {formatQuantity(ingredient.available)} {ingredient.unit},
                mas precisas de {formatQuantity(ingredient.required)} {ingredient.unit}.
                Faltam {formatQuantity(ingredient.missing)} {ingredient.unit}.
              </span>
            )}

            {ingredient.reason === "incompatible" && (
              <span>
                Não foi possível comparar as unidades disponíveis com a unidade
                necessária ({ingredient.unit}). Confirma a unidade na despensa.
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
