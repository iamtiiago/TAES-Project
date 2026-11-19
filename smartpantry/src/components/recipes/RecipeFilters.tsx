
import type { RecipeFilters as Filters } from "../../utils/recipeUtils";

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function RecipeFilters({ filters, onChange }: Props) {
  function update(field: keyof Filters, value: string) {
    onChange({
      ...filters,
      [field]: value,
    });
  }

  return (
    <section className="recipe-filters">
      <label>
        Pesquisar receita
        <input
          type="search"
          value={filters.search}
          onChange={(event) => update("search", event.target.value)}
          placeholder="Ex.: arroz, frango..."
        />
      </label>

      <label>
        Tempo máximo de preparação
        <select
          value={filters.maxTime}
          onChange={(event) => update("maxTime", event.target.value)}
        >
          <option value="all">Sem limite</option>
          <option value="15">Até 15 minutos</option>
          <option value="30">Até 30 minutos</option>
          <option value="45">Até 45 minutos</option>
          <option value="60">Até 60 minutos</option>
        </select>
      </label>

      <label>
        Tipo de refeição
        <select
          value={filters.mealType}
          onChange={(event) => update("mealType", event.target.value)}
        >
          <option value="all">Todas as refeições</option>
          <option value="Pequeno-almoço">Pequeno-almoço</option>
          <option value="Almoço">Almoço</option>
          <option value="Jantar">Jantar</option>
          <option value="Lanche">Lanche</option>
          <option value="Sobremesa">Sobremesa</option>
        </select>
      </label>

      <button
        type="button"
        onClick={() =>
          onChange({
            search: "",
            maxTime: "all",
            mealType: "all",
          })
        }
      >
        Limpar filtros
      </button>
    </section>
  );
}
