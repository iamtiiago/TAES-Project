
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Recipe } from "./db/db";
import { initializeRecipes, deleteRecipe,removeDuplicateRecipes } from "./services/recipeService";
import { filterRecipes, type RecipeFilters as Filters } from "./utils/recipeUtils";

import RecipeFilters from "./components/recipes/RecipeFilters";
import RecipeCard from "./components/recipes/RecipeCard";
import CookingMode from "./components/recipes/CookingMode";
import RecipeAssistant from "./components/recipes/RecipeAssistant";
import RecipeDetails from "./components/recipes/RecipeDetails";
import RecipeForm from "./components/recipes/RecipeForm";

import "./Recipes.css";

interface Props {
  onBack: () => void;
}

export default function Recipes({ onBack }: Props) {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    maxTime: "all",
    mealType: "all",
  });

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");

  const recipes = useLiveQuery(
    () => db.recipes.orderBy("name").toArray()
  );

  

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        await initializeRecipes();
        await removeDuplicateRecipes();
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar as receitas."
          );
        }
      } finally {
        if (active) setInitializing(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  const filteredRecipes = useMemo(
    () => filterRecipes(recipes ?? [], filters),
    [recipes, filters]
  );

  async function handleDelete(id: number) {
    try {
      await deleteRecipe(id);
      setSelectedRecipe(null);
    } catch {
      setError("Não foi possível eliminar a receita.");
    }
  }

  function handleSaved() {
    setShowForm(false);
    setSelectedRecipe(null);
    setError("");
  }

  if (initializing || recipes === undefined) {
    return (
      <main className="recipes-page">
        <p>A carregar receitas...</p>
      </main>
    );
  }

  if (cookingRecipe) {
    return (
      <CookingMode
        key={cookingRecipe.id}
        recipe={cookingRecipe}
        onExit={() => setCookingRecipe(null)}
      />
    );
  }

  return (
    <main className="recipes-page">
      <header className="recipes-header">
        <div>
          <h1>Livro de receitas</h1>
          <p>Descobre receitas e verifica os ingredientes disponíveis na tua despensa.</p>
        </div>

        <button type="button" onClick={onBack}>
          Voltar
        </button>
      </header>

      <div className="recipes-actions">
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setSelectedRecipe(null);
          }}
        >
          {showForm ? "Fechar formulário" : "+ Adicionar receita"}
        </button>
      </div>

      {error && (
        <p className="recipe-error" role="alert">
          {error}
        </p>
      )}

      {showForm && (
        <RecipeForm
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}

      <RecipeAssistant />

      <RecipeFilters filters={filters} onChange={setFilters} />

      <section className="recipes-list-section">
        <div className="recipes-list-heading">
          <h2>Receitas disponíveis</h2>
          <span>{filteredRecipes.length} receitas</span>
        </div>

        {filteredRecipes.length === 0 ? (
          <div className="recipes-empty">
            <h3>Nenhuma receita encontrada</h3>
            <p>Experimenta alterar os filtros ou adicionar uma receita.</p>
          </div>
        ) : (
          <div className="recipes-grid">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                selected={selectedRecipe?.id === recipe.id}
                onSelect={(selected) => {
                  setSelectedRecipe(selected);
                  setShowForm(false);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {selectedRecipe && (
        <RecipeDetails
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onDelete={(id) => void handleDelete(id)}
          onStartCooking={(recipe) => setCookingRecipe(recipe)}
        />
      )}
    </main>
  );
}
