
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Recipe, type RecipeCollection } from "./db/db";
import { initializeRecipes, deleteRecipe, removeDuplicateRecipes } from "./services/recipeService";
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
  onOpenShoppingList: () => void;
}

export default function Recipes({ onBack, onOpenShoppingList }: Props) {
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
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState("all");

const recipes = useLiveQuery(
  () => db.recipes.orderBy("name").toArray()
);

  const collections = useLiveQuery(
    () => db.collections.orderBy("name").toArray()
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

  const selectedCollection = (collections ?? []).find(
    (collection) => collection.id === selectedCollectionId
  );

  const collectionRecipes = useMemo(() => {
    if (!selectedCollection) return recipes ?? [];
    return (recipes ?? []).filter((recipe) =>
      selectedCollection.recipeIds.includes(recipe.id)
    );
  }, [recipes, selectedCollection]);

  const filteredRecipes = useMemo(
    () => filterRecipes(collectionRecipes, filters),
    [collectionRecipes, filters]
  );

  async function handleCreateCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCollectionName.trim();

    if (!name) {
      setError("Introduz um nome para a coleção.");
      return;
    }

    if ((collections ?? []).some((collection) =>
      collection.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    )) {
      setError("Já existe uma coleção com esse nome.");
      return;
    }

    try {
      const collection: RecipeCollection = {
        id: crypto.randomUUID(),
        name,
        recipeIds: [],
      };
      await db.collections.add(collection);
      setNewCollectionName("");
      setSelectedCollectionId(collection.id);
      setError("");
    } catch {
      setError("Não foi possível criar a coleção.");
    }
  }

  async function handleAddToCollection(collectionId: string, recipeId: number) {
    const collection = await db.collections.get(collectionId);

    if (!collection) {
      throw new Error("A coleção selecionada já não existe.");
    }

    if (collection.recipeIds.includes(recipeId)) {
      throw new Error("Esta receita já pertence a essa coleção.");
    }

    await db.collections.update(collectionId, {
      recipeIds: [...collection.recipeIds, recipeId],
    });
  }

  async function handleDeleteCollection(collection: RecipeCollection) {
    if (!window.confirm(`Eliminar a coleção "${collection.name}"? As receitas guardadas não serão eliminadas.`)) {
      return;
    }

    try {
      await db.collections.delete(collection.id);
      if (selectedCollectionId === collection.id) {
        setSelectedCollectionId("all");
      }
      setError("");
    } catch {
      setError("Não foi possível eliminar a coleção.");
    }
  }

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

        <div className="recipes-header-actions">
          <button type="button" onClick={onOpenShoppingList}>
            Lista de compras
          </button>
          <button type="button" onClick={onBack}>
            Voltar
          </button>
        </div>
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

      <section className="recipe-collections-panel">
        <div className="recipe-collections-heading">
          <div>
            <h2>As minhas coleções</h2>
            <p>Cria pastas para organizares as tuas receitas guardadas.</p>
          </div>
          <span>{(collections ?? []).length} coleções</span>
        </div>

        <form className="recipe-collection-create" onSubmit={(event) => void handleCreateCollection(event)}>
          <label htmlFor="new-collection-name">Nome da nova coleção</label>
          <div>
            <input
              id="new-collection-name"
              type="text"
              value={newCollectionName}
              onChange={(event) => setNewCollectionName(event.target.value)}
              placeholder="Ex.: Pequenos-almoços"
              maxLength={60}
            />
            <button type="submit">+ Criar coleção</button>
          </div>
        </form>

        <div className="recipe-collection-list">
          <button
            type="button"
            className={selectedCollectionId === "all" ? "recipe-collection-chip active" : "recipe-collection-chip"}
            onClick={() => setSelectedCollectionId("all")}
          >
            Todas as receitas ({(recipes ?? []).length})
          </button>
          {(collections ?? []).map((collection) => (
            <div className="recipe-collection-item" key={collection.id}>
              <button
                type="button"
                className={selectedCollectionId === collection.id ? "recipe-collection-chip active" : "recipe-collection-chip"}
                onClick={() => {
                  setSelectedCollectionId((current) =>
                    current === collection.id ? "all" : collection.id
                  );
                  setSelectedRecipe(null);
                }}
              >
                📁 {collection.name} ({collection.recipeIds.length})
              </button>
              <button
                type="button"
                className="recipe-collection-delete"
                aria-label={`Eliminar coleção ${collection.name}`}
                title="Eliminar coleção"
                onClick={() => void handleDeleteCollection(collection)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

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
          <h2>{selectedCollection ? `Receitas: ${selectedCollection.name}` : "Receitas disponíveis"}</h2>
          <span>{filteredRecipes.length} receitas</span>
        </div>

        {filteredRecipes.length === 0 ? (
          <div className="recipes-empty">
            <h3>Nenhuma receita encontrada</h3>
            <p>{selectedCollection ? "Esta coleção ainda não tem receitas. Abre uma receita e adiciona-a a esta coleção." : "Experimenta alterar os filtros ou adicionar uma receita."}</p>
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
          collections={collections ?? []}
          onAddToCollection={(collectionId) =>
            handleAddToCollection(collectionId, selectedRecipe.id)
          }
        />
      )}
    </main>
  );
}
